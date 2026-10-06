import React, { useCallback, useEffect, useRef, useState } from "react";
import { quandoFoiSalvo } from "./memoria";

// Aviso discreto no topo enquanto a página mostra a versão guardada no aparelho e
// busca a mais nova no servidor: "Sincronizando…" → "Tudo atualizado" (some sozinho),
// ou "Sem conexão" com a data da versão mostrada e um botão para tentar de novo.

const ESPERA_PARA_MOSTRAR_MS = 300; // respostas rápidas não fazem o aviso piscar
const TEMPO_ATUALIZADO_MS = 1800;

export function useSincronia() {
  const [estado, setEstado] = useState(null);
  const temporizador = useRef(null);
  const apareceu = useRef(false);

  const limpar = () => clearTimeout(temporizador.current);
  useEffect(() => limpar, []);

  const iniciar = useCallback(() => {
    limpar();
    apareceu.current = false;
    temporizador.current = setTimeout(() => {
      apareceu.current = true;
      setEstado("sincronizando");
    }, ESPERA_PARA_MOSTRAR_MS);
  }, []);

  const concluir = useCallback((deuCerto) => {
    limpar();
    if (!deuCerto) {
      setEstado("offline");
      return;
    }
    if (!apareceu.current) {
      setEstado(null);
      return;
    }
    setEstado("atualizado");
    temporizador.current = setTimeout(() => setEstado(null), TEMPO_ATUALIZADO_MS);
  }, []);

  return { estado, iniciar, concluir };
}

const Giro = () => <span className="sincronia__giro" aria-hidden="true" />;

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const SemSinal = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M2.5 8.5a14 14 0 0 1 4.2-2.6M10.5 4.6A14 14 0 0 1 21.5 8.5M5.5 12a9 9 0 0 1 3.6-2M14.6 9.6a9 9 0 0 1 3.9 2.4M8.8 15.4a4.5 4.5 0 0 1 6.4 0" />
    <circle cx="12" cy="19" r="0.9" fill="currentColor" />
    <path d="m3 3 18 18" />
  </svg>
);

export function AvisoSincronia({ estado, salvoEm, aoTentarDeNovo }) {
  // Mantém o último conteúdo durante a animação de saída
  const [mostrado, setMostrado] = useState(estado);
  useEffect(() => {
    if (estado) setMostrado(estado);
  }, [estado]);

  const visivel = Boolean(estado);

  return (
    <div
      className="sincronia"
      data-estado={mostrado || undefined}
      data-visivel={visivel}
      role="status"
      aria-live="polite"
      inert={visivel ? undefined : ""}
    >
      {mostrado === "sincronizando" && (
        <>
          <Giro />
          Sincronizando…
        </>
      )}
      {mostrado === "atualizado" && (
        <>
          <Check />
          Tudo atualizado
        </>
      )}
      {mostrado === "offline" && (
        <>
          <SemSinal />
          <span>
            Sem conexão{salvoEm ? <> · salvo {quandoFoiSalvo(salvoEm)}</> : null}
          </span>
          {aoTentarDeNovo && (
            <button type="button" className="sincronia__tentar" onClick={aoTentarDeNovo}>
              Tentar de novo
            </button>
          )}
        </>
      )}
    </div>
  );
}
