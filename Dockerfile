FROM denoland/deno:bin AS deno
FROM node:22-bookworm-slim
COPY --from=deno /deno /usr/local/bin/deno
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && python3 -m venv /opt/downloader \
    && /opt/downloader/bin/pip install --no-cache-dir 'yt-dlp[default]' \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/opt/downloader/bin:${PATH}" BIND_HOST=0.0.0.0
WORKDIR /app
COPY server.mjs index.html ./
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
