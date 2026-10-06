import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Pauta from "./Pauta";
import RevealOnScroll from "./RevealOnScroll";
import { DURACOES, FAIXAS_ETARIAS, NIVEIS, resumoDaFicha, rotuloTipo } from "./tipos";
import { srcSetImagem, urlImagem } from "./imagens";
import { lerProjetosSalvos, salvarProjetos } from "./memoria";
import { AvisoSincronia, useSincronia } from "./Sincronia";

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

// Controle segmentado: a pílula de fundo desliza até a opção ativa
function FiltroSegmentado({ valor, onChange, contagem }) {
  const containerRef = useRef(null);
  const [indicador, setIndicador] = useState(null);
  const [pronto, setPronto] = useState(false);

  useLayoutEffect(() => {
    const medir = () => {
      const ativo = containerRef.current?.querySelector('[aria-pressed="true"]');
      if (ativo) setIndicador({ x: ativo.offsetLeft, w: ativo.offsetWidth });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [valor, contagem]);

  // Só liga a transição depois da primeira medida, para a pílula não "voar" do canto ao carregar
  useEffect(() => {
    if (indicador && !pronto) {
      const id = requestAnimationFrame(() => setPronto(true));
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [indicador, pronto]);

  return (
    <div className="segmented" role="group" aria-label="Filtrar por tipo de projeto" ref={containerRef}>
      {indicador && (
        <span
          className={`segmented__indicator${pronto ? " is-ready" : ""}`}
          style={{ transform: `translateX(${indicador.x}px)`, width: indicador.w }}
          aria-hidden="true"
        />
      )}
      {FILTROS.map((item) => (
        <button
          key={item.valor}
          type="button"
          className="segmented__option"
          onClick={() => onChange(item.valor)}
          aria-pressed={valor === item.valor}
        >
          {item.rotulo}
          {contagem && <span className="segmented__count">{contagem[item.valor]}</span>}
        </button>
      ))}
    </div>
  );
}

// Larguras geradas pelo Cloudinary; o navegador escolhe a menor que serve para a tela
const LARGURAS_CAPA = [400, 800, 1200, 1600];

function CapaProjeto({ projeto, sizes, prioridade = false }) {
  if (projeto.imagem) {
    return (
      <img
        src={urlImagem(projeto.imagem, 800)}
        srcSet={srcSetImagem(projeto.imagem, LARGURAS_CAPA)}
        sizes={sizes}
        alt=""
        loading={prioridade ? "eager" : "lazy"}
        fetchpriority={prioridade ? "high" : undefined}
        decoding="async"
      />
    );
  }
  // Sem imagem: uma capa tipográfica com a pauta
  return (
    <div className="capa-vazia" aria-hidden="true">
      <Pauta />
    </div>
  );
}

// "Fundamental I · Fácil · 1 aula" nos cards (só o que foi informado)
function ResumoFicha({ projeto }) {
  const itens = resumoDaFicha(projeto);
  if (itens.length === 0) return null;
  return <p className="card__ficha">{itens.join(" · ")}</p>;
}

// Filtros da ficha: para quem é, nível e duração (um valor de cada; tocar de novo desmarca)
const GRUPOS_FICHA = [
  { campo: "faixa", titulo: "Para quem é", opcoes: FAIXAS_ETARIAS.map((f) => ({ valor: f.valor, rotulo: f.curto })) },
  { campo: "nivel", titulo: "Nível", opcoes: NIVEIS },
  { campo: "duracao", titulo: "Duração", opcoes: DURACOES },
];
const FICHA_VAZIA = { faixa: "", nivel: "", duracao: "" };

const combinaFicha = (projeto, ficha) =>
  (!ficha.faixa || projeto.faixasEtarias?.includes(ficha.faixa)) &&
  (!ficha.nivel || projeto.nivel === ficha.nivel) &&
  (!ficha.duracao || projeto.duracao === ficha.duracao);

function FiltrosFicha({ ficha, onChange, aberto, onAlternar }) {
  const ativos = Object.values(ficha).filter(Boolean).length;
  return (
    <div className="filtros-ficha">
      <div className="filtros-ficha__barra">
        <button
          type="button"
          className="filtros-ficha__botao"
          aria-expanded={aberto}
          aria-controls="filtros-ficha-painel"
          onClick={onAlternar}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          Turma, nível e duração
          {ativos > 0 && <span className="filtros-ficha__contagem">{ativos}</span>}
          <svg className="filtros-ficha__seta" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {ativos > 0 && (
          <button type="button" className="filtros-ficha__limpar" onClick={() => onChange(FICHA_VAZIA)}>
            Limpar
          </button>
        )}
      </div>
      <div id="filtros-ficha-painel" className="filtros-ficha__painel" data-aberto={aberto} inert={aberto ? undefined : ""}>
        <div className="filtros-ficha__conteudo">
          <div className="filtros-ficha__grade">
            {GRUPOS_FICHA.map((grupo) => (
              <div key={grupo.campo} className="filtros-ficha__grupo" role="group" aria-label={grupo.titulo}>
                <p className="filtros-ficha__titulo">{grupo.titulo}</p>
                <div className="chips chips--compactas">
                  {grupo.opcoes.map((opcao) => {
                    const marcado = ficha[grupo.campo] === opcao.valor;
                    return (
                      <button
                        key={opcao.valor}
                        type="button"
                        className="chip"
                        aria-pressed={marcado}
                        onClick={() => onChange({ ...ficha, [grupo.campo]: marcado ? "" : opcao.valor })}
                      >
                        {opcao.rotulo}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjetoCard({ projeto }) {
  return (
    <article className="card">
      <Link to={`/projeto/${projeto.id}`} className="card__link">
        <div className="card__media">
          <CapaProjeto projeto={projeto} sizes="(min-width: 1200px) 380px, (min-width: 700px) 45vw, 100vw" />
        </div>
        <div className="card__body">
          {projeto.tipoProjeto && (
            <span className={`tag tag--${projeto.tipoProjeto}`}>{rotuloTipo(projeto.tipoProjeto)}</span>
          )}
          <h3 className="card__title">
            <span>{projeto.titulo}</span>
          </h3>
          {projeto.descricaoGeral && <p className="card__excerpt">{projeto.descricaoGeral}</p>}
          <ResumoFicha projeto={projeto} />
          <p className="card__meta">
            {projeto.autor}
            {projeto.data && <span aria-hidden="true"> · </span>}
            {projeto.data}
          </p>
        </div>
      </Link>
    </article>
  );
}

function Destaque({ projeto }) {
  return (
    <RevealOnScroll as="section" className="destaque" aria-label="Projeto mais recente">
      <Link to={`/projeto/${projeto.id}`} className="destaque__link">
        <div className="destaque__media">
          <CapaProjeto projeto={projeto} sizes="(min-width: 1200px) 680px, (min-width: 900px) 58vw, 100vw" prioridade />
        </div>
        <div className="destaque__body">
          <p className="eyebrow">Mais recente</p>
          {projeto.tipoProjeto && (
            <span className={`tag tag--${projeto.tipoProjeto}`}>{rotuloTipo(projeto.tipoProjeto)}</span>
          )}
          <h2 className="destaque__title">{projeto.titulo}</h2>
          {projeto.descricaoGeral && <p className="destaque__excerpt">{projeto.descricaoGeral}</p>}
          <ResumoFicha projeto={projeto} />
          <p className="card__meta">
            {projeto.autor}
            {projeto.data && <span aria-hidden="true"> · </span>}
            {projeto.data}
          </p>
          <span className="destaque__cta">
            Ver projeto
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Link>
    </RevealOnScroll>
  );
}

function Esqueleto() {
  return (
    <div className="grid" role="status" aria-label="Carregando projetos">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="card card--skeleton" key={index} aria-hidden="true">
          <div className="card__media skeleton" />
          <div className="card__body">
            <span className="skeleton skeleton--line" style={{ width: "30%" }} />
            <span className="skeleton skeleton--title" />
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line" style={{ width: "70%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Estado vazio: uma pausa (o silêncio da música)
function Silencio({ titulo, texto, acao }) {
  return (
    <div className="silencio">
      <svg className="silencio__pausa" viewBox="0 0 40 80" aria-hidden="true">
        <path d="M14 6l14 17c-6 4-8 9-3 17l8 10c-8-3-15 0-12 8 2 5 7 8 7 8-10-4-18-10-15-18 2-5 8-6 12-4L12 33c6-4 8-10 2-17z" />
      </svg>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {acao}
    </div>
  );
}

// Prepara a lista do servidor: id em texto e mais recentes primeiro
// (sem data válida vai para o final)
function prepararLista(projetos) {
  return projetos
    .map((projeto) => ({ ...projeto, id: projeto._id }))
    .sort((a, b) => {
      const dataA = parseDataBR(a.data);
      const dataB = parseDataBR(b.data);
      if (dataA && dataB) return dataB - dataA;
      if (dataA) return -1;
      if (dataB) return 1;
      return (a.titulo || "").localeCompare(b.titulo || "");
    });
}

function Projetos() {
  // A última lista vista neste aparelho aparece na hora; a do servidor chega depois
  const [salvos] = useState(lerProjetosSalvos);
  const [projetos, setProjetos] = useState(() => prepararLista(salvos?.projetos ?? []));
  const [carregando, setCarregando] = useState(!salvos);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [ficha, setFicha] = useState(FICHA_VAZIA);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [salvoEm, setSalvoEm] = useState(salvos?.salvoEm);
  const sincronia = useSincronia();
  const { iniciar, concluir } = sincronia;

  const buscar = useCallback(() => {
    if (salvos) iniciar();
    axios
      .get("/projetos", { timeout: 15000 })
      .then((response) => {
        salvarProjetos(response.data);
        setSalvoEm(Date.now());
        setProjetos(prepararLista(response.data));
        setErro(null);
        if (salvos) concluir(true);
      })
      .catch((error) => {
        console.error("Erro ao carregar projetos:", error);
        // Com a versão guardada na tela, só avisa; sem ela, mostra o erro
        if (salvos) concluir(false);
        else setErro("Não foi possível carregar os projetos agora. Tente novamente em instantes.");
      })
      .finally(() => setCarregando(false));
  }, [salvos, iniciar, concluir]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const contagem = useMemo(
    () => ({
      todos: projetos.length,
      instrumento: projetos.filter((p) => p.tipoProjeto === "instrumento").length,
      jogo: projetos.filter((p) => p.tipoProjeto === "jogo").length,
    }),
    [projetos]
  );

  const projetosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return projetos.filter((projeto) => {
      const combinaFiltro = filtro === "todos" || projeto.tipoProjeto === filtro;
      const combinaBusca =
        !termo ||
        projeto.titulo?.toLowerCase().includes(termo) ||
        projeto.autor?.toLowerCase().includes(termo);
      return combinaFiltro && combinaBusca && combinaFicha(projeto, ficha);
    });
  }, [projetos, busca, filtro, ficha]);

  // Os filtros da ficha só aparecem quando algum projeto tem a ficha preenchida
  const temFicha = projetos.some((p) => p.faixasEtarias?.length > 0 || p.nivel || p.duracao);
  const fichaAtiva = Object.values(ficha).some(Boolean);

  // O destaque só aparece na visão padrão (sem busca e sem filtro ativo),
  // para não duplicar o mesmo card quando a lista já está filtrada.
  const mostrarDestaque = !busca && filtro === "todos" && !fichaAtiva && projetosFiltrados.length > 1;
  const destaque = mostrarDestaque ? projetosFiltrados[0] : null;
  const restante = mostrarDestaque ? projetosFiltrados.slice(1) : projetosFiltrados;
  const temProjetos = !carregando && !erro && projetos.length > 0;

  return (
    <>
      <AvisoSincronia estado={sincronia.estado} salvoEm={salvoEm} aoTentarDeNovo={buscar} />
      <section className="hero">
        <div className="container">
          <p className="eyebrow hero__eyebrow">Educação musical na prática</p>
          <div className="hero__grid">
            <h1 className="hero__title">
              Música se aprende <em>fazendo</em>.
            </h1>
            <div>
              <p className="hero__lead">
                Instrumentos e jogos musicais construídos com materiais alternativos — tutoriais completos, criados
                por estudantes, para inspirar a sua próxima aula.
              </p>
              <Pauta className="hero__pauta" />
            </div>
          </div>
        </div>
      </section>

      <section className="container projetos" aria-labelledby="titulo-projetos">
        <div className="projetos__head">
          <h2 id="titulo-projetos" className="section-title">
            Projetos
          </h2>

          {temProjetos && (
            <div className="toolbar">
              <FiltroSegmentado valor={filtro} onChange={setFiltro} contagem={contagem} />

              <div className="search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <label htmlFor="busca-projetos" className="sr-only">
                  Buscar projetos por título ou autor
                </label>
                <input
                  id="busca-projetos"
                  type="search"
                  placeholder="Buscar por título ou autor"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  enterKeyHint="search"
                  autoComplete="off"
                />
              </div>
            </div>
          )}
        </div>

        {temProjetos && temFicha && (
          <FiltrosFicha
            ficha={ficha}
            onChange={setFicha}
            aberto={filtrosAbertos}
            onAlternar={() => setFiltrosAbertos((aberto) => !aberto)}
          />
        )}

        {carregando && <Esqueleto />}

        {!carregando && erro && (
          <Silencio
            titulo="Fora do tom"
            texto={erro}
            acao={
              <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>
                Tentar de novo
              </button>
            }
          />
        )}

        {!carregando && !erro && projetos.length === 0 && (
          <Silencio
            titulo="Silêncio por enquanto"
            texto="Ainda não há projetos publicados. Os primeiros trabalhos aparecem aqui em breve."
          />
        )}

        {temProjetos && projetosFiltrados.length === 0 && (
          <Silencio
            titulo="Nenhum projeto encontrado"
            texto="Tente outro termo de busca, outra categoria ou outros filtros."
            acao={
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setBusca("");
                  setFiltro("todos");
                  setFicha(FICHA_VAZIA);
                }}
              >
                Limpar filtros
              </button>
            }
          />
        )}

        {temProjetos && destaque && <Destaque projeto={destaque} />}

        {temProjetos && restante.length > 0 && (
          <div className="grid">
            {restante.map((projeto, index) => (
              <RevealOnScroll key={projeto.id} delay={(index % 3) * 60}>
                <ProjetoCard projeto={projeto} />
              </RevealOnScroll>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default Projetos;
