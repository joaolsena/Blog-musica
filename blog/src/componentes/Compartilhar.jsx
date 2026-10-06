import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

// Endereços de compartilhamento de cada rede
export function linksDeCompartilhamento({ titulo, url }) {
  const texto = `${titulo} — Ensine Música`;
  const e = encodeURIComponent;
  return {
    whatsapp: `https://wa.me/?text=${e(`${texto}\n${url}`)}`,
    telegram: `https://t.me/share/url?url=${e(url)}&text=${e(texto)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
    email: `mailto:?subject=${e(texto)}&body=${e(`Olha este projeto do Ensine Música:\n${url}`)}`,
  };
}

// No celular, o menu nativo do aparelho (com todos os apps instalados) é a melhor opção
const usarMenuNativo = () =>
  typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegadores antigos ou sem permissão: cópia pelo método clássico
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    const copiou = document.execCommand("copy");
    campo.remove();
    return copiou;
  }
}

const IconeCompartilhar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3v12M7 8l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 13v5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconeWhatsapp = ({ tamanho = 18 }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c.6.3 1.1.4 1.5.5a3.6 3.6 0 0 0 1.7.1 2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
  </svg>
);

const OPCOES = [
  {
    chave: "whatsapp",
    rotulo: "WhatsApp",
    cor: "#25d366",
    icone: <IconeWhatsapp />,
  },
  {
    chave: "telegram",
    rotulo: "Telegram",
    cor: "#229ed9",
    icone: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.4 4.2 2.9 11.3c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.4.8.8.8s.6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.3-1.6zM8.6 13.8l9.5-6c.4-.3.8-.1.5.2l-8 7.3-.3 3.3z" />
      </svg>
    ),
  },
  {
    chave: "facebook",
    rotulo: "Facebook",
    cor: "#1877f2",
    icone: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2A21 21 0 0 0 14.6 2C12.2 2 10.5 3.5 10.5 6.2v2.3H8V12h2.5v10H14V12h2.6l.4-3.5z" />
      </svg>
    ),
  },
  {
    chave: "email",
    rotulo: "E-mail",
    cor: "#6b6258",
    icone: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// Botão "Compartilhar": menu nativo no celular; no computador, um menu com as redes e "Copiar link"
// alinhar: "inicio" ou "fim" (lado em que o menu se alinha ao botão); abrirPara: "baixo" ou "cima"
export function BotaoCompartilhar({ titulo, variante = "ghost", alinhar = "inicio", abrirPara = "baixo", rotulo = "Compartilhar" }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const raizRef = useRef(null);
  const botaoRef = useRef(null);
  const menuId = useId();
  const url = window.location.href;
  const links = linksDeCompartilhamento({ titulo, url });

  const fechar = useCallback((devolverFoco = false) => {
    setAberto(false);
    if (devolverFoco) botaoRef.current?.focus();
  }, []);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicarFora = (e) => !raizRef.current?.contains(e.target) && fechar();
    const aoTeclar = (e) => e.key === "Escape" && fechar(true);
    document.addEventListener("pointerdown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    // Foco no primeiro item, para quem navega pelo teclado
    raizRef.current?.querySelector(".compartilhar__item")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, fechar]);

  const aoClicar = async () => {
    if (usarMenuNativo()) {
      try {
        await navigator.share({ title: titulo, text: `${titulo} — Ensine Música`, url });
        return;
      } catch (erro) {
        if (erro.name === "AbortError") return; // a pessoa fechou o menu nativo
        // outro erro: cai no menu do site
      }
    }
    setAberto((valor) => !valor);
  };

  const copiarLink = async () => {
    if (await copiarTexto(url)) {
      setCopiado(true);
      toast.success("Link copiado!");
      window.setTimeout(() => {
        setCopiado(false);
        fechar(true);
      }, 1200);
    } else {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <div className="compartilhar" ref={raizRef} data-alinhar={alinhar} data-abrir={abrirPara}>
      <button
        ref={botaoRef}
        type="button"
        className={`btn btn--${variante} compartilhar__botao`}
        onClick={aoClicar}
        aria-expanded={aberto}
        aria-controls={menuId}
      >
        <IconeCompartilhar />
        {rotulo}
      </button>

      <div id={menuId} className="compartilhar__menu" data-aberto={aberto} inert={aberto ? undefined : ""}>
        <p className="compartilhar__titulo">Compartilhar projeto</p>
        <ul>
          {OPCOES.map((opcao) => (
            <li key={opcao.chave}>
              <a
                className="compartilhar__item"
                href={links[opcao.chave]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => fechar()}
              >
                <span className="compartilhar__icone" style={{ "--cor": opcao.cor }}>
                  {opcao.icone}
                </span>
                {opcao.rotulo}
              </a>
            </li>
          ))}
          <li>
            <button type="button" className="compartilhar__item" onClick={copiarLink}>
              <span className="compartilhar__icone compartilhar__icone--copiar" data-copiado={copiado}>
                <svg className="compartilhar__copiar" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <svg className="compartilhar__ok" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span aria-live="polite">{copiado ? "Link copiado!" : "Copiar link"}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Convite no fim da página do projeto: WhatsApp em destaque + demais opções
export function ConviteCompartilhar({ titulo }) {
  const { whatsapp } = linksDeCompartilhamento({ titulo, url: window.location.href });
  return (
    <aside className="convite">
      <div className="convite__texto">
        <p className="eyebrow">Gostou deste projeto?</p>
        <h2>Compartilhe com outros professores</h2>
      </div>
      <div className="convite__acoes">
        <a className="btn btn--whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
          <IconeWhatsapp />
          Enviar no WhatsApp
        </a>
        <BotaoCompartilhar titulo={titulo} alinhar="fim" abrirPara="cima" rotulo="Outras opções" />
      </div>
    </aside>
  );
}
