import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import Comentarios from "./Comentarios";
import { BotaoCompartilhar } from "./Compartilhar";
import { iniciais } from "./MenuConta";
import NaoEncontrado from "./NaoEncontrado";
import { mensagemDoErro, quando } from "./comunidade";
import { rotuloCategoria } from "./tipos";

function VoltarForum() {
  return (
    <Link to="/forum" className="back-link">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Fórum
    </Link>
  );
}

function TopicoForum() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [topico, setTopico] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    axios
      .get(`/forum/${id}`, { timeout: 15000 })
      .then(({ data }) => setTopico(data))
      .catch((error) => setErro(error.response?.status === 404 ? "nao-encontrado" : "falha"));
  }, [id]);

  useEffect(() => {
    if (!topico) return undefined;
    const anterior = document.title;
    document.title = `${topico.titulo} — Fórum — Ensine Música`;
    return () => {
      document.title = anterior;
    };
  }, [topico]);

  const apagar = async () => {
    if (!window.confirm("Apagar este tópico e todas as respostas? Esta ação não pode ser desfeita.")) return;
    try {
      await axios.delete(`/forum/${id}`);
      toast.success("Tópico apagado.");
      navigate("/forum");
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível apagar o tópico."));
    }
  };

  if (erro === "nao-encontrado") {
    return <NaoEncontrado titulo="Tópico não encontrado" texto="Este tópico não existe mais ou ainda espera aprovação." />;
  }
  if (erro) {
    return (
      <div className="container artigo-estado">
        <h1>Algo saiu do tom</h1>
        <p>Não foi possível carregar este tópico agora. Verifique sua conexão e tente de novo.</p>
        <div className="artigo-estado__acoes">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
          <VoltarForum />
        </div>
      </div>
    );
  }
  if (!topico) {
    return (
      <div className="container topico" role="status" aria-label="Carregando tópico">
        <span className="skeleton skeleton--line" style={{ width: 120 }} />
        <span className="skeleton skeleton--hero-title" />
        <span className="skeleton skeleton--line" />
      </div>
    );
  }

  return (
    <article className="container topico">
      <header className="topico__head">
        <VoltarForum />
        <span className="topico-linha__categoria">{rotuloCategoria(topico.categoria)}</span>
        <h1 className="topico__titulo">{topico.titulo}</h1>
      </header>

      <div className="topico__abertura">
        <p className="mensagem__cabecalho">
          <span className={`mensagem__avatar${topico.professor ? " mensagem__avatar--professor" : ""}`} aria-hidden="true">
            {iniciais(topico.nome)}
          </span>
          <strong className="mensagem__nome">{topico.nome}</strong>
          {topico.professor && <span className="selo selo--professor">Professor</span>}
          <time className="mensagem__quando" dateTime={topico.criadoEm}>
            {quando(topico.criadoEm)}
          </time>
        </p>
        <p className="topico__texto">{topico.texto}</p>
        <div className="topico__acoes">
          <BotaoCompartilhar titulo={topico.titulo} />
          {isAuthenticated && (
            <button type="button" className="btn btn--danger btn--sm" onClick={apagar}>
              Apagar tópico
            </button>
          )}
        </div>
      </div>

      <Comentarios
        tipo="topico"
        alvo={id}
        titulo="Respostas"
        textoVazio="Ainda não há respostas. Ajude com o que você sabe."
        rotuloEnviar="Responder"
      />
    </article>
  );
}

export default TopicoForum;
