FROM jellyfin/jellyfin:latest

USER root

RUN apt-get update && \
    apt-get install -y curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/jellyfin-web
COPY . /tmp/jellyfin-web

RUN npm install && \
    npm run build:production

RUN rm -rf /jellyfin/jellyfin-web && \
    mv /tmp/jellyfin-web/dist /jellyfin/jellyfin-web && \
    chown -R 1000:1000 /jellyfin/jellyfin-web && \
    rm -rf /tmp/jellyfin-web && \
    apt-get purge -y curl nodejs && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* /root/.npm

USER 1000:1000
WORKDIR /jellyfin
