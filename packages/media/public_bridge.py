"""Guest namespace forwarder; the trusted Unix broker controls destinations."""
import asyncio
import os
import sys


async def relay(reader, writer):
    try:
        while data := await reader.read(65536):
            writer.write(data)
            await writer.drain()
    finally:
        writer.close()


async def handle(reader, writer):
    peer = None
    try:
        remote, peer = await asyncio.open_unix_connection('/run/vibe-public.sock', limit=4096)
        pumps = [asyncio.create_task(relay(reader, peer)), asyncio.create_task(relay(remote, writer))]
        try:
            await asyncio.wait(pumps, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for task in pumps:
                task.cancel()
            await asyncio.gather(*pumps, return_exceptions=True)
    except Exception:
        if peer:
            peer.close()
        writer.close()


async def main():
    assert os.getuid() == 1001 and len(sys.argv) == 3
    server = await asyncio.start_server(handle, '127.0.0.1', 47891, limit=4096, backlog=8)
    async with server:
        process = await asyncio.create_subprocess_exec('bash', '-c', sys.argv[2], cwd=sys.argv[1])
        return await process.wait()


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
