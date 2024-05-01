FROM node:20

RUN apt-get update \
    && apt-get install -y dumb-init

ARG SHOPIFY_API_KEY
ARG SHOPIFY_SHOP
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV SHOPIFY_SHOP=$SHOPIFY_SHOP
EXPOSE 8081
WORKDIR /app
COPY web web
COPY work-order-shopify-order work-order-shopify-order
COPY common common
COPY meta.json web
COPY .npmrc-ci common/.npmrc
COPY .npmrc-ci web/.npmrc
COPY .npmrc-ci web/frontend/.npmrc
COPY .npmrc-ci work-order-shopify-order/.npmrc
COPY graphql.config.yml web

# Install deps for work-order-shopify-order
WORKDIR ./work-order-shopify-order
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install
RUN --mount=type=secret,id=SHOPIFY_ACCESS_TOKEN \
  SHOPIFY_ACCESS_TOKEN=$(cat /run/secrets/SHOPIFY_ACCESS_TOKEN) \
  npm run build

# Install deps for common
WORKDIR ../common
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install

# Build backend
WORKDIR ../web
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install
RUN --mount=type=secret,id=SHOPIFY_ACCESS_TOKEN \
  SHOPIFY_ACCESS_TOKEN=$(cat /run/secrets/SHOPIFY_ACCESS_TOKEN) \
  npm run build

# Build common
WORKDIR ../common
RUN npm run build

# Build frontend
WORKDIR ../web/frontend
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install
RUN npm run build

# Run
WORKDIR ..
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "serve"]
