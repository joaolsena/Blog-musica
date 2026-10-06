import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// No computador, as chamadas para /api vão para o servidor Express na porta 4000.
// Vale para "npm run dev" e para "npm run preview" (testar o site compilado).
const proxy = { "/api": "http://localhost:4000" };

export default defineConfig({
  plugins: [react()],
  // host: true deixa o site acessível pelo celular na mesma rede Wi-Fi
  server: { port: 3000, host: true, proxy },
  preview: { port: 3000, proxy },
  build: { outDir: "dist" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
  },
});
