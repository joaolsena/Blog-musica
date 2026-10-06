// Vídeos de um projeto: links do YouTube ou arquivos enviados ao Cloudinary.

// Extrai o ID (11 caracteres) de um link do YouTube em qualquer formato comum:
// youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, /embed/ID, m.youtube.com...
// Retorna null se não for um link do YouTube válido.
export function idDoYoutube(texto) {
  if (typeof texto !== "string") return null;
  let url;
  try {
    url = new URL(texto.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/)?.[1];
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

// Endereço padrão em que o link é salvo (o servidor só aceita esse formato)
export const urlDoYoutube = (id) => `https://www.youtube.com/watch?v=${id}`;

// Miniatura do vídeo do YouTube
export const capaDoYoutube = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// Player do YouTube no modo de privacidade aprimorada (sem cookies até o play)
export const embedDoYoutube = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

const MARCADOR_VIDEO = "/video/upload/";

const ehVideoCloudinary = (url) =>
  typeof url === "string" && url.includes("res.cloudinary.com") && url.includes(MARCADOR_VIDEO);

// Versão do vídeo do Cloudinary no formato e qualidade mais leves para o navegador
export function urlVideo(url, largura = 1280) {
  if (!ehVideoCloudinary(url)) return url;
  const [antes, depois] = url.split(MARCADOR_VIDEO);
  return `${antes}${MARCADOR_VIDEO}f_auto,q_auto,c_limit,w_${largura}/${depois}`;
}

// Imagem de capa do vídeo do Cloudinary (um quadro escolhido automaticamente)
export function capaDoVideo(url, largura = 1280) {
  if (!ehVideoCloudinary(url)) return undefined;
  const [antes, depois] = url.split(MARCADOR_VIDEO);
  return `${antes}${MARCADOR_VIDEO}so_auto,c_limit,w_${largura}/${depois.replace(/\.\w+$/, ".jpg")}`;
}

// Descreve um vídeo salvo no projeto: { tipo: "youtube", id } ou { tipo: "arquivo", url }
export function descreverVideo(url) {
  const id = idDoYoutube(url);
  return id ? { tipo: "youtube", id, url } : { tipo: "arquivo", url };
}
