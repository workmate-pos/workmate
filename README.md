# Teifi Shopify App Template
A template for building Shopify apps using NodeJS, Express, TypeScript, React and Polaris.

## Getting Started
Use the template to create a new repository for your app. You can do this by clicking the "Use this template" button on the repository page.

### Prerequisites
- Node 20 or higher

### Installing
The first step is to link @teifi-digital packages to the github package registry.
Then you need to create a github token with `read:packages` scope, and add both entries to your `.npmrc` file (located at `~/.npmrc`):
```bash
//npm.pkg.github.com/:_authToken=ghp_...
@teifi-digital:registry=https://npm.pkg.github.com/
```

Then, copy the .env.example file to .env:
```bash
cp .env.example .env
```

Make sure to populate this yourself.

Then, create symlinks to .npmrc for all subprojects:
```bash
cd web && ln -s ../.npmrc .
cd frontend && ln -s ../../.npmrc .
cd ../../common && ln -s ../.npmrc .
cd ../extensions && ln -s ../.npmrc .
cd common-pos && ln -s ../../.npmrc .
cd ../work-orders-pos && ln -s ../../.npmrc .
cd ../purchase-orders-pos && ln -s ../../.npmrc .
```

Do the same for the .env file:
```bash
cd web && ln -s ../.env .
cd frontend && ln -s ../../.env .
cd ../../common && ln -s ../.env .
cd ../extensions && ln -s ../.env .
cd common-pos && ln -s ../../.env .
cd ../work-orders-pos && ln -s ../../.env .
cd ../purchase-orders-pos && ln -s ../../.env .
```

Then, you can install the dependencies for all subprojects:
```bash
npm i
cd web && npm i --ignore-scripts
cd ../frontend && npm i --ignore-scripts
cd ../common && npm i --ignore-scripts
cd ../extensions && npm i --ignore-scripts
cd common-pos && npm i --ignore-scripts
cd ../work-orders-pos && npm i --ignore-scripts
cd ../purchase-orders-pos && npm i --ignore-scripts
```

Finally, run prisma migrate to populate the db:
```bash
cd web
npx prisma migrate dev generate
cd ../
```

### Generating Schemas
You can generate types for the JSON schemas using the following command while in the `web` directory:
```bash
npm run typegen
```

### Running
You can run the app using the following command:
```
npm run dev
```

## CI/CD
The app is configured to use GitHub Actions for CI/CD.
The workflow is defined in `.github/workflows/build.yml`.
This workflow will run on every push to the `master` branch.
It will build the app and deploy the docker image to the GitHub Container Registry.
The image will be tagged with the short SHA of the commit, the branch name, and the git tag if present.

Please configure the following github actions [variables](https://docs.github.com/en/actions/learn-github-actions/variables) in the repository settings:
- `SHOPIFY_API_KEY`: The API key for this Shopify app.
- `SENTRY_ORG`: The Sentry organization to upload source maps to.
- `SENTRY_PROJECT`: The Sentry project to upload source maps to.

Please configure the following [secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) in the repository settings:
- `SENTRY_AUTH_TOKEN`: The Sentry auth token for uploading source maps.

You also need to configure read permissions for NPM packages in the package settings on GitHub.

## Building the Docker Image
1. Export your personal access token with `read:packages` scope into a file called `NPM_GITHUB_TOKEN.txt`:
   ```sh
   printf "ghp_..." > NPM_GITHUB_TOKEN.txt
   ```
2. Build the image using the secret file:
   ```sh
   docker build --secret id=NPM_GITHUB_TOKEN,src=./NPM_GITHUB_TOKEN.txt .
   ```
