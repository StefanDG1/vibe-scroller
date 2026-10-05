FROM node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
RUN apt-get update && apt-get install -y --no-install-recommends python3 socat ca-certificates bubblewrap && rm -rf /var/lib/apt/lists/*
RUN npm install -g @openai/codex@0.160.0 && codex --version
COPY public_proxy.py /opt/vibe/public_proxy.py
RUN mkdir -p /home/node/evidence /home/node/auth && chown -R node:node /home/node
USER node
WORKDIR /home/node/evidence
