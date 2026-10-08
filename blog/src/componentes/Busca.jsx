import React, { Suspense, lazy, useEffect, useState } from "react";

// Busca única do cabeçalho: projetos, planos de aula e fórum num lugar só.
// Abre pela lupa ou pelo teclado (Ctrl+K / ⌘K, ou "/"). O painel vem num arquivo à parte
// (PainelBusca.jsx), baixado na primeira vez que a busca é aberta.

const PainelBusca = lazy(() => import("./PainelBusca"));
const baixarPainel = () => import("./PainelBusca");

const IconeLupa = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);

// Lupa do cabeçalho. Também abre com Ctrl+K / ⌘K, ou com "/" fora de um campo de texto.
export function BotaoBusca() {
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    const aoTeclar = (e) => {
      const digitando = e.target.closest?.("input, textarea, select, [contenteditable='true']");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberta(true);
      } else if (e.key === "/" && !digitando && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setAberta(true);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <>
      <button
        type="button"
        className="botao-instalar botao-busca"
        aria-label="Buscar no site"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K /"
        title="Buscar (Ctrl+K)"
        onClick={() => setAberta(true)}
        // Começa a baixar o painel quando o dedo ou o mouse chega na lupa, antes do clique
        onPointerEnter={baixarPainel}
        onFocus={baixarPainel}
      >
        <IconeLupa />
      </button>
      {aberta && (
        <Suspense fallback={null}>
          <PainelBusca aoFechar={() => setAberta(false)} />
        </Suspense>
      )}
    </>
  );
}
