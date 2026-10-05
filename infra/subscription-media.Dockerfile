ARG BASE_IMAGE=python@sha256:54c85f3c47607a77f32adec749d3c81d1348bf25833671f512b26a9b6d778cb3
FROM ${BASE_IMAGE}
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg socat ca-certificates && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir Pillow==11.3.0
COPY acquire.py decode-personal.py public_proxy.py /opt/vibe/
COPY downloader.json /opt/vibe/downloader.json
RUN python -c "import hashlib,json,pathlib,urllib.request; r=json.loads(pathlib.Path('/opt/vibe/downloader.json').read_text()); b=urllib.request.urlopen(r['url'],timeout=60).read(50000000); assert hashlib.sha256(b).hexdigest()==r['sha256']; p=pathlib.Path('/usr/local/bin/yt-dlp'); p.write_bytes(b); p.chmod(0o755)"
RUN useradd --uid 1001 --create-home user && mkdir -p /home/user/media && chown 1001:1001 /home/user/media
USER 1001:1001
WORKDIR /home/user/media
