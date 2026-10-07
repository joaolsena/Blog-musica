// Projetos guardados no aparelho da pessoa: ao abrir o site (ou o app instalado),
// a última versão vista aparece na hora enquanto o servidor responde, e continua
// disponível sem internet. Fica no localStorage, que pode não existir (navegação
// privada, armazenamento bloqueado): nesse caso tudo funciona, só sem a memória.

const CHAVE = "ensine-musica:projetos";

function ler() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE));
    return dados && Array.isArray(dados.projetos) ? dados : null;
  } catch {
    return null;
  }
}

function gravar(projetos, salvoEm = Date.now()) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ salvoEm, projetos }));
  } catch {
    // sem espaço ou sem armazenamento: segue sem guardar
  }
}

// { projetos, salvoEm } da última lista recebida, ou null
export function lerProjetosSalvos() {
  return ler();
}

export function salvarProjetos(projetos) {
  gravar(projetos);
}

// { projeto, salvoEm } de um projeto já visto, ou null
export function lerProjetoSalvo(id) {
  const dados = ler();
  const projeto = dados?.projetos.find((p) => p._id === id);
  return projeto ? { projeto, salvoEm: dados.salvoEm } : null;
}

// Atualiza um projeto aberto (ou o acrescenta, se a lista ainda não o tinha)
export function salvarProjeto(projeto) {
  const dados = ler() || { projetos: [], salvoEm: Date.now() };
  const outros = dados.projetos.filter((p) => p._id !== projeto._id);
  gravar([...outros, projeto], dados.salvoEm);
}

// Tira um projeto apagado ou editado, para não aparecer a versão antiga
export function esquecerProjeto(id) {
  const dados = ler();
  if (dados) gravar(dados.projetos.filter((p) => p._id !== id), dados.salvoEm);
}

// "às 18:30" (hoje) ou "em 6 de out." (outro dia)
export function quandoFoiSalvo(salvoEm, agora = new Date()) {
  const data = new Date(salvoEm);
  if (data.toDateString() === agora.toDateString()) {
    return `às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data)}`;
  }
  return `em ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(data)}`;
}

// **Planos de aula, fórum e comentários** guardados do mesmo jeito: a última versão vista
// aparece na hora (e sem internet) enquanto o servidor responde.

// Uma lista inteira (planos, tópicos do fórum): { dados, salvoEm } ou null
export function lerGuardado(chave) {
  try {
    const guardado = JSON.parse(localStorage.getItem(chave));
    return guardado && guardado.dados !== undefined ? guardado : null;
  } catch {
    return null;
  }
}

export function guardar(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify({ dados, salvoEm: Date.now() }));
  } catch {
    // sem espaço ou sem armazenamento: segue sem guardar
  }
}

// Itens abertos um a um (um plano, um tópico, os comentários de uma página). Guarda só os
// mais recentes, para não encher o armazenamento do aparelho.
const LIMITE_ITENS = 30;

export function lerItemGuardado(chave, id) {
  const item = lerGuardado(chave)?.dados?.[id];
  return item ? { dados: item.dados, salvoEm: item.salvoEm } : null;
}

export function guardarItem(chave, id, dados) {
  const itens = { ...(lerGuardado(chave)?.dados || {}), [id]: { dados, salvoEm: Date.now() } };
  const recentes = Object.entries(itens)
    .sort(([, a], [, b]) => b.salvoEm - a.salvoEm)
    .slice(0, LIMITE_ITENS);
  guardar(chave, Object.fromEntries(recentes));
}

export function esquecerItem(chave, id) {
  const itens = lerGuardado(chave)?.dados;
  if (!itens?.[id]) return;
  guardar(chave, Object.fromEntries(Object.entries(itens).filter(([chaveItem]) => chaveItem !== id)));
}

export const MEMORIA = {
  planos: "ensine-musica:planos",
  planosAbertos: "ensine-musica:planos-abertos",
  forum: "ensine-musica:forum",
  topicosAbertos: "ensine-musica:topicos-abertos",
  comentarios: "ensine-musica:comentarios",
};
