// Gera o PDF de um projeto no navegador e entrega o arquivo.
// Carregado só quando alguém toca em "Baixar PDF" (o pdfmake é grande).

import pdfMake from "pdfmake/build/pdfmake";
import sans from "../assets/fontes/instrument-sans-latin-400-normal.woff?url";
import sansNegrito from "../assets/fontes/instrument-sans-latin-600-normal.woff?url";
import sansItalico from "../assets/fontes/instrument-sans-latin-400-italic.woff?url";
import sansNegritoItalico from "../assets/fontes/instrument-sans-latin-600-italic.woff?url";
import serif from "../assets/fontes/instrument-serif-latin-400-normal.woff?url";
import serifItalico from "../assets/fontes/instrument-serif-latin-400-italic.woff?url";
import { montarDocumento, nomeDoArquivo } from "./pdfProjeto";

// O pdfmake busca as fontes pelo endereço completo
const absoluto = (url) => new URL(url, window.location.href).href;

pdfMake.setFonts({
  Sans: {
    normal: absoluto(sans),
    bold: absoluto(sansNegrito),
    italics: absoluto(sansItalico),
    bolditalics: absoluto(sansNegritoItalico),
  },
  Serif: {
    normal: absoluto(serif),
    bold: absoluto(serif),
    italics: absoluto(serifItalico),
    bolditalics: absoluto(serifItalico),
  },
});
// Só busca fontes do próprio site (as fotos chegam prontas, em data URL)
pdfMake.setUrlAccessPolicy((url) => url.startsWith(window.location.origin));

// Foto do Cloudinary em JPG, no tamanho do papel (o PDF só aceita JPG e PNG)
function urlParaPdf(url, transformacao) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  const [antes, depois] = url.split("/image/upload/");
  return `${antes}/image/upload/${transformacao}/${depois}`;
}

// Baixa uma foto como data URL; se falhar (sem internet, formato estranho), o PDF sai sem ela
async function carregarFoto(url) {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    if (!/^image\/(jpeg|png)$/.test(blob.type)) return null;
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function carregarFotos(projeto) {
  const pedidos = [];
  if (projeto.imagem) {
    pedidos.push(["capa", urlParaPdf(projeto.imagem, "f_jpg,q_80,c_limit,w_1400,h_1400")]);
  }
  (projeto.imagensPassoAPasso || []).forEach((url, index) => {
    // Quadradas, como na galeria do site
    pedidos.push([`passo${index}`, urlParaPdf(url, "f_jpg,q_80,c_fill,g_auto,w_600,h_600")]);
  });
  const resultados = await Promise.all(pedidos.map(async ([chave, url]) => [chave, await carregarFoto(url)]));
  return Object.fromEntries(resultados.filter(([, dados]) => dados));
}

// No app instalado no iPhone/iPad o download não tem para onde ir: abre o menu de
// compartilhar (Salvar em Arquivos, Imprimir, WhatsApp...). No resto, baixa o arquivo.
async function entregar(blob, nome) {
  const arquivo = new File([blob], nome, { type: "application/pdf" });
  const appNoIos = window.navigator.standalone === true;
  if (appNoIos && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return; // a pessoa fechou o menu
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function baixarPdf(projeto, endereco) {
  const fotos = await carregarFotos(projeto);
  const documento = montarDocumento(projeto, { fotos, endereco });
  const blob = await pdfMake.createPdf(documento).getBlob();
  await entregar(blob, nomeDoArquivo(projeto.titulo));
}
