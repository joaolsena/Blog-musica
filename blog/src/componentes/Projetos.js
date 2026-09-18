import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function Projetos() {
  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");

  // Carregar projetos ao montar o componente
  useEffect(() => {
    axios
      .get("/projetos")
      .then((response) => {
        const projetosComIdString = response.data.map((projeto) => ({
          ...projeto,
          id: projeto._id, // Caso o backend use MongoDB, converte o ID
        }));

        // Ordenar os projetos pelo título em ordem alfabética
        projetosComIdString.sort((a, b) => a.titulo.localeCompare(b.titulo));

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
    if (!termo) return projetos;
    return projetos.filter(
      (projeto) =>
        projeto.titulo?.toLowerCase().includes(termo) ||
        projeto.autor?.toLowerCase().includes(termo)
    );
  }, [projetos, busca]);

  return (
    <div className="container">
      <div className="page-heading">
        <h1>Projetos</h1>
        <hr className="page-heading__rule" />
        <p>Instrumentos e jogos musicais desenvolvidos pelos alunos, prontos para inspirar sua próxima aula.</p>
      </div>

      <div className="projetos-toolbar">
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
        {!carregando && !erro && (
          <span className="projetos-toolbar__count">
            {projetosFiltrados.length} {projetosFiltrados.length === 1 ? "projeto" : "projetos"}
          </span>
        )}
      </div>

      {carregando && (
        <div className="skeleton-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <div className="skeleton-card__media"></div>
              <div className="skeleton-card__lines">
                <div className="skeleton-card__line"></div>
                <div className="skeleton-card__line skeleton-card__line--short"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!carregando && erro && <p className="state-message">{erro}</p>}

      {!carregando && !erro && projetosFiltrados.length === 0 && (
        <p className="state-message">
          {busca
            ? "Nenhum projeto encontrado para essa busca."
            : "Ainda não há projetos publicados. Volte em breve!"}
        </p>
      )}

      {!carregando && !erro && projetosFiltrados.length > 0 && (
        <div className="lista-projetos">
          {projetosFiltrados.map((projeto) => (
            <article
              className={`trabalho${projeto.tipoProjeto === "jogo" ? " trabalho--jogo" : ""}`}
              key={projeto.id}
            >
              {projeto.imagem && (
                <Link to={`/projeto/${projeto.id}`} className="trabalho__media">
                  <img src={projeto.imagem} alt={projeto.titulo} loading="lazy" />
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
                <span className="trabalho__meta">
                  Adicionado por {projeto.autor} em {projeto.data}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projetos;
