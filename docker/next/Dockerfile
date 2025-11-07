FROM node:24-slim AS development

WORKDIR /src

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH=${PNPM_HOME}:${PATH}

RUN mkdir /pnpm-store /src/node_modules && chown -R node:node /pnpm-store /src/node_modules /src

USER node

CMD ["sleep", "infinity"]