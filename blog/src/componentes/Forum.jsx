import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { CampoArmadilha, CampoNome } from "./Comentarios";
import {
  LIMITE_TEXTO_TOPICO,
  LIMITE_TITULO_TOPICO,
  guardarPendente,
  lembrarNomeVisitante,
  lerNomeVisitante,
  lerPendentes,
  esquecerPendentes,
  mensagemDoErro,
  quando,
} from "./comunidade";
import { CATEGORIAS_FORUM, rotuloCategoria } from "./tipos";

// Formulário de novo tópico (abre embaixo do botão "Novo tópico")
function NovoTopico({ onFechar, onEnviado }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const id = useId();
  const [nome, setNome] = useState(lerNomeVisitante);
  const [categoria, setCategoria] = useState("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [armadilha, setArmadilha] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!categoria) {
      toast.error("Escolha uma categoria.");
      return;
    }
    setEnviando(true);
    try {
      const { data, status } = await axios.post("/forum", { nome, categoria, titulo, texto, site: armadilha });
      if (status === 201) {
        toast.success("Tópico publicado.");
        navigate(`/forum/${data._id}`);
        return;
      }
      lembrarNomeVisitante(nome);
      if (data._id) guardarPendente("forum", data);
      onEnviado();
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível publicar agora. Tente de novo em instantes."));
      setEnviando(false);
    }
  };

  return (
    <form className="participar novo-topico" onSubmit={enviar}>
      <div className="novo-topico__cabecalho">
        <h2>Novo tópico</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onFechar}>
          Cancelar
        </button>
      </div>
      <CampoNome id={`${id}-nome`} valor={nome} onChange={setNome} />
      <fieldset className="field">
        <legend className="field__label">Categoria</legend>
        <div className="chips">
          {CATEGORIAS_FORUM.map((c) => (
            <label key={c.valor} className="chip">
              <input
                type="radio"
                name="categoria"
                value={c.valor}
                checked={categoria === c.valor}
                onChange={() => setCategoria(c.valor)}
              />
              {c.rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor={`${id}-titulo`} className="field__label">
          Título
        </label>
        <input
          id={`${id}-titulo`}
          className="input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Como afinar o violão de caixa sem afinador?"
          maxLength={LIMITE_TITULO_TOPICO}
          minLength={5}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-texto`} className="field__label">
          Mensagem
        </label>
        <textarea
          id={`${id}-texto`}
          className="input input--area"
          rows={6}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LIMITE_TEXTO_TOPICO}
          minLength={10}
          required
        />
      </div>
      <CampoArmadilha valor={armadilha} onChange={setArmadilha} />
      <div className="participar__rodape">
        {!isAuthenticated && (
          <p className="participar__aviso">Para manter o espaço seguro, os tópicos aparecem depois de aprovados.</p>
        )}
        <button type="submit" className="btn btn--primary" disabled={enviando}>
          {enviando ? "Publicando…" : "Publicar tópico"}
        </button>
      </div>
    </form>
  );
}

function LinhaTopico({ topico, pendente = false }) {
  const conteudo = (
    <>
      <span className="topico-linha__categoria">{rotuloCategoria(topico.categoria)}</span>
      <h3 className="topico-linha__titulo">{topico.titulo}</h3>
      <p className="topico-linha__resumo">{topico.texto}</p>
      <p className="topico-linha__meta">
        {topico.nome}
        {topico.professor && <span className="selo selo--professor">Professor</span>}
        <span aria-hidden="true"> · </span>
        {pendente ? (
          <span className="selo">Aguardando aprovação</span>
        ) : (
          <>
            {topico.respostas === 0
              ? "sem respostas"
              : `${topico.respostas} ${topico.respostas === 1 ? "resposta" : "respostas"}`}
            <span aria-hidden="true"> · </span>
            {quando(topico.ultimaAtividade)}
          </>
        )}
      </p>
    </>
  );
  return (
    <li className={`topico-linha${pendente ? " topico-linha--pendente" : ""}`}>
      {pendente ? <div className="topico-linha__link">{conteudo}</div> : <Link to={`/forum/${topico._id}`} className="topico-linha__link">{conteudo}</Link>}
    </li>
  );
}

function Forum() {
  const [topicos, setTopicos] = useState(null);
  const [erro, setErro] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [busca, setBusca] = useState("");
  const [escrevendo, setEscrevendo] = useState(false);
  const [recebido, setRecebido] = useState(false);
  const [meusPendentes, setMeusPendentes] = useState(() => lerPendentes("forum"));

  const carregar = useCallback(() => {
    setErro(false);
    axios
      .get("/forum", { timeout: 15000 })
      .then(({ data }) => {
        setTopicos(data);
        esquecerPendentes(data.map((t) => t._id));
        setMeusPendentes(lerPendentes("forum"));
      })
      .catch(() => setErro(true));
  }, []);

  useEffect(() => {
    document.title = "Fórum — Ensine Música";
    carregar();
  }, [carregar]);

  const contagem = useMemo(() => {
    const porCategoria = Object.fromEntries(CATEGORIAS_FORUM.map((c) => [c.valor, 0]));
    topicos?.forEach((t) => (porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + 1));
    return porCategoria;
  }, [topicos]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (topicos || []).filter(
      (t) =>
        (!categoria || t.categoria === categoria) &&
        (!termo || t.titulo.toLowerCase().includes(termo) || t.texto.toLowerCase().includes(termo) || t.nome.toLowerCase().includes(termo))
    );
  }, [topicos, categoria, busca]);

  return (
    <div className="container pagina-lista">
      <header className="pagina-lista__head">
        <p className="eyebrow">Comunidade</p>
        <h1 className="pagina-lista__titulo">Fórum</h1>
        <p className="pagina-lista__lead">
          Tire dúvidas, conte como foi aplicar um projeto com a turma e troque ideias com outros professores de música.
        </p>
        {!escrevendo && !recebido && (
          <button type="button" className="btn btn--primary" onClick={() => setEscrevendo(true)}>
            Novo tópico
          </button>
        )}
      </header>

      {escrevendo && (
        <NovoTopico
          onFechar={() => setEscrevendo(false)}
          onEnviado={() => {
            setEscrevendo(false);
            setRecebido(true);
            setMeusPendentes(lerPendentes("forum"));
          }}
        />
      )}

      {recebido && (
        <div className="participar__recebido" role="status">
          <p>
            <strong>Recebemos o seu tópico!</strong> Ele aparece no fórum depois que um professor aprovar.
          </p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRecebido(false)}>
            Fechar
          </button>
        </div>
      )}

      <div className="forum__filtros">
        <div className="chips chips--compactas" role="group" aria-label="Filtrar por categoria">
          <button type="button" className="chip" aria-pressed={!categoria} onClick={() => setCategoria("")}>
            Todas
            {topicos && <span className="chip__contagem">{topicos.length}</span>}
          </button>
          {CATEGORIAS_FORUM.map((c) => (
            <button
              key={c.valor}
              type="button"
              className="chip"
              aria-pressed={categoria === c.valor}
              onClick={() => setCategoria(categoria === c.valor ? "" : c.valor)}
              title={c.descricao}
            >
              {c.rotulo}
              {topicos && <span className="chip__contagem">{contagem[c.valor]}</span>}
            </button>
          ))}
        </div>
        <div className="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <label htmlFor="busca-forum" className="sr-only">
            Buscar no fórum
          </label>
          <input
            id="busca-forum"
            type="search"
            placeholder="Buscar no fórum"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
          />
        </div>
      </div>

      {erro && (
        <div className="silencio">
          <h2>Fora do tom</h2>
          <p>Não foi possível carregar o fórum agora.</p>
          <button type="button" className="btn btn--ghost" onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      )}

      {topicos === null && !erro && (
        <ul className="topicos" role="status" aria-label="Carregando tópicos">
          {[0, 1, 2].map((i) => (
            <li key={i} className="topico-linha" aria-hidden="true">
              <div className="topico-linha__link">
                <span className="skeleton skeleton--line" style={{ width: 90 }} />
                <span className="skeleton skeleton--title" />
                <span className="skeleton skeleton--line" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {topicos && (
        <ul className="topicos">
          {!categoria && !busca && meusPendentes.map((t) => <LinhaTopico key={t._id} topico={t} pendente />)}
          {visiveis.map((t) => (
            <LinhaTopico key={t._id} topico={t} />
          ))}
        </ul>
      )}

      {topicos?.length === 0 && meusPendentes.length === 0 && (
        <div className="silencio">
          <h2>Ninguém falou ainda</h2>
          <p>Abra o primeiro tópico: uma dúvida, uma ideia ou um relato de sala de aula.</p>
        </div>
      )}

      {topicos?.length > 0 && visiveis.length === 0 && (
        <div className="silencio">
          <h2>Nenhum tópico encontrado</h2>
          <p>Tente outra busca ou outra categoria.</p>
        </div>
      )}
    </div>
  );
}

export default Forum;
