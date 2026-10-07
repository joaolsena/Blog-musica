import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { definirContagem } from "./contagemModeracao";
import { iniciais } from "./MenuConta";
import { mensagemDoErro, quando } from "./comunidade";
import { rotuloCategoria } from "./tipos";

// Onde o comentário foi escrito, com link
const ONDE = {
  projeto: { rotulo: "No projeto", caminho: (id) => `/projeto/${id}` },
  plano: { rotulo: "No plano de aula", caminho: (id) => `/plano/${id}` },
  topico: { rotulo: "Resposta no fórum", caminho: (id) => `/forum/${id}` },
};

function ItemModeracao({ contexto, item, titulo, ocupado, onAprovar, onRecusar }) {
  return (
    <li className="moderacao-item">
      <p className="moderacao-item__contexto">{contexto}</p>
      <div className="mensagem__cabecalho">
        <span className="mensagem__avatar" aria-hidden="true">
          {iniciais(item.nome)}
        </span>
        <strong className="mensagem__nome">{item.nome}</strong>
        <time className="mensagem__quando" dateTime={item.criadoEm}>
          {quando(item.criadoEm)}
        </time>
      </div>
      {titulo && <p className="moderacao-item__titulo">{titulo}</p>}
      <p className="mensagem__texto">{item.texto}</p>
      <div className="moderacao-item__acoes">
        <button type="button" className="btn btn--primary btn--sm" disabled={ocupado} onClick={onAprovar}>
          Aprovar
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={ocupado} onClick={onRecusar}>
          Recusar
        </button>
      </div>
    </li>
  );
}

function Moderacao() {
  const [pendentes, setPendentes] = useState(null); // { comentarios, topicos }
  const [ocupado, setOcupado] = useState(null);

  const carregar = useCallback(() => {
    axios
      .get("/moderacao")
      .then(({ data }) => {
        setPendentes(data);
        definirContagem(data.comentarios.length + data.topicos.length);
      })
      .catch((error) => {
        toast.error(mensagemDoErro(error, "Não foi possível carregar a moderação."));
        setPendentes({ comentarios: [], topicos: [] });
      });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Tira o item da tela e atualiza o número no menu
  const retirar = (lista, id) =>
    setPendentes((atual) => {
      const novo = { ...atual, [lista]: atual[lista].filter((item) => item._id !== id) };
      definirContagem(novo.comentarios.length + novo.topicos.length);
      return novo;
    });

  const agir = async (lista, item, acao) => {
    setOcupado(item._id);
    try {
      if (acao === "aprovar") {
        await axios.post(`/moderacao/${lista}/${item._id}/aprovar`);
        toast.success(lista === "topicos" ? "Tópico publicado no fórum." : "Comentário publicado.");
      } else {
        await axios.delete(lista === "topicos" ? `/forum/${item._id}` : `/comentarios/${item._id}`);
        toast("Mensagem recusada e apagada.");
      }
      retirar(lista, item._id);
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível concluir. Tente de novo."));
      if (error.response?.status === 404) retirar(lista, item._id); // outra pessoa já moderou
    } finally {
      setOcupado(null);
    }
  };

  const total = pendentes ? pendentes.comentarios.length + pendentes.topicos.length : 0;

  return (
    <div className="container form-page">
      <header className="form-page__head">
        <p className="eyebrow">Área do professor</p>
        <h1>Moderação</h1>
        <p>
          Comentários e tópicos enviados por visitantes só aparecem no site depois de aprovados. Recuse spam, ofensas e
          mensagens com dados pessoais de alunos.
        </p>
      </header>

      {pendentes === null && <p className="backup__texto">Carregando…</p>}

      {pendentes && total === 0 && (
        <div className="silencio">
          <h2>Tudo em dia</h2>
          <p>Nenhuma mensagem esperando aprovação.</p>
        </div>
      )}

      {pendentes?.topicos.length > 0 && (
        <section className="moderacao-grupo" aria-labelledby="moderacao-topicos">
          <h2 id="moderacao-topicos" className="moderacao-grupo__titulo">
            Tópicos novos no fórum <span className="comentarios__contagem">{pendentes.topicos.length}</span>
          </h2>
          <ul className="moderacao-lista">
            {pendentes.topicos.map((topico) => (
              <ItemModeracao
                key={topico._id}
                contexto={`Fórum · ${rotuloCategoria(topico.categoria)}`}
                item={topico}
                titulo={topico.titulo}
                ocupado={ocupado === topico._id}
                onAprovar={() => agir("topicos", topico, "aprovar")}
                onRecusar={() => agir("topicos", topico, "recusar")}
              />
            ))}
          </ul>
        </section>
      )}

      {pendentes?.comentarios.length > 0 && (
        <section className="moderacao-grupo" aria-labelledby="moderacao-comentarios">
          <h2 id="moderacao-comentarios" className="moderacao-grupo__titulo">
            Comentários e respostas <span className="comentarios__contagem">{pendentes.comentarios.length}</span>
          </h2>
          <ul className="moderacao-lista">
            {pendentes.comentarios.map((comentario) => {
              const onde = ONDE[comentario.alvo.tipo];
              return (
                <ItemModeracao
                  key={comentario._id}
                  contexto={
                    <>
                      {onde.rotulo}:{" "}
                      {comentario.alvo.titulo ? (
                        <Link to={onde.caminho(comentario.alvo.id)} className="link">
                          {comentario.alvo.titulo}
                        </Link>
                      ) : (
                        "(apagado)"
                      )}
                    </>
                  }
                  item={comentario}
                  ocupado={ocupado === comentario._id}
                  onAprovar={() => agir("comentarios", comentario, "aprovar")}
                  onRecusar={() => agir("comentarios", comentario, "recusar")}
                />
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default Moderacao;
