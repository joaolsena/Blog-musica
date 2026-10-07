import React, { useState } from "react";
import { toast } from "sonner";

// Botão "Baixar PDF". gerar() monta e entrega o arquivo; o gerador só é carregado
// no primeiro toque (import dinâmico de baixarPdf.js), para não pesar a página.
function BotaoBaixarPdf({ gerar }) {
  const [gerando, setGerando] = useState(false);

  const baixar = async () => {
    setGerando(true);
    try {
      await gerar();
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      toast.error("Não foi possível gerar o PDF agora. Verifique a conexão e tente de novo.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn--ghost compartilhar__botao"
      onClick={baixar}
      disabled={gerando}
      aria-busy={gerando}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
        <path d="M14 3.5v5h5M12 11.5v6M9.5 15l2.5 2.5 2.5-2.5" />
      </svg>
      {gerando ? "Gerando PDF…" : "Baixar PDF"}
    </button>
  );
}

export default BotaoBaixarPdf;
