FROM node:20

ARG SHOPIFY_API_KEY
ARG SHOPIFY_SHOP
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV SHOPIFY_SHOP=$SHOPIFY_SHOP
EXPOSE 8081
WORKDIR /app
COPY web .
COPY common common
COPY meta.json .
COPY .npmrc-ci .npmrc
COPY .npmrc-ci frontend/.npmrc
COPY graphql.config.yml .

# Build backend
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install
RUN --mount=type=secret,id=SHOPIFY_ACCESS_TOKEN \
  SHOPIFY_ACCESS_TOKEN=$(cat /run/secrets/SHOPIFY_ACCESS_TOKEN) \
  npm run build

# Build common
WORKDIR ./common
RUN npm install
RUN npm run build

# Build frontend
WORKDIR ./frontend
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install
RUN npm run build

# Run
WORKDIR ..
CMD ["npm", "run", "serve"]
