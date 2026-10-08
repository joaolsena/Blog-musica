import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// No computador, as chamadas para /api vão para o servidor Express na porta 4000.
// Vale para "npm run dev" e para "npm run preview" (testar o site compilado).
const proxy = { "/api": "http://localhost:4000" };

// Endereço público do site (prévia de links no WhatsApp). No Vercel vem sozinho do
// domínio principal do projeto, então trocar para um domínio próprio não exige mudar
// código. Pode ser forçado com VITE_SITE_URL; no computador vale o .env.development.
if (!process.env.VITE_SITE_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.VITE_SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
}

// As páginas ficam em arquivos à parte (veja App.jsx). Para que abram sem internet mesmo sem
// terem sido visitadas, o service worker precisa saber o nome de todos eles, que muda a cada
// versão. Este passo escreve a lista no sw.js compilado, junto com uma versão tirada dela:
// assim cada versão nova do site também é uma versão nova do service worker.
// O gerador de PDF fica de fora (é grande e só serve com internet, para buscar as fotos).
function listaParaOffline() {
  let arquivos = [];
  let pastaFinal = "dist";
  return {
    name: "lista-para-offline",
    apply: "build",
    configResolved(config) {
      pastaFinal = resolve(config.root, config.build.outDir);
    },
    generateBundle(_opcoes, pacote) {
      arquivos = Object.keys(pacote)
        .filter((nome) => nome.startsWith("assets/") && !/\.map$/.test(nome))
        .filter((nome) => !(pacote[nome].type === "chunk" && pacote[nome].name === "baixarPdf"))
        .map((nome) => `/${nome}`)
        .sort();
    },
    closeBundle() {
      const caminho = resolve(pastaFinal, "sw.js");
      const versao = createHash("sha256").update(arquivos.join("\n")).digest("hex").slice(0, 10);
      const codigo = readFileSync(caminho, "utf8")
        .replace("/* __ARQUIVOS_DO_SITE__ */ []", JSON.stringify(arquivos))
        .replace('"/* __VERSAO__ */"', JSON.stringify(versao));
      writeFileSync(caminho, codigo);
    },
  };
}

export default defineConfig({
  plugins: [react(), listaParaOffline()],
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
