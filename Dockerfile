FROM node:22-bookworm-slim
ENV BIND_HOST=0.0.0.0 DATA_DIR=/data
WORKDIR /app
RUN mkdir /data && chown node:node /data
COPY server.mjs index.html ./
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
