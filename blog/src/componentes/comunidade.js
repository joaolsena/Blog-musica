// Ajudas da área de participação do público (comentários e fórum).
// O nome de quem comenta e as mensagens que ainda esperam aprovação ficam só neste aparelho.

const CHAVE_NOME = "ensine-musica:nome-visitante";
const CHAVE_PENDENTES = "ensine-musica:pendentes";
const VALIDADE_PENDENTE_MS = 14 * 24 * 60 * 60 * 1000; // depois disso, some da tela de quem enviou

export const LIMITE_NOME = 60;
export const LIMITE_COMENTARIO = 2000;
export const LIMITE_TITULO_TOPICO = 140;
export const LIMITE_TEXTO_TOPICO = 5000;

function ler(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem armazenamento (aba anônima, cota cheia): só não lembra
  }
}

export const lerNomeVisitante = () => ler(CHAVE_NOME, "");
export const lembrarNomeVisitante = (nome) => gravar(CHAVE_NOME, nome.trim());

// Mensagens enviadas daqui que ainda esperam aprovação, por lugar ("projeto:<id>", "forum")
function pendentesValidos() {
  const agora = Date.now();
  return ler(CHAVE_PENDENTES, []).filter((p) => p && agora - p.enviadoEm < VALIDADE_PENDENTE_MS);
}

export const lerPendentes = (lugar) => pendentesValidos().filter((p) => p.lugar === lugar).map((p) => p.mensagem);

export function guardarPendente(lugar, mensagem) {
  gravar(CHAVE_PENDENTES, [...pendentesValidos(), { lugar, mensagem, enviadoEm: Date.now() }]);
}

// Tira da lista local as que já foram aprovadas (aparecem pelo servidor)
export function esquecerPendentes(idsPublicados) {
  const publicados = new Set(idsPublicados.map(String));
  gravar(
    CHAVE_PENDENTES,
    pendentesValidos().filter((p) => !publicados.has(String(p.mensagem._id)))
  );
}

// "agora", "há 5 minutos", "ontem", "12 de out. de 2026"
const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
export function quando(data, agora = new Date()) {
  const momento = new Date(data);
  if (Number.isNaN(momento.getTime())) return "";
  const segundos = Math.round((agora - momento) / 1000);
  if (segundos < 60) return "agora";
  if (segundos < 3600) return relativo.format(-Math.floor(segundos / 60), "minute");
  if (segundos < 86400) return relativo.format(-Math.floor(segundos / 3600), "hour");
  if (segundos < 7 * 86400) return relativo.format(-Math.floor(segundos / 86400), "day");
  return momento.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: momento.getFullYear() === agora.getFullYear() ? undefined : "numeric",
  });
}

export const mensagemDoErro = (error, padrao) =>
  typeof error?.response?.data === "string" && error.response.status < 500 ? error.response.data : padrao;
