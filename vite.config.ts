import path from "path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:8000";
const nekonoverse = path.resolve(__dirname, ".nekonoverse");

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3001,
    allowedHosts: true,
    fs: {
      allow: [
        path.resolve(__dirname),
        nekonoverse,
      ],
    },
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@nekonoverse/ui": path.resolve(nekonoverse, "packages/ui/src"),
      "solid-js": path.resolve(__dirname, "node_modules/solid-js"),
      "mfm-js": path.resolve(__dirname, "node_modules/mfm-js"),
      "dompurify": path.resolve(__dirname, "node_modules/dompurify"),
      "@solid-primitives/i18n": path.resolve(__dirname, "node_modules/@solid-primitives/i18n"),
    },
  },
  build: {
    target: "esnext",
  },
});
