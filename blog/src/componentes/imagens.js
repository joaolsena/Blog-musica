// Versões otimizadas das imagens do Cloudinary.
// O Cloudinary gera a imagem no tamanho pedido e no formato mais leve que o
// navegador aceita (WebP/AVIF), direto pela URL. Assim um card pequeno não
// baixa a foto inteira. URLs de outros lugares são devolvidas sem mudança.

const MARCADOR = "/image/upload/";

export function urlImagem(url, largura) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes(MARCADOR)) {
    return url;
  }
  const [antes, depois] = url.split(MARCADOR);
  return `${antes}${MARCADOR}f_auto,q_auto,c_limit,w_${largura}/${depois}`;
}

// srcSet com várias larguras, para o navegador escolher conforme a tela
export function srcSetImagem(url, larguras) {
  if (urlImagem(url, larguras[0]) === url) return undefined;
  return larguras.map((largura) => `${urlImagem(url, largura)} ${largura}w`).join(", ");
}
