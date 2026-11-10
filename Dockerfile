FROM node:22-bookworm-slim
ENV NODE_ENV=production CREATOR_MODE=cloud PYTHON=/opt/renderer/bin/python3 PYTHONPATH=/opt/renderer/lib/python3.11/site-packages
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv fonts-dejavu-core ca-certificates tini && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/renderer && /opt/renderer/bin/pip install --no-cache-dir -r /tmp/requirements.txt
COPY server ./server
USER node
EXPOSE 3001
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server/index.mjs"]
