import React from "react";

// **Tela de erro**: se uma página quebrar, mostra um aviso no lugar dela (o cabeçalho e o
// rodapé continuam) em vez de deixar a tela inteira em branco.
//
// Caso especial: as páginas vêm em arquivos à parte (veja App.jsx). Depois de uma versão
// nova do site ir ao ar, uma aba aberta antes ainda procura os arquivos antigos, que não
// existem mais. Aí basta recarregar para pegar a versão nova, e isso é feito sozinho.

const CHAVE_RECARREGOU = "ensine-musica:recarregou-versao";

// Erro ao baixar o arquivo de uma página (o texto muda de navegador para navegador)
export const ehErroDeArquivo = (erro) =>
  /dynamically imported module|importing a module script failed|unable to preload/i.test(
    String(erro?.message || erro)
  );

// Recarrega uma vez só: se o erro voltar logo depois, mostra o aviso em vez de ficar em loop
function recarregarUmaVez() {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE_RECARREGOU)) || 0;
    if (Date.now() - ultima < 15000) return false;
    sessionStorage.setItem(CHAVE_RECARREGOU, String(Date.now()));
  } catch {
    return false; // sem como lembrar, melhor não arriscar recarregar sem parar
  }
  window.location.reload();
  return true;
}

// Enquanto o arquivo da página chega. Normalmente é instantâneo (vem guardado no aparelho),
// então o indicador só aparece se demorar: assim não pisca na tela.
export function CarregandoPagina() {
  return (
    <div className="carregando-pagina" role="status" aria-label="Carregando página">
      <span />
      <span />
      <span />
    </div>
  );
}

export class LimiteDeErro extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null, recarregando: false };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error("Erro na página:", erro, info?.componentStack);
    if (!ehErroDeArquivo(erro)) return;
    if (navigator.onLine) {
      if (recarregarUmaVez()) this.setState({ recarregando: true });
    } else {
      // Sem internet: quando a conexão voltar, tenta de novo sozinho
      this.aoVoltarInternet = () => window.location.reload();
      window.addEventListener("online", this.aoVoltarInternet, { once: true });
    }
  }

  componentWillUnmount() {
    if (this.aoVoltarInternet) window.removeEventListener("online", this.aoVoltarInternet);
  }

  render() {
    const { erro, recarregando } = this.state;
    if (!erro) return this.props.children;
    if (recarregando) return <CarregandoPagina />;

    const semInternet = ehErroDeArquivo(erro) && !navigator.onLine;
    return (
      <div className="container nao-encontrado erro-pagina" role="alert">
        <p className="eyebrow">{semInternet ? "Sem conexão" : "Erro"}</p>
        <h1>{semInternet ? "Esta página precisa de internet" : "Algo saiu do compasso"}</h1>
        <p className="nao-encontrado__texto">
          {semInternet
            ? "Ela ainda não foi aberta neste aparelho. Ela abre sozinha assim que a internet voltar."
            : "Esta página teve um problema ao abrir. Tente de novo; se continuar, volte para o início."}
        </p>
        <div className="erro-pagina__acoes">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
          {/* Link comum (não do React): recomeça o site do zero */}
          <a href="/" className="btn btn--ghost btn--lg">
            Ir para o início
          </a>
        </div>
      </div>
    );
  }
}
