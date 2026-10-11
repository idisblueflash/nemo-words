#!/usr/bin/env python3
"""Minimal HTTP CONNECT proxy (HTTPS tunnelling only), localhost-bound.

Run on the Mac mini and reach it via `ssh -L 8899:127.0.0.1:8899 macmini`.
Started and tunnelled by scripts/codex-imagegen-via-macmini.sh (ADR-0024).
"""
import asyncio
import sys

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8899


async def pipe(reader, writer):
    try:
        while data := await reader.read(65536):
            writer.write(data)
            await writer.drain()
    except (ConnectionError, asyncio.CancelledError):
        pass
    finally:
        writer.close()


async def handle(client_r, client_w):
    try:
        head = await client_r.readuntil(b"\r\n\r\n")
        method, target, _ = head.split(b"\r\n", 1)[0].decode().split(" ", 2)
        if method != "CONNECT":
            client_w.write(b"HTTP/1.1 405 Method Not Allowed\r\n\r\n")
            await client_w.drain()
            client_w.close()
            return
        host, port = target.rsplit(":", 1)
        up_r, up_w = await asyncio.wait_for(asyncio.open_connection(host, int(port)), 20)
        client_w.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        await client_w.drain()
        await asyncio.gather(pipe(client_r, up_w), pipe(up_r, client_w))
    except Exception:
        client_w.close()


async def main():
    server = await asyncio.start_server(handle, HOST, PORT)
    async with server:
        await server.serve_forever()


asyncio.run(main())
