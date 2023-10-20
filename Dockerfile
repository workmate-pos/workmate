FROM node:20

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
EXPOSE 8081
WORKDIR /app
COPY web .
COPY meta.json .
COPY .npmrc-ci .npmrc
COPY .npmrc-ci frontend/.npmrc

# Build backend
RUN --mount=type=secret,id=NPM_GITHUB_TOKEN \
  NPM_GITHUB_TOKEN=$(cat /run/secrets/NPM_GITHUB_TOKEN) \
  npm install
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
