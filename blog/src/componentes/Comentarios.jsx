import React, { useCallback, useEffect, useId, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { iniciais } from "./MenuConta";
import { useContagemModeracao } from "./contagemModeracao";
import {
  LIMITE_COMENTARIO,
  LIMITE_NOME,
  esquecerPendentes,
  guardarPendente,
  lembrarNomeVisitante,
  lerNomeVisitante,
  lerPendentes,
  mensagemDoErro,
  quando,
} from "./comunidade";
import { MEMORIA, guardarItem, lerItemGuardado } from "./memoria";

// Lembrete embaixo dos formulários do público (comentários, respostas e tópicos)
export function AvisoParticipacao({ aprovacao }) {
  return (
    <p className="participar__aviso">
      Não escreva telefone, endereço nem dados de alunos.
      {aprovacao && " As mensagens aparecem depois de aprovadas por um professor."}{" "}
      <Link to="/privacidade" className="link">
        Privacidade
      </Link>
    </p>
  );
}

// Um comentário (ou resposta do fórum)
export function Mensagem({ mensagem, pendente = false, onApagar }) {
  return (
    <li className={`mensagem${pendente ? " mensagem--pendente" : ""}`}>
      <span className={`mensagem__avatar${mensagem.professor ? " mensagem__avatar--professor" : ""}`} aria-hidden="true">
        {iniciais(mensagem.nome)}
      </span>
      <div className="mensagem__corpo">
        <p className="mensagem__cabecalho">
          <strong className="mensagem__nome">{mensagem.nome}</strong>
          {mensagem.professor && <span className="selo selo--professor">Professor</span>}
          {pendente && <span className="selo">Aguardando aprovação</span>}
          <time className="mensagem__quando" dateTime={mensagem.criadoEm}>
            {quando(mensagem.criadoEm)}
          </time>
        </p>
        <p className="mensagem__texto">{mensagem.texto}</p>
        {onApagar && (
          <button type="button" className="mensagem__apagar" onClick={() => onApagar(mensagem)}>
            Apagar
          </button>
        )}
      </div>
    </li>
  );
}

// Campo escondido que só robôs preenchem (o servidor descarta o envio)
export function CampoArmadilha({ valor, onChange }) {
  return (
    <div className="armadilha" aria-hidden="true">
      <label>
        Deixe este campo em branco
        <input type="text" name="site" tabIndex={-1} autoComplete="off" value={valor} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

// Nome de quem escreve: a conta, para professores; um campo lembrado no aparelho, para visitantes
export function CampoNome({ id, valor, onChange }) {
  const { usuario } = useAuth();
  if (usuario) {
    return (
      <p className="participar__como">
        Publicando como <strong>{usuario.nome}</strong>
        <span className="selo selo--professor">Professor</span>
      </p>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        Seu nome
      </label>
      <input
        id={id}
        className="input"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        maxLength={LIMITE_NOME}
        autoComplete="name"
        required
        minLength={2}
      />
    </div>
  );
}

/**
 * Lista de comentários aprovados e formulário para comentar.
 * tipo: "projeto", "plano" ou "topico" (respostas do fórum); alvo: id de onde se comenta.
 */
function Comentarios({ tipo, alvo, titulo = "Comentários", textoVazio, rotuloEnviar = "Enviar comentário" }) {
  const { isAuthenticated } = useAuth();
  const pendentesModeracao = useContagemModeracao();
  const lugar = `${tipo}:${alvo}`;
  const idCampo = useId();
  const [comentarios, setComentarios] = useState(() => lerItemGuardado(MEMORIA.comentarios, lugar)?.dados ?? null);
  const [erro, setErro] = useState(false);
  const [meusPendentes, setMeusPendentes] = useState(() => lerPendentes(lugar));
  const [nome, setNome] = useState(lerNomeVisitante);
  const [texto, setTexto] = useState("");
  const [armadilha, setArmadilha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [recebido, setRecebido] = useState(false);

  const carregar = useCallback(() => {
    setErro(false);
    axios
      .get("/comentarios", { params: { tipo, alvo } })
      .then(({ data }) => {
        setComentarios(data);
        guardarItem(MEMORIA.comentarios, lugar, data);
        esquecerPendentes(data.map((c) => c._id));
        setMeusPendentes(lerPendentes(lugar));
      })
      // Sem internet, mas com os comentários guardados: segue mostrando eles, sem aviso de erro
      .catch(() => setErro(!lerItemGuardado(MEMORIA.comentarios, lugar)));
  }, [tipo, alvo, lugar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const { data, status } = await axios.post("/comentarios", { tipo, alvo, nome, texto, site: armadilha });
      setTexto("");
      if (status === 201) {
        setComentarios((atuais) => [...(atuais || []), data]);
        toast.success("Comentário publicado.");
      } else {
        lembrarNomeVisitante(nome);
        if (data._id) {
          guardarPendente(lugar, data);
          setMeusPendentes(lerPendentes(lugar));
        }
        setRecebido(true);
      }
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível enviar agora. Tente de novo em instantes."));
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async (comentario) => {
    if (!window.confirm(`Apagar o comentário de ${comentario.nome}?`)) return;
    try {
      await axios.delete(`/comentarios/${comentario._id}`);
      setComentarios((atuais) => atuais.filter((c) => c._id !== comentario._id));
      toast.success("Comentário apagado.");
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível apagar o comentário."));
    }
  };

  const total = comentarios?.length || 0;
  const restantes = LIMITE_COMENTARIO - texto.length;

  return (
    <section className="comentarios" aria-labelledby={`${idCampo}-titulo`}>
      <h2 id={`${idCampo}-titulo`} className="comentarios__titulo">
        {titulo}
        {total > 0 && <span className="comentarios__contagem">{total}</span>}
      </h2>

      {erro && (
        <p className="comentarios__vazio">
          Não foi possível carregar os comentários.{" "}
          <button type="button" className="link" onClick={carregar}>
            Tentar de novo
          </button>
        </p>
      )}
      {comentarios === null && !erro && <p className="comentarios__vazio">Carregando…</p>}
      {comentarios?.length === 0 && meusPendentes.length === 0 && (
        <p className="comentarios__vazio">{textoVazio || "Ainda não há comentários. Conte o que achou ou tire uma dúvida."}</p>
      )}

      {(total > 0 || meusPendentes.length > 0) && (
        <ol className="mensagens">
          {comentarios?.map((comentario) => (
            <Mensagem key={comentario._id} mensagem={comentario} onApagar={isAuthenticated ? apagar : undefined} />
          ))}
          {meusPendentes.map((comentario) => (
            <Mensagem key={comentario._id} mensagem={comentario} pendente />
          ))}
        </ol>
      )}

      {isAuthenticated && pendentesModeracao > 0 && (
        <p className="comentarios__moderacao">
          Há {pendentesModeracao} {pendentesModeracao === 1 ? "mensagem esperando" : "mensagens esperando"} aprovação no
          site. <Link to="/moderacao" className="link">
            Abrir moderação
          </Link>
        </p>
      )}

      {recebido ? (
        <div className="participar__recebido" role="status">
          <p>
            <strong>Recebemos a sua mensagem!</strong> Ela aparece aqui depois que um professor aprovar.
          </p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRecebido(false)}>
            Escrever outra
          </button>
        </div>
      ) : (
        <form className="participar" onSubmit={enviar}>
          <CampoNome id={`${idCampo}-nome`} valor={nome} onChange={setNome} />
          <div className="field">
            <label htmlFor={`${idCampo}-texto`} className="field__label">
              {tipo === "topico" ? "Sua resposta" : "Seu comentário"}
            </label>
            <textarea
              id={`${idCampo}-texto`}
              className="input input--area"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={LIMITE_COMENTARIO}
              required
              minLength={2}
            />
            {restantes < 200 && <p className="field__hint">{restantes} caracteres restantes</p>}
          </div>
          <CampoArmadilha valor={armadilha} onChange={setArmadilha} />
          <div className="participar__rodape">
            <AvisoParticipacao aprovacao={!isAuthenticated} />
            <button type="submit" className="btn btn--primary" disabled={enviando}>
              {enviando ? "Enviando…" : rotuloEnviar}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default Comentarios;
