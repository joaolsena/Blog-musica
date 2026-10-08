import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  abrirConviteDoNavegador,
  detectarPlataforma,
  podeInstalar,
  useInstalacao,
} from "./instalacao";

// Botão discreto "Instalar o app" (cabeçalho e rodapé) e o painel com o passo a passo.
// Onde o navegador permite (Chrome e Edge), o botão abre direto a janela de instalação
// do sistema; nos outros (Safari no iPhone, iPad e Mac, Samsung, Firefox no Android),
// abre o painel explicando como adicionar o app à tela inicial ou ao Dock.

const DURACAO_SAIDA_MS = 220;

const Icone = ({ children, tamanho = 20 }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const IconeBaixar = (props) => (
  <Icone {...props}>
    <path d="M12 4v10.5M7.5 10.5 12 15l4.5-4.5" />
    <path d="M5 16.5v1.5A2 2 0 0 0 7 20h10a2 2 0 0 0 2-2v-1.5" />
  </Icone>
);
const IconeCompartilhar = () => (
  <Icone>
    <path d="M12 3.5v11M8 7.5l4-4 4 4" />
    <path d="M8.5 10.5H7A2 2 0 0 0 5 12.5v6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5" />
  </Icone>
);
const IconeAdicionar = () => (
  <Icone>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8.5v7M8.5 12h7" />
  </Icone>
);
const IconeDock = () => (
  <Icone>
    <rect x="3.5" y="4" width="17" height="12" rx="2" />
    <path d="M7 19.5h10M9.5 16v3.5M14.5 16v3.5" />
  </Icone>
);
const IconeMenuPontos = () => (
  <Icone>
    <circle cx="12" cy="5.5" r="0.6" fill="currentColor" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    <circle cx="12" cy="18.5" r="0.6" fill="currentColor" />
  </Icone>
);
const IconeMenuLinhas = () => (
  <Icone>
    <path d="M5 7h14M5 12h14M5 17h14" />
  </Icone>
);
const IconeInstalarPc = () => (
  <Icone>
    <rect x="3.5" y="4.5" width="17" height="11.5" rx="2" />
    <path d="M12 7.5v5M9.8 10.5 12 12.7l2.2-2.2M8.5 19.5h7" />
  </Icone>
);
const IconeOk = () => (
  <Icone>
    <path d="m5.5 12.5 4 4 9-9" />
  </Icone>
);

// Passo a passo para cada aparelho/navegador
export function instrucoes({ sistema, navegador }) {
  if (sistema === "iphone" || sistema === "ipad") {
    return {
      onde: sistema === "ipad" ? "no seu iPad" : "no seu iPhone",
      passos: [
        [IconeCompartilhar, navegador === "safari"
          ? <>Toque em <b>Compartilhar</b>, na barra do Safari ou no menu <b>•••</b></>
          : <>Toque em <b>Compartilhar</b>, no menu do navegador</>],
        [IconeAdicionar, <>Escolha <b>Adicionar à Tela de Início</b></>],
        [IconeOk, <>Toque em <b>Adicionar</b>. O ícone aparece na sua tela inicial</>],
      ],
    };
  }
  if (sistema === "mac" && navegador === "safari") {
    return {
      onde: "no seu Mac",
      passos: [
        [IconeCompartilhar, <>Clique em <b>Compartilhar</b> na barra do Safari (ou no menu <b>Arquivo</b>)</>],
        [IconeDock, <>Escolha <b>Adicionar ao Dock</b></>],
        [IconeOk, <>Clique em <b>Adicionar</b>. O app fica no Dock e no Launchpad</>],
      ],
    };
  }
  if (sistema === "android") {
    return {
      onde: "no seu celular",
      passos: navegador === "samsung"
        ? [
            [IconeMenuLinhas, <>Toque no menu <b>≡</b> do navegador</>],
            [IconeAdicionar, <>Escolha <b>Adicionar página a</b> › <b>Tela inicial</b></>],
            [IconeOk, <>Confirme em <b>Adicionar</b></>],
          ]
        : [
            [IconeMenuPontos, <>Toque no menu <b>⋮</b> do navegador</>],
            [IconeAdicionar, <>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></>],
            [IconeOk, <>Confirme em <b>Instalar</b></>],
          ],
    };
  }
  const onde = sistema === "mac" ? "no seu Mac" : "no seu computador";
  if (navegador === "edge") {
    return {
      onde,
      passos: [
        [IconeMenuPontos, <>Clique no menu <b>…</b> do Edge</>],
        [IconeInstalarPc, <>Escolha <b>Aplicativos</b> › <b>Instalar este site como um aplicativo</b></>],
        [IconeOk, <>Clique em <b>Instalar</b></>],
      ],
    };
  }
  return {
    onde,
    passos: [
      [IconeInstalarPc, <>Clique no ícone de <b>instalar</b>, à direita da barra de endereço</>],
      [IconeMenuPontos, <>Ou abra o menu <b>⋮</b> › <b>Transmitir, salvar e compartilhar</b> › <b>Instalar página como app</b></>],
      [IconeOk, <>Clique em <b>Instalar</b></>],
    ],
  };
}

function PainelInstalar({ plataforma, aoFechar }) {
  const dialogo = useRef(null);
  const [estado, setEstado] = useState("entrando");
  const { onde, passos } = instrucoes(plataforma);
  const noComputador = !plataforma.movel;

  // Abre como modal (prende o foco e bloqueia a página atrás) e anima a entrada
  useEffect(() => {
    const el = dialogo.current;
    if (el.showModal) el.showModal();
    else el.setAttribute("open", "");
    const quadro = requestAnimationFrame(() => requestAnimationFrame(() => setEstado("aberto")));
    document.body.style.overflow = "hidden"; // no iPhone a página atrás rolaria junto
    return () => {
      cancelAnimationFrame(quadro);
      document.body.style.overflow = "";
    };
  }, []);

  const fechar = () => {
    if (estado === "saindo") return;
    setEstado("saindo");
    setTimeout(() => {
      dialogo.current?.close?.();
      aoFechar();
    }, DURACAO_SAIDA_MS);
  };

  return (
    <dialog
      ref={dialogo}
      className="instalar"
      data-estado={estado}
      aria-labelledby="instalar-titulo"
      aria-describedby="instalar-descricao"
      onCancel={(e) => {
        e.preventDefault(); // Esc: fecha com animação
        fechar();
      }}
      onClick={(e) => e.target === e.currentTarget && fechar()}
    >
      <div className="instalar__painel">
        <span className="instalar__alca" aria-hidden="true" />
        <div className="instalar__topo">
          <img className="instalar__icone" src="/app/icon-192.png" width="64" height="64" alt="" />
          <div>
            <h2 id="instalar-titulo" className="instalar__titulo">Ensine Música</h2>
            <p id="instalar-descricao" className="instalar__subtitulo">Instale o app {onde}</p>
          </div>
        </div>

        <ul className="instalar__vantagens">
          <li>{noComputador ? "Abre em uma janela própria" : "Abre direto da tela inicial"}</li>
          <li>{noComputador ? "Sem abas nem barra do navegador" : "Tela cheia, sem a barra do navegador"}</li>
          <li>Leve: não ocupa espaço como um app de loja</li>
        </ul>

        <ol className="instalar__passos">
          {passos.map(([IconePasso, texto], indice) => (
            <li key={indice} className="instalar__passo">
              <span className="instalar__num" aria-hidden="true">{indice + 1}</span>
              <span className="instalar__passo-icone"><IconePasso /></span>
              <span className="instalar__passo-texto">{texto}</span>
            </li>
          ))}
        </ol>

        <button type="button" className="btn btn--primary instalar__ok" onClick={fechar}>
          Entendi
        </button>
      </div>
    </dialog>
  );
}

// variante "icone": botão redondo do cabeçalho; "link": texto discreto do rodapé;
// "menu": item do menu do celular (só aparece em telas estreitas, onde o ícone não cabe)
export function BotaoInstalar({ variante = "icone" }) {
  const { temConvite, instalado } = useInstalacao();
  const plataforma = useMemo(() => detectarPlataforma(), []);
  const [painelAberto, setPainelAberto] = useState(false);
  const botao = useRef(null);
  const instaladoAntes = useRef(instalado);

  // Aviso quando a instalação termina (só o botão do cabeçalho avisa, para não repetir)
  useEffect(() => {
    if (variante === "icone" && instalado && !instaladoAntes.current) {
      toast.success("Pronto! O Ensine Música foi instalado.");
    }
    instaladoAntes.current = instalado;
  }, [instalado, variante]);

  if (instalado || !podeInstalar(plataforma)) return null;

  const instalar = async () => {
    if (temConvite) {
      await abrirConviteDoNavegador();
      return;
    }
    setPainelAberto(true);
  };

  const fecharPainel = () => {
    setPainelAberto(false);
    botao.current?.focus();
  };

  return (
    <>
      {variante === "icone" ? (
        <button
          ref={botao}
          type="button"
          className="botao-instalar"
          onClick={instalar}
          aria-label="Instalar o app"
          title="Instalar o app"
        >
          <IconeBaixar />
        </button>
      ) : variante === "menu" ? (
        <button ref={botao} type="button" className="menu-painel__link menu-painel__instalar" onClick={instalar}>
          <span className="menu-painel__icone">
            <IconeBaixar tamanho={20} />
          </span>
          Instalar o app
        </button>
      ) : (
        <button ref={botao} type="button" className="footer__instalar" onClick={instalar}>
          <IconeBaixar tamanho={16} />
          Instalar o app
        </button>
      )}
      {painelAberto && <PainelInstalar plataforma={plataforma} aoFechar={fecharPainel} />}
    </>
  );
}
