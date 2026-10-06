"""Trusted, bounded HTTPS CONNECT broker. No customer or provider credentials."""
import asyncio
import ipaddress
import json
import os
import pathlib
import re
import socket
import sys


def allowed_host(host, patterns):
    if not isinstance(host, str) or len(host) > 253 or not re.fullmatch(r'[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?', host):
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return any(host == pattern if not pattern.startswith('*.') else
               host.endswith(pattern[1:]) and host != pattern[2:] for pattern in patterns)


def public_address(raw):
    try:
        address = ipaddress.ip_address(raw)
        return address.is_global and not (address.version == 6 and address.ipv4_mapped)
    except ValueError:
        return False


class Broker:
    def __init__(self, patterns, *, connection_seconds=90, idle_seconds=15, max_requests=64, max_bytes=300_000_000):
        self.patterns = patterns
        self.connection_seconds = connection_seconds
        self.idle_seconds = idle_seconds
        self.active = 0
        self.requests = 0
        self.bytes = 0
        assert 0 < max_requests <= 2048 and 0 < max_bytes <= 2_000_000_000
        self.max_requests = max_requests
        self.max_bytes = max_bytes

    async def relay(self, reader, writer, activity):
        while True:
            data = await reader.read(65536)
            if not data:
                break
            activity[0] = asyncio.get_running_loop().time()
            self.bytes += len(data)
            if self.bytes > self.max_bytes:
                raise ValueError('transfer bound')
            writer.write(data)
            await asyncio.wait_for(writer.drain(), 5)

    async def lifetime(self, activity):
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self.connection_seconds
        while True:
            remaining = min(deadline - loop.time(), activity[0] + self.idle_seconds - loop.time())
            if remaining <= 0:
                return
            await asyncio.sleep(remaining)

    async def handle(self, reader, writer):
        if self.active >= 4 or self.requests >= self.max_requests:
            writer.close()
            return
        self.active += 1
        self.requests += 1
        upstream = None
        try:
            header = await asyncio.wait_for(reader.readuntil(b'\r\n\r\n'), 5)
            if len(header) > 4096:
                raise ValueError('header bound')
            first = header.split(b'\r\n', 1)[0].decode('ascii')
            match = re.fullmatch(r'CONNECT ([a-zA-Z0-9.-]+):443 HTTP/1\.[01]', first)
            if not match or not allowed_host(match[1].lower(), self.patterns):
                raise ValueError('destination denied')
            host = match[1].lower()
            resolved = await asyncio.wait_for(asyncio.get_running_loop().getaddrinfo(host, 443, type=socket.SOCK_STREAM), 8)
            if not resolved or len(resolved) > 16 or not all(public_address(item[4][0]) for item in resolved):
                raise ValueError('nonpublic resolution denied')
            # Pin the validated IP for the connection. Never resolve again after
            # validation, and reject the entire response if any address is private.
            family, _, _, _, address = resolved[0]
            remote, upstream = await asyncio.wait_for(asyncio.open_connection(address[0], 443, family=family), 8)
            writer.write(b'HTTP/1.1 200 Connection established\r\n\r\n')
            await writer.drain()
            # HTTP uploads and model streams can be silent in one direction.
            # Inactivity is shared by both directions; the absolute cap remains.
            activity = [asyncio.get_running_loop().time()]
            pumps = [asyncio.create_task(self.relay(reader, upstream, activity)),
                     asyncio.create_task(self.relay(remote, writer, activity)),
                     asyncio.create_task(self.lifetime(activity))]
            try:
                await asyncio.wait(pumps, return_when=asyncio.FIRST_COMPLETED)
            finally:
                for task in pumps:
                    task.cancel()
                await asyncio.gather(*pumps, return_exceptions=True)
        except Exception:
            try:
                writer.write(b'HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
                await writer.drain()
            except Exception:
                pass
        finally:
            self.active -= 1
            if upstream:
                upstream.close()
            writer.close()


async def main():
    assert os.getuid() == 0
    path = pathlib.Path('/root/vibe-public-policy.json')
    assert path.stat().st_size <= 2048
    policy = json.loads(path.read_text())
    assert set(policy) == {'domains'} and 0 < len(policy['domains']) <= 16
    assert sys.argv[1:] in ([], ['--subscription'], ['--subscription-library'])
    # Selected only by the trusted launcher. Media acquisition keeps its 90s/15s
    # bounds; the official-client session supports its bounded 180s model turn.
    if sys.argv[1:] == ['--subscription-library']:
        assert set(policy['domains']) == {'auth.openai.com', 'chatgpt.com', 'api.openai.com'}
        broker = Broker(policy['domains'], connection_seconds=300, idle_seconds=180, max_requests=2048, max_bytes=2_000_000_000)
    else:
        broker = Broker(policy['domains'], connection_seconds=300, idle_seconds=180) if sys.argv[1:] else Broker(policy['domains'])
    endpoint = '/run/vibe-public.sock'
    server = await asyncio.start_unix_server(broker.handle, path=endpoint, limit=4096, backlog=8)
    os.chown(endpoint, 0, 1001)
    os.chmod(endpoint, 0o660)
    async with server:
        await server.serve_forever()


if __name__ == '__main__':
    asyncio.run(main())
