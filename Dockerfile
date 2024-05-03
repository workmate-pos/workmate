FROM node:20

RUN apt-get update \
    && apt-get install -y dumb-init

ARG SHOPIFY_API_KEY
ARG SHOPIFY_SHOP
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV SHOPIFY_SHOP=$SHOPIFY_SHOP
EXPOSE 8081
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY web web
COPY extensions extensions
COPY work-order-shopify-order work-order-shopify-order
COPY common common
COPY meta.json web
COPY .npmrc-ci common/.npmrc
COPY .npmrc-ci web/.npmrc
COPY .npmrc-ci web/frontend/.npmrc
COPY .npmrc-ci work-order-shopify-order/.npmrc
COPY graphql.config.yml web

RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
    NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
    npm run all:install

RUN --mount=type=secret,id=SHOPIFY_ACCESS_TOKEN \
    SHOPIFY_ACCESS_TOKEN=$(cat /run/secrets/SHOPIFY_ACCESS_TOKEN) \
    npm run all:build

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "serve"]
