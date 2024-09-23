// vite.config.ts
import { defineConfig, loadEnv } from "file:///Users/tim/teifi/workmate/web/frontend/node_modules/vite/dist/node/index.js";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "file:///Users/tim/teifi/workmate/web/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import tsconfigPaths from "file:///Users/tim/teifi/workmate/web/frontend/node_modules/vite-tsconfig-paths/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/tim/teifi/workmate/web/frontend";
var __vite_injected_original_import_meta_url = "file:///Users/tim/teifi/workmate/web/frontend/vite.config.ts";
var requiredEnvVars = ["SHOPIFY_API_KEY", "VITE_INTERCOM_APP_ID"];
if (process.env.NODE_ENV === "production" && process.env.npm_lifecycle_event === "build" && !process.env.CI) {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} environment variable is required to build the frontend app`);
    }
  }
}
var proxyOptions = {
  target: `http://127.0.0.1:${process.env.BACKEND_PORT}`,
  changeOrigin: false,
  secure: true,
  ws: false
};
var host = process.env.HOST ? process.env.HOST.replace(/https?:\/\//, "") : "localhost";
var hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host,
    port: Number(process.env.FRONTEND_PORT),
    clientPort: 443
  };
}
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, dirname(process.cwd()), "");
  const define = Object.entries(env).filter(([k]) => k.startsWith("VITE_")).reduce(
    (acc, [k, v]) => {
      acc[`process.env.${k}`] = JSON.stringify(v);
      return acc;
    },
    {}
  );
  define["process.env.SHOPIFY_API_KEY"] = JSON.stringify(process.env.SHOPIFY_API_KEY);
  return {
    root: dirname(fileURLToPath(__vite_injected_original_import_meta_url)),
    plugins: [react(), tsconfigPaths()],
    define,
    resolve: {
      preserveSymlinks: true,
      alias: {
        "@work-orders/common": resolve(__vite_injected_original_dirname, "../../common/src")
      }
    },
    server: {
      host: "localhost",
      port: Number(process.env.FRONTEND_PORT),
      hmr: hmrConfig,
      proxy: {
        "^/(\\?.*)?$": proxyOptions,
        "^/api(/|(\\?.*)?$)": proxyOptions
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext"
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdGltL3RlaWZpL3dvcmttYXRlL3dlYi9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3RpbS90ZWlmaS93b3JrbWF0ZS93ZWIvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3RpbS90ZWlmaS93b3JrbWF0ZS93ZWIvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIEhtck9wdGlvbnMsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IGRpcm5hbWUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gJ3ZpdGUtdHNjb25maWctcGF0aHMnO1xuXG5jb25zdCByZXF1aXJlZEVudlZhcnMgPSBbJ1NIT1BJRllfQVBJX0tFWScsICdWSVRFX0lOVEVSQ09NX0FQUF9JRCddO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyAmJiBwcm9jZXNzLmVudi5ucG1fbGlmZWN5Y2xlX2V2ZW50ID09PSAnYnVpbGQnICYmICFwcm9jZXNzLmVudi5DSSkge1xuICBmb3IgKGNvbnN0IGVudlZhciBvZiByZXF1aXJlZEVudlZhcnMpIHtcbiAgICBpZiAoIXByb2Nlc3MuZW52W2VudlZhcl0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtlbnZWYXJ9IGVudmlyb25tZW50IHZhcmlhYmxlIGlzIHJlcXVpcmVkIHRvIGJ1aWxkIHRoZSBmcm9udGVuZCBhcHBgKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3QgcHJveHlPcHRpb25zID0ge1xuICB0YXJnZXQ6IGBodHRwOi8vMTI3LjAuMC4xOiR7cHJvY2Vzcy5lbnYuQkFDS0VORF9QT1JUfWAsXG4gIGNoYW5nZU9yaWdpbjogZmFsc2UsXG4gIHNlY3VyZTogdHJ1ZSxcbiAgd3M6IGZhbHNlLFxufTtcblxuY29uc3QgaG9zdCA9IHByb2Nlc3MuZW52LkhPU1QgPyBwcm9jZXNzLmVudi5IT1NULnJlcGxhY2UoL2h0dHBzPzpcXC9cXC8vLCAnJykgOiAnbG9jYWxob3N0JztcblxubGV0IGhtckNvbmZpZzogSG1yT3B0aW9ucztcbmlmIChob3N0ID09PSAnbG9jYWxob3N0Jykge1xuICBobXJDb25maWcgPSB7XG4gICAgcHJvdG9jb2w6ICd3cycsXG4gICAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gICAgcG9ydDogNjQ5OTksXG4gICAgY2xpZW50UG9ydDogNjQ5OTksXG4gIH07XG59IGVsc2Uge1xuICBobXJDb25maWcgPSB7XG4gICAgcHJvdG9jb2w6ICd3c3MnLFxuICAgIGhvc3Q6IGhvc3QsXG4gICAgcG9ydDogTnVtYmVyKHByb2Nlc3MuZW52LkZST05URU5EX1BPUlQhKSxcbiAgICBjbGllbnRQb3J0OiA0NDMsXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBkaXJuYW1lKHByb2Nlc3MuY3dkKCkpLCAnJyk7XG4gIGNvbnN0IGRlZmluZSA9IE9iamVjdC5lbnRyaWVzKGVudilcbiAgICAuZmlsdGVyKChba10pID0+IGsuc3RhcnRzV2l0aCgnVklURV8nKSlcbiAgICAucmVkdWNlKFxuICAgICAgKGFjYywgW2ssIHZdKSA9PiB7XG4gICAgICAgIGFjY1tgcHJvY2Vzcy5lbnYuJHtrfWBdID0gSlNPTi5zdHJpbmdpZnkodik7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LFxuICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICApO1xuICBkZWZpbmVbJ3Byb2Nlc3MuZW52LlNIT1BJRllfQVBJX0tFWSddID0gSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuU0hPUElGWV9BUElfS0VZKTtcblxuICByZXR1cm4ge1xuICAgIHJvb3Q6IGRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSxcbiAgICBwbHVnaW5zOiBbcmVhY3QoKSwgdHNjb25maWdQYXRocygpXSxcbiAgICBkZWZpbmUsXG4gICAgcmVzb2x2ZToge1xuICAgICAgcHJlc2VydmVTeW1saW5rczogdHJ1ZSxcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAd29yay1vcmRlcnMvY29tbW9uJzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9jb21tb24vc3JjJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBob3N0OiAnbG9jYWxob3N0JyxcbiAgICAgIHBvcnQ6IE51bWJlcihwcm9jZXNzLmVudi5GUk9OVEVORF9QT1JUISksXG4gICAgICBobXI6IGhtckNvbmZpZyxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICdeLyhcXFxcPy4qKT8kJzogcHJveHlPcHRpb25zLFxuICAgICAgICAnXi9hcGkoL3woXFxcXD8uKik/JCknOiBwcm94eU9wdGlvbnMsXG4gICAgICB9LFxuICAgIH0sXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9TLFNBQVMsY0FBMEIsZUFBZTtBQUN0VixTQUFTLFNBQVMsZUFBZTtBQUNqQyxTQUFTLHFCQUFxQjtBQUM5QixPQUFPLFdBQVc7QUFDbEIsT0FBTyxtQkFBbUI7QUFKMUIsSUFBTSxtQ0FBbUM7QUFBMkksSUFBTSwyQ0FBMkM7QUFNck8sSUFBTSxrQkFBa0IsQ0FBQyxtQkFBbUIsc0JBQXNCO0FBRWxFLElBQUksUUFBUSxJQUFJLGFBQWEsZ0JBQWdCLFFBQVEsSUFBSSx3QkFBd0IsV0FBVyxDQUFDLFFBQVEsSUFBSSxJQUFJO0FBQzNHLGFBQVcsVUFBVSxpQkFBaUI7QUFDcEMsUUFBSSxDQUFDLFFBQVEsSUFBSSxNQUFNLEdBQUc7QUFDeEIsWUFBTSxJQUFJLE1BQU0sR0FBRyxNQUFNLDZEQUE2RDtBQUFBLElBQ3hGO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTSxlQUFlO0FBQUEsRUFDbkIsUUFBUSxvQkFBb0IsUUFBUSxJQUFJLFlBQVk7QUFBQSxFQUNwRCxjQUFjO0FBQUEsRUFDZCxRQUFRO0FBQUEsRUFDUixJQUFJO0FBQ047QUFFQSxJQUFNLE9BQU8sUUFBUSxJQUFJLE9BQU8sUUFBUSxJQUFJLEtBQUssUUFBUSxlQUFlLEVBQUUsSUFBSTtBQUU5RSxJQUFJO0FBQ0osSUFBSSxTQUFTLGFBQWE7QUFDeEIsY0FBWTtBQUFBLElBQ1YsVUFBVTtBQUFBLElBQ1YsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFDRixPQUFPO0FBQ0wsY0FBWTtBQUFBLElBQ1YsVUFBVTtBQUFBLElBQ1Y7QUFBQSxJQUNBLE1BQU0sT0FBTyxRQUFRLElBQUksYUFBYztBQUFBLElBQ3ZDLFlBQVk7QUFBQSxFQUNkO0FBQ0Y7QUFFQSxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFFO0FBQ3BELFFBQU0sU0FBUyxPQUFPLFFBQVEsR0FBRyxFQUM5QixPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxXQUFXLE9BQU8sQ0FBQyxFQUNyQztBQUFBLElBQ0MsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU07QUFDZixVQUFJLGVBQWUsQ0FBQyxFQUFFLElBQUksS0FBSyxVQUFVLENBQUM7QUFDMUMsYUFBTztBQUFBLElBQ1Q7QUFBQSxJQUNBLENBQUM7QUFBQSxFQUNIO0FBQ0YsU0FBTyw2QkFBNkIsSUFBSSxLQUFLLFVBQVUsUUFBUSxJQUFJLGVBQWU7QUFFbEYsU0FBTztBQUFBLElBQ0wsTUFBTSxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUFBLElBQzVDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDO0FBQUEsSUFDbEM7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLGtCQUFrQjtBQUFBLE1BQ2xCLE9BQU87QUFBQSxRQUNMLHVCQUF1QixRQUFRLGtDQUFXLGtCQUFrQjtBQUFBLE1BQzlEO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTSxPQUFPLFFBQVEsSUFBSSxhQUFjO0FBQUEsTUFDdkMsS0FBSztBQUFBLE1BQ0wsT0FBTztBQUFBLFFBQ0wsZUFBZTtBQUFBLFFBQ2Ysc0JBQXNCO0FBQUEsTUFDeEI7QUFBQSxJQUNGO0FBQUEsSUFDQSxjQUFjO0FBQUEsTUFDWixnQkFBZ0I7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
