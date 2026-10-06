import axios from "axios";
import { toast } from "sonner";

// Regras de envio de imagens, compartilhadas pelos formulários de adicionar e editar.
// Os valores devem bater com o servidor (server.js).

// Limite de upload.array() no servidor
export const LIMITE_IMAGENS_PASSO = 4;

// Formatos aceitos pelo Cloudinary no servidor (allowed_formats)
export const FORMATOS_ACEITOS = "image/jpeg,image/png";

// TAMANHO_MAXIMO_IMAGEM no servidor (limite do plano gratuito do Cloudinary)
export const TAMANHO_MAXIMO_MB = 10;

// Avisa e retorna false se algum arquivo passar do tamanho máximo
export function tamanhosValidos(arquivos) {
  const grande = arquivos.find((arquivo) => arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024);
  if (grande) {
    toast.error(
      `"${grande.name}" tem ${(grande.size / 1024 / 1024).toFixed(1)} MB. O limite é ${TAMANHO_MAXIMO_MB} MB por imagem.`
    );
    return false;
  }
  return true;
}

// Apaga do Cloudinary imagens enviadas cujo projeto não chegou a ser salvo
export function removerImagens(urls) {
  if (urls.length === 0) return;
  axios
    .post("/imagens/remover", { urls })
    .catch((erroLimpeza) => console.error("Erro ao remover imagens enviadas:", erroLimpeza));
}

// Envia a imagem principal (opcional) e as do passo a passo.
// Retorna { urlPrincipal, urlsPassos, enviadas }. Se algum envio falhar, apaga o
// que já tinha subido e relança o erro.
export async function enviarImagens({ principal = null, passos = [] }) {
  const enviadas = [];
  try {
    let urlPrincipal = null;
    if (principal) {
      const formData = new FormData();
      formData.append("imagem", principal);
      const { data } = await axios.post("/upload", formData);
      urlPrincipal = data.url;
      enviadas.push(urlPrincipal);
    }

    let urlsPassos = [];
    if (passos.length > 0) {
      const formData = new FormData();
      passos.forEach((arquivo) => formData.append("imagensPassoAPasso", arquivo));
      const { data } = await axios.post("/upload-multiplas", formData);
      urlsPassos = data.urls || [];
      enviadas.push(...urlsPassos);
    }

    return { urlPrincipal, urlsPassos, enviadas };
  } catch (error) {
    removerImagens(enviadas);
    throw error;
  }
}

// Mensagem para o usuário: erros de imagem (tamanho, formato, quantidade) vêm do
// servidor com um texto claro; os demais usam a mensagem padrão
export function mensagemDeErro(error, padrao) {
  const status = error.response?.status;
  return [400, 413, 415].includes(status) && typeof error.response.data === "string"
    ? error.response.data
    : padrao;
}
