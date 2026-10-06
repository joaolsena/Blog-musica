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
