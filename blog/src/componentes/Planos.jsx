import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import RevealOnScroll from "./RevealOnScroll";
import { MEMORIA, guardar, lerGuardado } from "./memoria";
import { AvisoSincronia, useSincronia } from "./Sincronia";
import { DURACOES, FAIXAS_ETARIAS, linhas } from "./tipos";

// "Fundamental I · 2 aulas"
export function resumoDoPlano(plano) {
  const faixas = FAIXAS_ETARIAS.filter((f) => plano.faixasEtarias?.includes(f.valor)).map((f) => f.curto);
  const duracao = DURACOES.find((d) => d.valor === plano.duracao)?.rotulo;
  return [...faixas, duracao].filter(Boolean).join(" · ");
}

function CartaoPlano({ plano }) {
  const resumo = resumoDoPlano(plano);
  const projetos = (plano.projetos || []).filter(Boolean);
  const etapas = linhas(plano.desenvolvimento).length;
  return (
    <article className="plano-card">
      <Link to={`/plano/${plano._id}`} className="plano-card__link">
        <span className="tag tag--plano">Plano de aula</span>
        <h3 className="plano-card__titulo">{plano.titulo}</h3>
        {plano.resumo && <p className="plano-card__resumo">{plano.resumo}</p>}
        {resumo && <p className="card__ficha">{resumo}</p>}
        {projetos.length > 0 && (
          <p className="plano-card__projetos">
            <span>Usa:</span> {projetos.map((p) => p.titulo).join(", ")}
          </p>
        )}
        <p className="card__meta">
          {plano.autor || plano.publicadoPor}
          {plano.data && <span aria-hidden="true"> · </span>}
          {plano.data}
          {etapas > 0 && (
            <>
              <span aria-hidden="true"> · </span>
              {etapas} {etapas === 1 ? "etapa" : "etapas"}
            </>
          )}
        </p>
      </Link>
    </article>
  );
}

function Planos() {
  const { isAuthenticated } = useAuth();
  // A última lista vista neste aparelho aparece na hora; a do servidor chega depois
  const [salvos] = useState(() => lerGuardado(MEMORIA.planos));
  const [planos, setPlanos] = useState(salvos?.dados ?? null);
  const [salvoEm, setSalvoEm] = useState(salvos?.salvoEm);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState("");
  const [faixa, setFaixa] = useState("");
  const sincronia = useSincronia();
  const { iniciar, concluir } = sincronia;

  const carregar = useCallback(() => {
    setErro(false);
    if (salvos) iniciar();
    axios
      .get("/planos", { timeout: 15000 })
      .then(({ data }) => {
        setPlanos(data);
        guardar(MEMORIA.planos, data);
        setSalvoEm(Date.now());
        if (salvos) concluir(true);
      })
      .catch(() => (salvos ? concluir(false) : setErro(true)));
  }, [salvos, iniciar, concluir]);

  useEffect(() => {
    document.title = "Planos de aula — Ensine Música";
    carregar();
  }, [carregar]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (planos || []).filter(
      (p) =>
        (!faixa || p.faixasEtarias?.includes(faixa)) &&
        (!termo ||
          p.titulo.toLowerCase().includes(termo) ||
          p.resumo?.toLowerCase().includes(termo) ||
          p.projetos?.some((projeto) => projeto?.titulo?.toLowerCase().includes(termo)))
    );
  }, [planos, busca, faixa]);

  return (
    <div className="container pagina-lista">
      <AvisoSincronia estado={sincronia.estado} salvoEm={salvoEm} aoTentarDeNovo={carregar} />
      <header className="pagina-lista__head">
        <p className="eyebrow">Para a sua próxima aula</p>
        <h1 className="pagina-lista__titulo">Planos de aula</h1>
        <p className="pagina-lista__lead">
          Sequências prontas para levar os projetos para a sala: objetivos, etapas com tempo, avaliação e dicas de quem já
          aplicou.
        </p>
        {isAuthenticated && (
          <Link to="/novo-plano" className="btn btn--primary">
            Novo plano de aula
          </Link>
        )}
      </header>

      {planos?.length > 0 && (
        <div className="forum__filtros">
          <div className="chips chips--compactas" role="group" aria-label="Filtrar por turma">
            <button type="button" className="chip" aria-pressed={!faixa} onClick={() => setFaixa("")}>
              Todas as turmas
            </button>
            {FAIXAS_ETARIAS.map((f) => (
              <button
                key={f.valor}
                type="button"
                className="chip"
                aria-pressed={faixa === f.valor}
                onClick={() => setFaixa(faixa === f.valor ? "" : f.valor)}
              >
                {f.curto}
              </button>
            ))}
          </div>
          <div className="search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <label htmlFor="busca-planos" className="sr-only">
              Buscar planos de aula
            </label>
            <input
              id="busca-planos"
              type="search"
              placeholder="Buscar por tema ou projeto"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              enterKeyHint="search"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {erro && (
        <div className="silencio">
          <h2>Fora do tom</h2>
          <p>Não foi possível carregar os planos de aula agora.</p>
          <button type="button" className="btn btn--ghost" onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      )}

      {planos === null && !erro && (
        <div className="planos-grade" role="status" aria-label="Carregando planos de aula">
          {[0, 1, 2].map((i) => (
            <div key={i} className="plano-card" aria-hidden="true">
              <div className="plano-card__link">
                <span className="skeleton skeleton--line" style={{ width: 100 }} />
                <span className="skeleton skeleton--title" />
                <span className="skeleton skeleton--line" />
                <span className="skeleton skeleton--line" style={{ width: "70%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {planos?.length === 0 && (
        <div className="silencio">
          <h2>Silêncio por enquanto</h2>
          <p>Os primeiros planos de aula aparecem aqui em breve.</p>
        </div>
      )}

      {planos?.length > 0 && visiveis.length === 0 && (
        <div className="silencio">
          <h2>Nenhum plano encontrado</h2>
          <p>Tente outra busca ou outra turma.</p>
        </div>
      )}

      {visiveis.length > 0 && (
        <div className="planos-grade">
          {visiveis.map((plano, index) => (
            <RevealOnScroll key={plano._id} delay={(index % 3) * 60}>
              <CartaoPlano plano={plano} />
            </RevealOnScroll>
          ))}
        </div>
      )}
    </div>
  );
}

export default Planos;
