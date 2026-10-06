import { useSyncExternalStore } from "react";

// Instalação do site como app (PWA).
//
// Chrome e Edge (Android, Windows, Mac, Linux) avisam com o evento "beforeinstallprompt"
// que o site pode ser instalado; guardamos esse evento para abrir a janela de
// instalação do próprio navegador quando a pessoa tocar no botão. Safari (iPhone,
// iPad e Mac) não tem esse evento: nele mostramos o passo a passo.
//
// Os ouvintes ficam no nível do módulo porque o evento pode chegar antes do React montar.

let conviteDoNavegador = null;
let acabouDeInstalar = false;
const ouvintes = new Set();
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault(); // não mostra o aviso automático; o botão decide quando
    conviteDoNavegador = evento;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    conviteDoNavegador = null;
    acabouDeInstalar = true;
    avisar();
  });
}

// Aberto como app instalado (e não numa aba do navegador)?
export function rodandoComoApp() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)").matches ||
    window.navigator.standalone === true // Safari do iPhone
  );
}

// Descobre o aparelho e o navegador para escolher as instruções certas
export function detectarPlataforma(ua = navigator.userAgent, toques = navigator.maxTouchPoints || 0) {
  // iPad recente se apresenta como Mac; o toque denuncia
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && toques > 1);
  const android = /Android/.test(ua);
  const mac = /Macintosh/.test(ua) && !ios;
  const windows = /Windows/.test(ua);

  const firefox = /Firefox|FxiOS/.test(ua);
  const edge = /Edg(e|A|iOS)?\//.test(ua);
  const samsung = /SamsungBrowser/.test(ua);
  const chrome = /Chrome|CriOS/.test(ua) && !edge && !samsung && !/OPR/.test(ua);
  const safari = /Safari/.test(ua) && !chrome && !edge && !firefox && !samsung && !/CriOS|OPR/.test(ua);

  let sistema = "computador";
  if (ios) sistema = /iPad/.test(ua) || (/Macintosh/.test(ua) && toques > 1) ? "ipad" : "iphone";
  else if (android) sistema = "android";
  else if (mac) sistema = "mac";
  else if (windows) sistema = "windows";

  let navegador = "outro";
  if (safari) navegador = "safari";
  else if (edge) navegador = "edge";
  else if (samsung) navegador = "samsung";
  else if (firefox) navegador = "firefox";
  else if (chrome) navegador = "chrome";

  return { sistema, navegador, movel: ios || android };
}

// Dá para instalar neste navegador? (Firefox no computador não instala sites como app)
export function podeInstalar({ sistema, navegador, movel }) {
  if (movel) return true; // iPhone, iPad e Android: todos têm "Adicionar à tela inicial"
  if (navegador === "safari") return sistema === "mac"; // Safari 17+: "Adicionar ao Dock"
  return navegador === "chrome" || navegador === "edge";
}

// Abre a janela de instalação do navegador. Retorna true se a pessoa aceitou.
export async function abrirConviteDoNavegador() {
  const convite = conviteDoNavegador;
  if (!convite) return false;
  conviteDoNavegador = null; // cada convite só pode ser usado uma vez
  avisar();
  convite.prompt();
  const { outcome } = await convite.userChoice;
  return outcome === "accepted";
}

const assinar = (ouvinte) => {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
};

// Estado para os componentes: { temConvite, instalado }
let instantaneo = { temConvite: false, instalado: false };
function lerEstado() {
  const temConvite = Boolean(conviteDoNavegador);
  const instalado = acabouDeInstalar || rodandoComoApp();
  if (temConvite !== instantaneo.temConvite || instalado !== instantaneo.instalado) {
    instantaneo = { temConvite, instalado };
  }
  return instantaneo;
}

export function useInstalacao() {
  return useSyncExternalStore(assinar, lerEstado, () => instantaneo);
}
