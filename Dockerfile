FROM jellyfin/jellyfin:10.11.0

USER root

RUN apt-get update && \
    apt-get install -y curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@10.8.3

RUN node --version && npm --version

RUN git clone https://github.com/dannymichel/jellyfin-web.git /tmp/jellyfin-web

WORKDIR /tmp/jellyfin-web
RUN npm install && \
    npm run build:production || echo "Build failed"

RUN ls -la /tmp/jellyfin-web && \
    ls -la /tmp/jellyfin-web/dist || echo "No dist directory found"

RUN rm -rf /jellyfin/jellyfin-web && \
    mv /tmp/jellyfin-web/dist /jellyfin/jellyfin-web && \
    chown -R 1000:1000 /jellyfin/jellyfin-web && \
    rm -rf /tmp/jellyfin-web && \
    apt-get purge -y curl git nodejs && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* /tmp/* /root/.npm

USER 1000:1000
WORKDIR /jellyfin