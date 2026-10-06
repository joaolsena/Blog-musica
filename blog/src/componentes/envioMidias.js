import axios from "axios";
import { toast } from "sonner";

// Regras de envio de imagens e vídeos, compartilhadas pelos formulários de adicionar e editar.
// Os limites devem bater com o servidor (server.js).

export const LIMITE_IMAGENS_PASSO = 20;
export const LIMITE_VIDEOS = 5;

// Formatos aceitos (as imagens passam pelo servidor; os vídeos vão direto ao Cloudinary)
export const FORMATOS_ACEITOS = "image/jpeg,image/png";
export const FORMATOS_VIDEO = "video/mp4,video/quicktime,video/webm,video/3gpp,.mp4,.mov,.m4v,.webm,.3gp";

// Limites do plano gratuito do Cloudinary
export const TAMANHO_MAXIMO_MB = 10; // por imagem
export const TAMANHO_MAXIMO_VIDEO_MB = 100; // por vídeo

// Quantas imagens sobem ao mesmo tempo: rápido sem sobrecarregar o servidor
const ENVIOS_SIMULTANEOS = 3;

// Avisa e retorna false se algum arquivo passar do tamanho máximo
export function tamanhosValidos(arquivos, limiteMB = TAMANHO_MAXIMO_MB, tipo = "imagem") {
  const grande = arquivos.find((arquivo) => arquivo.size > limiteMB * 1024 * 1024);
  if (grande) {
    toast.error(
      `"${grande.name}" tem ${(grande.size / 1024 / 1024).toFixed(1)} MB. O limite é ${limiteMB} MB por ${tipo}.`
    );
    return false;
  }
  return true;
}

// Apaga do Cloudinary mídias enviadas cujo projeto não chegou a ser salvo
export function removerMidias(urls) {
  if (urls.length === 0) return;
  axios
    .post("/midias/remover", { urls })
    .catch((erroLimpeza) => console.error("Erro ao remover mídias enviadas:", erroLimpeza));
}

// O servidor publicado (Vercel) recebe no máximo 4,5 MB por envio, e o Cloudinary
// guarda as imagens com no máximo 2000 px. Por isso o navegador reduz as fotos
// grandes antes de enviar: cabem no limite e sobem bem mais rápido no celular.
const LADO_MAXIMO_PX = 2000;
const TAMANHO_SEM_REDUZIR = 3.5 * 1024 * 1024;

export async function prepararImagem(arquivo) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(arquivo); // já corrige a rotação das fotos de celular
  } catch {
    return arquivo; // navegador sem suporte: envia como está
  }
  const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(bitmap.width, bitmap.height));
  if (escala === 1 && arquivo.size <= TAMANHO_SEM_REDUZIR) {
    bitmap.close();
    return arquivo;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const contexto = canvas.getContext("2d");
  contexto.fillStyle = "#fff"; // PNG com transparência vira JPG com fundo branco
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const reduzida = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!reduzida) return arquivo;
  return new File([reduzida], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

// Envia uma imagem ao servidor (que a guarda no Cloudinary) e devolve a URL
async function enviarImagem(arquivo) {
  const formData = new FormData();
  formData.append("imagem", await prepararImagem(arquivo));
  const { data } = await axios.post("/upload", formData);
  return data.url;
}

// Envia um vídeo direto ao Cloudinary, com uma assinatura pedida ao servidor.
// Usa XMLHttpRequest (e não axios) para acompanhar o progresso e para não mandar
// o token de login do site para o Cloudinary.
async function enviarVideo(arquivo, aoProgredir) {
  const { data: assinatura } = await axios.post("/videos/assinatura");
  const formData = new FormData();
  formData.append("file", arquivo);
  ["api_key", "timestamp", "signature", "folder", "allowed_formats"].forEach((campo) =>
    formData.append(campo, assinatura[campo])
  );

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${assinatura.cloud_name}/video/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && aoProgredir?.(e.loaded / e.total);
    xhr.onload = () => {
      let resposta = {};
      try {
        resposta = JSON.parse(xhr.responseText);
      } catch {
        // resposta sem JSON: tratada abaixo como erro
      }
      if (xhr.status >= 200 && xhr.status < 300 && resposta.secure_url) {
        resolve(resposta.secure_url);
      } else {
        const erro = new Error(resposta.error?.message || `Cloudinary respondeu ${xhr.status}`);
        erro.envioVideo = true;
        reject(erro);
      }
    };
    xhr.onerror = () => reject(Object.assign(new Error("Falha de conexão ao enviar o vídeo"), { envioVideo: true }));
    xhr.send(formData);
  });
}

// Executa as tarefas com no máximo `limite` ao mesmo tempo, mantendo a ordem dos resultados
async function emParalelo(itens, limite, tarefa) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await tarefa(itens[indice], indice);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

// Envia a imagem principal (opcional), as imagens do passo a passo e os vídeos.
// aoProgredir(mensagem) recebe textos como "Enviando imagens… 3 de 12".
// Retorna { urlPrincipal, urlsPassos, urlsVideos, enviadas }. Se algum envio falhar,
// apaga o que já tinha subido e relança o erro.
export async function enviarMidias({ principal = null, passos = [], videos = [] }, aoProgredir = () => {}) {
  const enviadas = [];
  const imagens = [principal, ...passos].filter(Boolean);
  let imagensProntas = 0;

  try {
    const avisarImagens = () =>
      aoProgredir(imagens.length > 1 ? `Enviando imagens… ${imagensProntas} de ${imagens.length}` : "Enviando imagem…");
    if (imagens.length > 0) avisarImagens();
    const urlsImagens = await emParalelo(imagens, ENVIOS_SIMULTANEOS, async (arquivo) => {
      const url = await enviarImagem(arquivo);
      enviadas.push(url);
      imagensProntas += 1;
      avisarImagens();
      return url;
    });

    // Vídeos um de cada vez, mostrando a porcentagem
    const urlsVideos = [];
    for (const [indice, arquivo] of videos.entries()) {
      const rotulo = videos.length > 1 ? `vídeo ${indice + 1} de ${videos.length}` : "vídeo";
      const url = await enviarVideo(arquivo, (fracao) =>
        aoProgredir(`Enviando ${rotulo}… ${Math.round(fracao * 100)}%`)
      );
      enviadas.push(url);
      urlsVideos.push(url);
    }

    return {
      urlPrincipal: principal ? urlsImagens[0] : null,
      urlsPassos: principal ? urlsImagens.slice(1) : urlsImagens,
      urlsVideos,
      enviadas,
    };
  } catch (error) {
    removerMidias(enviadas);
    throw error;
  }
}

// Mensagem para o usuário: erros de envio (tamanho, formato, quantidade) vêm do
// servidor ou do Cloudinary com um texto claro; os demais usam a mensagem padrão
export function mensagemDeErro(error, padrao) {
  if (error.envioVideo) {
    return `Não foi possível enviar o vídeo (${error.message}). Verifique o arquivo e tente de novo.`;
  }
  const status = error.response?.status;
  return [400, 413, 415].includes(status) && typeof error.response.data === "string"
    ? error.response.data
    : padrao;
}
