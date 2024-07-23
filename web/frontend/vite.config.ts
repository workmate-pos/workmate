import { defineConfig, HmrOptions, loadEnv } from 'vite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const requiredEnvVars = ['SHOPIFY_API_KEY', 'VITE_INTERCOM_APP_ID'];

if (!('NO_INTERCOM' in process.env) && process.env.npm_lifecycle_event === 'build' && !process.env.CI) {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} environment variable is required to build the frontend app`);
    }
  }
}

const proxyOptions = {
  target: `http://127.0.0.1:${process.env.BACKEND_PORT}`,
  changeOrigin: false,
  secure: true,
  ws: false,
};

const host = process.env.HOST ? process.env.HOST.replace(/https?:\/\//, '') : 'localhost';

let hmrConfig: HmrOptions;
if (host === 'localhost') {
  hmrConfig = {
    protocol: 'ws',
    host: 'localhost',
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: 'wss',
    host: host,
    port: Number(process.env.FRONTEND_PORT!),
    clientPort: 443,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dirname(process.cwd()), '');
  const define = Object.entries(env)
    .filter(([k]) => k.startsWith('VITE_'))
    .reduce(
      (acc, [k, v]) => {
        acc[`process.env.${k}`] = JSON.stringify(v);
        return acc;
      },
      {} as Record<string, string>,
    );
  define['process.env.SHOPIFY_API_KEY'] = JSON.stringify(process.env.SHOPIFY_API_KEY);

  return {
    root: dirname(fileURLToPath(import.meta.url)),
    plugins: [react(), tsconfigPaths()],
    define,
    resolve: {
      preserveSymlinks: true,
    },
    server: {
      host: 'localhost',
      port: Number(process.env.FRONTEND_PORT!),
      hmr: hmrConfig,
      proxy: {
        '^/(\\?.*)?$': proxyOptions,
        '^/api(/|(\\?.*)?$)': proxyOptions,
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
      },
    },
  };
});
