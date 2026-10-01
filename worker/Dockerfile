FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y chromium fonts-liberation --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /usr/sbin/nologin worker
ENV CHROME_PATH=/usr/bin/chromium
ENV REQUIRE_OUTBOUND_PROXY=1
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN chown -R worker:worker /app
USER worker
CMD ["npm", "start"]
