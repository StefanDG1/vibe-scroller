"""Public-download broker boundaries; no external network or credentials."""
import asyncio
import importlib.util
import socket
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

spec = importlib.util.spec_from_file_location("public_proxy", Path(__file__).parents[1] / "packages/media/public_proxy.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PublicProxyTests(unittest.IsolatedAsyncioTestCase):
    async def tunnel(self, *, idle=.04, cap=.5, delays=(.02, .02, .02, .02)):
        class Writer:
            def __init__(self):
                self.data = bytearray()
                self.closed = False
            def write(self, data):
                self.data.extend(data)
            async def drain(self):
                pass
            def close(self):
                self.closed = True
        client, remote = asyncio.StreamReader(), asyncio.StreamReader()
        client.feed_data(b"CONNECT example.com:443 HTTP/1.1\r\n\r\n")
        output, upstream = Writer(), Writer()
        async def response():
            for delay in delays:
                await asyncio.sleep(delay)
                remote.feed_data(b"response")
            remote.feed_eof()
        producer = asyncio.create_task(response())
        addresses = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 443))]
        try:
            with patch.object(asyncio.get_running_loop(), "getaddrinfo", new=AsyncMock(return_value=addresses)), patch.object(asyncio, "open_connection", new=AsyncMock(return_value=(remote, upstream))):
                await module.Broker(["example.com"], idle_seconds=idle, connection_seconds=cap).handle(client, output)
            return output
        finally:
            producer.cancel()
            await asyncio.gather(producer, return_exceptions=True)

    async def test_server_stream_keeps_connection_alive_when_client_direction_is_silent(self):
        output = await self.tunnel()
        self.assertEqual(output.data.count(b"response"), 4)
        self.assertTrue(output.closed)

    async def test_subscription_wait_supports_delayed_first_response_but_is_bounded(self):
        output = await self.tunnel(idle=.15, delays=(.08,))
        self.assertIn(b"response", output.data)
        idle = await self.tunnel(idle=.01, delays=(.08,))
        self.assertNotIn(b"response", idle.data)
        capped = await self.tunnel(idle=.15, cap=.01, delays=(.08,))
        self.assertNotIn(b"response", capped.data)

    def test_host_and_address_boundaries(self):
        self.assertTrue(module.allowed_host("static.cdninstagram.com", ["*.cdninstagram.com"]))
        for host in ["cdninstagram.com", "cdninstagram.com.attacker.com", "169.254.169.254", "localhost", "a/cdninstagram.com", "static.cdninstagram.com:80"]:
            self.assertFalse(module.allowed_host(host, ["*.cdninstagram.com"]))
        for address in ["127.0.0.1", "10.0.0.1", "169.254.169.254", "100.64.0.1", "192.168.1.1", "0.0.0.0", "::1", "fc00::1", "fe80::1", "::ffff:8.8.8.8"]:
            self.assertFalse(module.public_address(address))
        self.assertTrue(module.public_address("8.8.8.8"))
        self.assertTrue(module.public_address("2606:4700:4700::1111"))

    async def request(self, header, addresses=None):
        broker = module.Broker(["example.com"])
        server = await asyncio.start_server(broker.handle, "127.0.0.1", 0, limit=4096)
        async with server:
            reader, writer = await asyncio.open_connection("127.0.0.1", server.sockets[0].getsockname()[1])
            with patch.object(asyncio.get_running_loop(), "getaddrinfo", new=AsyncMock(return_value=addresses or [])) as dns:
                writer.write(header)
                await writer.drain()
                result = await asyncio.wait_for(reader.read(4096), 2)
            writer.close()
            await writer.wait_closed()
            return result, dns.await_count

    async def test_private_and_mixed_dns_answers_cannot_reach_upstream(self):
        public = (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 443))
        for raw in ["10.0.0.1", "169.254.169.254", "::1", "::ffff:8.8.8.8"]:
            private = (socket.AF_INET6 if ":" in raw else socket.AF_INET, socket.SOCK_STREAM, 6, "", (raw, 443))
            for answers in [[private], [public, private]]:
                result, count = await self.request(b"CONNECT example.com:443 HTTP/1.1\r\n\r\n", answers)
                self.assertIn(b"403 Forbidden", result)
                self.assertEqual(count, 1)

    async def test_unapproved_hosts_ports_and_methods_are_denied_before_dns(self):
        for first in ["CONNECT localhost:443 HTTP/1.1", "CONNECT example.com:80 HTTP/1.1", "CONNECT 169.254.169.254:443 HTTP/1.1", "GET https://example.com/ HTTP/1.1"]:
            result, count = await self.request((first+"\r\n\r\n").encode())
            self.assertIn(b"403 Forbidden", result)
            self.assertEqual(count, 0)

if __name__ == "__main__":
    unittest.main()
