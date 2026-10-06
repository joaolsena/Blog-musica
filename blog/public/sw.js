// Service worker do Ensine Música: permite instalar o site como app e abrir o
// que já foi visto mesmo sem internet.
//
// - Páginas: busca na rede; sem conexão, usa a última versão guardada.
// - Arquivos do site (/assets, com nome que muda a cada versão): guardados na primeira vez.
// - Lista e projetos (/api/projetos): busca na rede; sem conexão, usa a última resposta.
// As imagens do Cloudinary não são guardadas: o navegador já faz o cache delas.

const VERSAO = "v2";
const CACHE_APP = `ensine-musica-app-${VERSAO}`;
const CACHE_DADOS = `ensine-musica-dados-${VERSAO}`;

// Na instalação, guarda a página base e os arquivos que ela carrega
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_APP);
      const resposta = await fetch("/", { cache: "no-cache" });
      const html = await resposta.clone().text();
      const arquivos = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
      await cache.put("/", resposta);
      await cache.addAll([...new Set(arquivos), "/favicon.svg", "/app/icon-192.png"]);
      await self.skipWaiting();
    })()
  );
});

// Ao ativar uma versão nova, apaga os caches das versões antigas
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const atuais = [CACHE_APP, CACHE_DADOS];
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n.startsWith("ensine-musica-") && !atuais.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

async function primeiroRede(pedido, nomeCache, chave = pedido) {
  const cache = await caches.open(nomeCache);
  try {
    const resposta = await fetch(pedido);
    if (resposta.ok) cache.put(chave, resposta.clone());
    return resposta;
  } catch (erro) {
    const guardada = await cache.match(chave);
    if (guardada) return guardada;
    throw erro;
  }
}

// Outras páginas: da rede; sem conexão, a página base guardada (o React monta o resto)
async function paginaOuBase(pedido) {
  try {
    return await fetch(pedido);
  } catch (erro) {
    const base = await caches.match("/", { cacheName: CACHE_APP });
    if (base) return base;
    throw erro;
  }
}

async function primeiroCache(pedido, nomeCache) {
  const cache = await caches.open(nomeCache);
  const guardada = await cache.match(pedido);
  if (guardada) return guardada;
  const resposta = await fetch(pedido);
  if (resposta.ok) cache.put(pedido, resposta.clone());
  return resposta;
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Todas as páginas são o mesmo site (o React escolhe o conteúdo pela URL). Só a página
  // inicial é guardada como base: a de um projeto vem com título e foto dele na prévia.
  if (request.mode === "navigate") {
    evento.respondWith(url.pathname === "/" ? primeiroRede(request, CACHE_APP, "/") : paginaOuBase(request));
  } else if (url.pathname.startsWith("/assets/")) {
    evento.respondWith(primeiroCache(request, CACHE_APP));
  } else if (url.pathname.startsWith("/api/projetos")) {
    evento.respondWith(primeiroRede(request, CACHE_DADOS));
  }
});
