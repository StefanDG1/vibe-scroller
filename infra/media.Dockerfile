ARG BASE_IMAGE
FROM ${BASE_IMAGE}
# BASE_IMAGE must be an approved digest containing the reviewed FFmpeg/Python tools.
USER root
RUN useradd --create-home --uid 10001 media || true
USER media
WORKDIR /home/media
COPY --chown=media:media packages/media/decode.py /home/media/decode.py
ENTRYPOINT ["python", "/home/media/decode.py"]
