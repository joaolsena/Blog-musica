import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { urlImagem } from "./imagens";

const DURACAO_SAIDA = 180; // ms — a saída é mais rápida que a entrada

// Visualizador de imagens em tela cheia.
// Abre com fade + leve escala; setas do teclado trocam de imagem sem animação.
// Acessibilidade: enquanto aberto, o resto da página fica inerte (fora do alcance do
// teclado e do leitor de tela), o Tab circula só entre os botões do visualizador e,
// ao fechar, o foco volta para a imagem que foi clicada.
function Lightbox({ imagens, indiceInicial, onClose }) {
  const [indice, setIndice] = useState(indiceInicial);
  const [estado, setEstado] = useState("entrando");
  const dialogoRef = useRef(null);
  const fechandoRef = useRef(false);
  const botaoFecharRef = useRef(null);
  // Quem estava com o foco ao abrir (capturado na primeira renderização)
  const focoAnteriorRef = useRef(document.activeElement);

  const fechar = useCallback(() => {
    if (fechandoRef.current) return;
    fechandoRef.current = true;
    setEstado("saindo");
    window.setTimeout(onClose, DURACAO_SAIDA);
  }, [onClose]);

  const total = imagens.length;
  const anterior = useCallback(() => setIndice((i) => (i - 1 + total) % total), [total]);
  const proxima = useCallback(() => setIndice((i) => (i + 1) % total), [total]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEstado("aberto"));
    return () => cancelAnimationFrame(id);
  }, []);

  // Ao abrir: torna o resto da página inerte e põe o foco no botão Fechar.
  // Ao fechar: desfaz e devolve o foco para quem abriu.
  useEffect(() => {
    const focoAnterior = focoAnteriorRef.current;
    const raiz = document.getElementById("root");
    if (raiz) raiz.inert = true;
    botaoFecharRef.current?.focus({ preventScroll: true });
    return () => {
      if (raiz) raiz.inert = false;
      focoAnterior?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proxima();

      // Mantém o Tab dentro do visualizador
      if (e.key === "Tab" && dialogoRef.current) {
        const botoes = [...dialogoRef.current.querySelectorAll("button")];
        const primeiro = botoes[0];
        const ultimo = botoes[botoes.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [fechar, anterior, proxima]);

  const imagem = imagens[indice];

  return createPortal(
    <div
      ref={dialogoRef}
      className="lightbox"
      data-state={estado}
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de imagens"
      onClick={fechar}
    >
      <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <img src={urlImagem(imagem.src, 2000)} alt={imagem.legenda} />
        {/* aria-live: o leitor de tela anuncia a legenda ao trocar de imagem */}
        <figcaption aria-live="polite">
          {imagem.legenda}
          {total > 1 && (
            <span className="lightbox__count">
              {indice + 1} / {total}
            </span>
          )}
        </figcaption>
      </figure>

      <button
        ref={botaoFecharRef}
        type="button"
        className="lightbox__btn lightbox__close"
        onClick={fechar}
        aria-label="Fechar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            className="lightbox__btn lightbox__prev"
            onClick={(e) => {
              e.stopPropagation();
              anterior();
            }}
            aria-label="Imagem anterior"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="lightbox__btn lightbox__next"
            onClick={(e) => {
              e.stopPropagation();
              proxima();
            }}
            aria-label="Próxima imagem"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

export default Lightbox;
