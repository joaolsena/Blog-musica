import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import BotaoBaixarPdf from "./BotaoBaixarPdf";
import Comentarios from "./Comentarios";
import { BotaoCompartilhar } from "./Compartilhar";
import NaoEncontrado from "./NaoEncontrado";
import { urlImagem } from "./imagens";
import { mensagemDoErro } from "./comunidade";
import { resumoDoPlano } from "./Planos";
import { linhas, rotuloTipo } from "./tipos";

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII"];

function VoltarPlanos() {
  return (
    <Link to="/planos" className="back-link">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Todos os planos
    </Link>
  );
}

// Projetos usados na aula, com a capa e um link para o tutorial
function ProjetosDoPlano({ projetos }) {
  return (
    <ul className="plano-projetos">
      {projetos.map((projeto) => (
        <li key={projeto._id}>
          <Link to={`/projeto/${projeto._id}`} className="plano-projeto">
            <span className="plano-projeto__capa">
              {projeto.imagem ? <img src={urlImagem(projeto.imagem, 300)} alt="" loading="lazy" /> : null}
            </span>
            <span className="plano-projeto__texto">
              <span className={`tag tag--${projeto.tipoProjeto}`}>{rotuloTipo(projeto.tipoProjeto)}</span>
              <strong>{projeto.titulo}</strong>
              <span className="plano-projeto__ver">Ver o passo a passo</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PlanoDetalhes() {
  const { id } = useParams();
  const { podeEditar } = useAuth();
  const navigate = useNavigate();
  const [plano, setPlano] = useState(null);
  const [erro, setErro] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    axios
      .get(`/planos/${id}`, { timeout: 15000 })
      .then(({ data }) => setPlano(data))
      .catch((error) => setErro(error.response?.status === 404 ? "nao-encontrado" : "falha"));
  }, [id]);

  useEffect(() => {
    if (!plano) return undefined;
    const anterior = document.title;
    document.title = `${plano.titulo} — Planos de aula — Ensine Música`;
    return () => {
      document.title = anterior;
    };
  }, [plano]);

  const secoes = useMemo(() => {
    if (!plano) return [];
    const projetos = (plano.projetos || []).filter(Boolean);
    return [
      linhas(plano.objetivos).length > 0 && { id: "objetivos", titulo: "Objetivos" },
      (linhas(plano.materiais).length > 0 || projetos.length > 0) && { id: "materiais", titulo: "Materiais e projetos" },
      linhas(plano.desenvolvimento).length > 0 && { id: "desenvolvimento", titulo: "Desenvolvimento" },
      plano.avaliacao && { id: "avaliacao", titulo: "Avaliação" },
      plano.dicas && { id: "dicas", titulo: "Dicas" },
    ].filter(Boolean);
  }, [plano]);

  const apagar = () => {
    if (!window.confirm("Tem certeza que deseja apagar este plano de aula? Esta ação não pode ser desfeita.")) return;
    setExcluindo(true);
    axios
      .delete(`/planos/${id}`)
      .then(() => {
        toast.success("Plano de aula apagado.");
        navigate("/planos");
      })
      .catch((error) => {
        toast.error(mensagemDoErro(error, "Não foi possível apagar o plano de aula."));
        setExcluindo(false);
      });
  };

  if (erro === "nao-encontrado") {
    return <NaoEncontrado titulo="Plano não encontrado" texto="Este plano de aula não existe mais ou o link está incorreto." />;
  }
  if (erro) {
    return (
      <div className="container artigo-estado">
        <h1>Algo saiu do tom</h1>
        <p>Não foi possível carregar este plano agora. Verifique sua conexão e tente de novo.</p>
        <div className="artigo-estado__acoes">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
          <VoltarPlanos />
        </div>
      </div>
    );
  }
  if (!plano) {
    return (
      <div className="container artigo" role="status" aria-label="Carregando plano de aula">
        <div className="artigo__head">
          <span className="skeleton skeleton--line" style={{ width: 120 }} />
          <span className="skeleton skeleton--hero-title" />
          <span className="skeleton skeleton--line" style={{ width: 200 }} />
        </div>
      </div>
    );
  }

  const projetos = (plano.projetos || []).filter(Boolean);
  const resumoFicha = resumoDoPlano(plano);
  const numero = (secaoId) => ROMANOS[secoes.findIndex((s) => s.id === secaoId)];

  return (
    <article className="container artigo">
      <header className="artigo__head">
        <VoltarPlanos />
        <span className="tag tag--plano">Plano de aula</span>
        <h1 className="artigo__title">{plano.titulo}</h1>
        <div className="artigo__meta-linha">
          <p className="artigo__meta">
            Por <strong>{plano.autor || plano.publicadoPor}</strong>
            {plano.data && (
              <>
                <span aria-hidden="true"> · </span>
                {plano.data}
              </>
            )}
          </p>
          <div className="artigo__botoes">
            <BotaoCompartilhar titulo={plano.titulo} />
            <BotaoBaixarPdf
              gerar={async () => {
                const { baixarPdfPlano } = await import("./baixarPdf");
                await baixarPdfPlano(plano, `${window.location.origin}/plano/${plano._id}`);
              }}
            />
          </div>
        </div>
        {resumoFicha && (
          <dl className="ficha">
            <div className="ficha__item">
              <dt>Para</dt>
              <dd>{resumoFicha}</dd>
            </div>
          </dl>
        )}
      </header>

      <div className="artigo__layout">
        {secoes.length > 1 && (
          <nav className="sumario" aria-label="Nesta página">
            <p className="sumario__titulo">Nesta página</p>
            <ol>
              {secoes.map((secao, index) => (
                <li key={secao.id}>
                  <a href={`#${secao.id}`}>
                    <span className="sumario__num">{ROMANOS[index]}</span>
                    {secao.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="artigo__corpo">
          {plano.resumo && <p className="secao__lead plano__resumo">{plano.resumo}</p>}

          {numero("objetivos") && (
            <section id="objetivos" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("objetivos")}</span>
                Objetivos
              </h2>
              <ul className="objetivos">
                {linhas(plano.objetivos).map((objetivo, index) => (
                  <li key={index}>{objetivo}</li>
                ))}
              </ul>
            </section>
          )}

          {numero("materiais") && (
            <section id="materiais" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("materiais")}</span>
                Materiais e projetos
              </h2>
              {linhas(plano.materiais).length > 0 && (
                <ul className="materiais">
                  {linhas(plano.materiais).map((material, index) => (
                    <li key={index}>{material}</li>
                  ))}
                </ul>
              )}
              {projetos.length > 0 && (
                <>
                  <h3 className="secao__sub">Projetos usados nesta aula</h3>
                  <ProjetosDoPlano projetos={projetos} />
                </>
              )}
            </section>
          )}

          {numero("desenvolvimento") && (
            <section id="desenvolvimento" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("desenvolvimento")}</span>
                Desenvolvimento
              </h2>
              <ol className="etapas">
                {linhas(plano.desenvolvimento).map((etapa, index) => (
                  <li key={index}>{etapa}</li>
                ))}
              </ol>
            </section>
          )}

          {numero("avaliacao") && (
            <section id="avaliacao" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("avaliacao")}</span>
                Avaliação
              </h2>
              <p className="texto-corrido">{plano.avaliacao}</p>
            </section>
          )}

          {numero("dicas") && (
            <section id="dicas" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("dicas")}</span>
                Dicas
              </h2>
              <aside className="nota-margem">
                <p className="texto-corrido">{plano.dicas}</p>
              </aside>
            </section>
          )}

          {podeEditar(plano) && (
            <div className="artigo__acoes">
              <Link to={`/editar-plano/${id}`} className="btn btn--ghost">
                Editar plano
              </Link>
              <button type="button" className="btn btn--danger" onClick={apagar} disabled={excluindo}>
                {excluindo ? "Apagando…" : "Apagar plano"}
              </button>
            </div>
          )}

          <Comentarios tipo="plano" alvo={id} textoVazio="Ainda não há comentários. Já aplicou este plano? Conte como foi." />

          <div className="artigo__fim">
            <VoltarPlanos />
          </div>
        </div>
      </div>
    </article>
  );
}

export default PlanoDetalhes;
