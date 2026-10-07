import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// No computador, as chamadas para /api vão para o servidor Express na porta 4000.
// Vale para "npm run dev" e para "npm run preview" (testar o site compilado).
const proxy = { "/api": "http://localhost:4000" };

// Endereço público do site (prévia de links no WhatsApp). No Vercel vem sozinho do
// domínio principal do projeto, então trocar para um domínio próprio não exige mudar
// código. Pode ser forçado com VITE_SITE_URL; no computador vale o .env.development.
if (!process.env.VITE_SITE_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.VITE_SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
}

export default defineConfig({
  plugins: [react()],
  // host: true deixa o site acessível pelo celular na mesma rede Wi-Fi
  server: { port: 3000, host: true, proxy },
  preview: { port: 3000, proxy },
  // O gerador de PDF (~1 MB) fica num arquivo à parte, baixado só ao tocar em "Baixar PDF"
  build: { outDir: "dist", chunkSizeWarningLimit: 1100 },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
  },
});
