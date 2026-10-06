import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const DURACAO_SAIDA = 180; // ms — a saída é mais rápida que a entrada

// Visualizador de imagens em tela cheia.
// Abre com fade + leve escala; setas do teclado trocam de imagem sem animação.
function Lightbox({ imagens, indiceInicial, onClose }) {
  const [indice, setIndice] = useState(indiceInicial);
  const [estado, setEstado] = useState("entrando");

  const fechar = useCallback(() => {
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

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proxima();
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
      className="lightbox"
      data-state={estado}
      role="dialog"
      aria-modal="true"
      aria-label={imagem.legenda}
      onClick={fechar}
    >
      <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <img src={imagem.src} alt={imagem.legenda} />
        <figcaption>
          {imagem.legenda}
          {total > 1 && (
            <span className="lightbox__count">
              {indice + 1} / {total}
            </span>
          )}
        </figcaption>
      </figure>

      <button type="button" className="lightbox__btn lightbox__close" onClick={fechar} aria-label="Fechar" autoFocus>
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
