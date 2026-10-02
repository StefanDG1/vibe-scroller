"""Trusted, bounded HTTPS CONNECT broker. No customer or provider credentials."""
import asyncio
import ipaddress
import json
import os
import pathlib
import re
import socket


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
    def __init__(self, patterns):
        self.patterns = patterns
        self.active = 0
        self.requests = 0
        self.bytes = 0

    async def relay(self, reader, writer):
        while True:
            data = await asyncio.wait_for(reader.read(65536), 15)
            if not data:
                break
            self.bytes += len(data)
            if self.bytes > 300_000_000:
                raise ValueError('transfer bound')
            writer.write(data)
            await asyncio.wait_for(writer.drain(), 5)

    async def handle(self, reader, writer):
        if self.active >= 4 or self.requests >= 64:
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
            pumps = [asyncio.create_task(self.relay(reader, upstream)), asyncio.create_task(self.relay(remote, writer))]
            try:
                await asyncio.wait(pumps, timeout=90, return_when=asyncio.FIRST_COMPLETED)
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
    broker = Broker(policy['domains'])
    endpoint = '/run/vibe-public.sock'
    server = await asyncio.start_unix_server(broker.handle, path=endpoint, limit=4096, backlog=8)
    os.chown(endpoint, 0, 1001)
    os.chmod(endpoint, 0o660)
    async with server:
        await server.serve_forever()


if __name__ == '__main__':
    asyncio.run(main())
