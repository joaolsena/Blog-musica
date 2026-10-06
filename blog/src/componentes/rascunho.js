// Rascunho do formulário de novo projeto, guardado no aparelho (IndexedDB).
// Diferente do localStorage, o IndexedDB guarda arquivos: assim as fotos e vídeos
// escolhidos também voltam se a página recarregar ou a bateria acabar.
// Sem IndexedDB (navegação privada em alguns navegadores), tudo segue sem rascunho.

const BANCO = "ensine-musica";
const LOJA = "rascunhos";
const CHAVE = "novo-projeto";

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA);
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function operar(modo, acao) {
  const banco = await abrirBanco();
  return new Promise((resolve, reject) => {
    const transacao = banco.transaction(LOJA, modo);
    const pedido = acao(transacao.objectStore(LOJA));
    transacao.oncomplete = () => {
      banco.close();
      resolve(pedido.result);
    };
    transacao.onerror = () => {
      banco.close();
      reject(transacao.error);
    };
  });
}

// { campos, imagemPrincipal, imagensPasso, videos, salvoEm } ou null
export async function lerRascunho() {
  try {
    return (await operar("readonly", (loja) => loja.get(CHAVE))) || null;
  } catch {
    return null;
  }
}

// Retorna o horário salvo (ou null se não deu para salvar)
export async function salvarRascunho(dados) {
  const salvoEm = Date.now();
  try {
    await operar("readwrite", (loja) => loja.put({ ...dados, salvoEm }, CHAVE));
    return salvoEm;
  } catch {
    // Sem espaço para os arquivos: guarda ao menos os textos e os links
    try {
      const semArquivos = {
        ...dados,
        imagemPrincipal: [],
        imagensPasso: [],
        videos: dados.videos.filter((item) => item.tipo !== "arquivo"),
      };
      await operar("readwrite", (loja) => loja.put({ ...semArquivos, salvoEm }, CHAVE));
      return salvoEm;
    } catch {
      return null;
    }
  }
}

export async function apagarRascunho() {
  try {
    await operar("readwrite", (loja) => loja.delete(CHAVE));
  } catch {
    // nada a apagar
  }
}
