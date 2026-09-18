import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Waveform from "./Waveform";
import RevealOnScroll from "./RevealOnScroll";

const FILTROS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "instrumento", rotulo: "Instrumentos" },
  { valor: "jogo", rotulo: "Jogos" },
];

// Converte "DD/MM/AAAA" (formato salvo pelo backend) em Date para ordenação.
// Projetos com data em outro formato ou ausente vão para o fim da lista.
function parseDataBR(data) {
  if (!data) return null;
  const partes = data.split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano) return null;
  return new Date(ano, mes - 1, dia);
}

function truncar(texto, tamanho) {
  if (!texto) return "";
  if (texto.length <= tamanho) return texto;
  return `${texto.slice(0, tamanho).trim()}…`;
}

function Projetos() {
  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  // Carregar projetos ao montar o componente
  useEffect(() => {
    axios
      .get("/projetos")
      .then((response) => {
        const projetosComIdString = response.data.map((projeto) => ({
          ...projeto,
          id: projeto._id, // Caso o backend use MongoDB, converte o ID
        }));

        // Mais recentes primeiro; sem data válida vai para o final
        projetosComIdString.sort((a, b) => {
          const dataA = parseDataBR(a.data);
          const dataB = parseDataBR(b.data);
          if (dataA && dataB) return dataB - dataA;
          if (dataA) return -1;
          if (dataB) return 1;
          return a.titulo.localeCompare(b.titulo);
        });

        setProjetos(projetosComIdString);
        setErro(null);
      })
      .catch((error) => {
        console.error("Erro ao carregar projetos:", error);
        setErro("Não foi possível carregar os projetos agora. Tente novamente em instantes.");
      })
      .finally(() => setCarregando(false));
  }, []);

  const projetosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return projetos.filter((projeto) => {
      const combinaFiltro = filtro === "todos" || projeto.tipoProjeto === filtro;
      const combinaBusca =
        !termo ||
        projeto.titulo?.toLowerCase().includes(termo) ||
        projeto.autor?.toLowerCase().includes(termo);
      return combinaFiltro && combinaBusca;
    });
  }, [projetos, busca, filtro]);

  // O destaque só aparece na visão padrão (sem busca e sem filtro ativo),
  // para não duplicar o mesmo card quando a lista já está filtrada.
  const mostrarDestaque = !busca && filtro === "todos" && projetosFiltrados.length > 0;
  const destaque = mostrarDestaque ? projetosFiltrados[0] : null;
  const restante = mostrarDestaque ? projetosFiltrados.slice(1) : projetosFiltrados;

  return (
    <div className="container">
      <div className="page-heading">
        <h1>Projetos</h1>
        <Waveform />
        <p>Instrumentos e jogos musicais desenvolvidos pelos alunos, prontos para inspirar sua próxima aula.</p>
      </div>

      <div className="projetos-toolbar">
        <div className="filtro-pills" role="group" aria-label="Filtrar por tipo de projeto">
          {FILTROS.map((item) => (
            <button
              key={item.valor}
              type="button"
              className={`filtro-pill${filtro === item.valor ? " is-active" : ""}`}
              data-tipo={item.valor}
              onClick={() => setFiltro(item.valor)}
              aria-pressed={filtro === item.valor}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        <div className="search-field">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <label htmlFor="busca-projetos" className="sr-only">
            Buscar projetos por título ou autor
          </label>
          <input
            id="busca-projetos"
            type="text"
            placeholder="Buscar por título ou autor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {!carregando && !erro && (
        <p className="projetos-toolbar__count">
          {projetosFiltrados.length} {projetosFiltrados.length === 1 ? "projeto encontrado" : "projetos encontrados"}
        </p>
      )}

      {carregando && (
        <div className="loader-vinil" role="status" aria-live="polite">
          <div className="loader-vinil__equalizer">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>Afinando os instrumentos...</p>
        </div>
      )}

      {!carregando && erro && <p className="state-message">{erro}</p>}

      {!carregando && !erro && projetosFiltrados.length === 0 && (
        <p className="state-message">
          {busca || filtro !== "todos"
            ? "Nenhum projeto encontrado por aqui. Que tal tentar outro termo ou categoria?"
            : "Ainda não há projetos publicados. Volte em breve!"}
        </p>
      )}

      {!carregando && !erro && destaque && (
        <RevealOnScroll as="section" className="featured" aria-label="Projeto em destaque">
          <Link to={`/projeto/${destaque.id}`} className="featured__card">
            <div className="featured__media">
              {destaque.imagem && (
                <img src={destaque.imagem} alt={destaque.titulo} loading="lazy" />
              )}
              <span className="featured__ribbon">Em destaque</span>
              <svg className="featured__vinil" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="48" fill="#161010" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#332720" strokeWidth="1.4" />
                <circle cx="50" cy="50" r="28" fill="none" stroke="#332720" strokeWidth="1.4" />
                <circle cx="50" cy="50" r="18" fill="none" stroke="#332720" strokeWidth="1.4" />
                <circle cx="50" cy="50" r="7" fill="var(--color-accent)" />
              </svg>
            </div>
            <div className="featured__body">
              {destaque.tipoProjeto && (
                <span className={`badge badge--${destaque.tipoProjeto}`}>
                  {destaque.tipoProjeto === "jogo" ? "Jogo" : "Instrumento"}
                </span>
              )}
              <h2>{destaque.titulo}</h2>
              {destaque.descricaoGeral && <p>{truncar(destaque.descricaoGeral, 160)}</p>}
              <span className="featured__meta">
                Por {destaque.autor} • {destaque.data}
              </span>
              <span className="featured__cta">Explorar projeto →</span>
            </div>
          </Link>
        </RevealOnScroll>
      )}

      {!carregando && !erro && restante.length > 0 && (
        <>
          {mostrarDestaque && <h2 className="secao-titulo">Mais projetos</h2>}
          <div className="lista-projetos">
            {restante.map((projeto, index) => (
              <RevealOnScroll
                as="article"
                key={projeto.id}
                delay={Math.min(index, 5) * 60}
                className={`trabalho${projeto.tipoProjeto === "jogo" ? " trabalho--jogo" : ""}`}
              >
                {projeto.imagem && (
                  <Link to={`/projeto/${projeto.id}`} className="trabalho__media">
                    <img src={projeto.imagem} alt={projeto.titulo} loading="lazy" />
                    <span className="trabalho__overlay" aria-hidden="true">
                      <span className="play-badge">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                      <span className="equalizer">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    </span>
                  </Link>
                )}
                <div className="trabalho__body">
                  {projeto.tipoProjeto && (
                    <span className={`badge badge--${projeto.tipoProjeto}`}>
                      {projeto.tipoProjeto === "jogo" ? "Jogo" : "Instrumento"}
                    </span>
                  )}
                  <Link className="titulo-link" to={`/projeto/${projeto.id}`}>
                    <h3>{projeto.titulo}</h3>
                  </Link>
                  {projeto.descricaoGeral && (
                    <p className="trabalho__resumo">{truncar(projeto.descricaoGeral, 90)}</p>
                  )}
                  <span className="trabalho__meta">
                    Por {projeto.autor} • {projeto.data}
                  </span>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Projetos;
