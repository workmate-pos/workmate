FROM node:20 AS build

ARG SHOPIFY_API_KEY
ARG SHOPIFY_SHOP
ARG VITE_INTERCOM_APP_ID
ARG VITE_SCHEDULER_LICENSE_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV SHOPIFY_SHOP=$SHOPIFY_SHOP
ENV VITE_INTERCOM_APP_ID=$VITE_INTERCOM_APP_ID
ENV VITE_SCHEDULER_LICENSE_KEY=$VITE_SCHEDULER_LICENSE_KEY
EXPOSE 8081

WORKDIR /app

COPY package*.json ./
COPY web web
COPY work-order-shopify-order work-order-shopify-order
COPY common common
COPY meta.json graphql.config.yml ./web/

COPY .npmrc-ci common/.npmrc
COPY .npmrc-ci web/.npmrc
COPY .npmrc-ci web/frontend/.npmrc
COPY .npmrc-ci work-order-shopify-order/.npmrc

RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
    --mount=type=cache,target=/app/.npm \
    npm set cache /app/.npm && \
    NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
    npm run admin:install

RUN --mount=type=secret,id=SHOPIFY_ACCESS_TOKEN \
    SHOPIFY_ACCESS_TOKEN=$(cat /run/secrets/SHOPIFY_ACCESS_TOKEN) \
    npm run admin:build

FROM node:20 AS production

RUN apt-get update \
    && apt-get install -y dumb-init

WORKDIR /app

COPY package*.json ./
COPY web/package*.json meta.json web/
COPY web/prisma web/prisma/
COPY web/frontend/package*.json web/frontend/
COPY work-order-shopify-order/package*.json work-order-shopify-order/
COPY common/package*.json common/

COPY .npmrc-ci common/.npmrc
COPY .npmrc-ci web/.npmrc
COPY .npmrc-ci web/frontend/.npmrc
COPY .npmrc-ci work-order-shopify-order/.npmrc

RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
    --mount=type=cache,target=/app/.npm \
    npm set cache /app/.npm && \
    NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
    NODE_ENV=production \
    npm run admin:install

COPY --from=build /app/web/dist web/dist/
COPY --from=build /app/web/frontend/dist web/frontend/dist/
COPY --from=build /app/common/dist common/dist/
COPY --from=build /app/work-order-shopify-order/dist work-order-shopify-order/dist/

WORKDIR /app/web
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "serve"]
