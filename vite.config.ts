import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
  server: {
    proxy: {
      "/api/trader": {
        target: "http://localhost:8090",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trader/, ""),
      },
      "/api/hypaper": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hypaper/, ""),
      },
      "/api/viz": {
        target: "http://localhost:8099",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api\/viz/, ""),
      },
      "/api/swarm": {
        target: process.env.COORDINATOR_URL ?? "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
});
