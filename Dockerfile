FROM node:20

ARG SHOPIFY_API_KEY
ARG SHOPIFY_SHOP
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV SHOPIFY_SHOP=$SHOPIFY_SHOP
EXPOSE 8081
WORKDIR /app
COPY web web
COPY common common
COPY meta.json web
COPY .npmrc-ci web/.npmrc
COPY .npmrc-ci web/frontend/.npmrc
COPY graphql.config.yml web

# Build common
WORKDIR ./common
RUN npm install
RUN npm run build:silence

# Build backend
WORKDIR ../web
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install
RUN --mount=type=secret,id=SHOPIFY_ACCESS_TOKEN \
  SHOPIFY_ACCESS_TOKEN=$(cat /run/secrets/SHOPIFY_ACCESS_TOKEN) \
  npm run build

# Build frontend
WORKDIR ../web/frontend
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install
RUN npm run build

# Run
WORKDIR ..
CMD ["npm", "run", "serve"]
