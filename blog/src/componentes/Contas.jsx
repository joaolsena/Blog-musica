import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { Campo } from "./CamposFormulario";
import { ROTULO_PAPEL, iniciais } from "./MenuConta";

// Contas de professores e alunos (só administradores).
// Uma conta nova recebe uma senha temporária, mostrada uma única vez aqui; no primeiro
// acesso a pessoa cria a própria senha. Autores publicam e editam só os próprios projetos.

const mensagemDoErro = (error, padrao) => (typeof error.response?.data === "string" ? error.response.data : padrao);

// Caixa com a senha temporária e a mensagem pronta para enviar à pessoa
function SenhaTemporaria({ conta, senha, onFechar }) {
  const endereco = `${window.location.origin}/login`;
  const mensagem =
    `Olá, ${conta.nome.split(" ")[0]}! Sua conta no Ensine Música está pronta.\n` +
    `Entre em ${endereco}\nE-mail: ${conta.email}\nSenha temporária: ${senha}\n` +
    "No primeiro acesso você cria a sua própria senha.";

  const copiar = async (texto, aviso) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(aviso);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  };

  return (
    <div className="senha-temporaria" role="status">
      <p className="senha-temporaria__titulo">Senha temporária de {conta.nome}</p>
      <p className="senha-temporaria__senha">{senha}</p>
      <p className="senha-temporaria__dica">
        Ela aparece só agora. Envie para a pessoa: no primeiro acesso, ela cria a própria senha.
      </p>
      <div className="senha-temporaria__acoes">
        <button type="button" className="btn btn--primary btn--sm" onClick={() => copiar(mensagem, "Mensagem copiada.")}>
          Copiar mensagem
        </button>
        <a
          className="btn btn--whatsapp btn--sm"
          href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noreferrer"
        >
          Enviar no WhatsApp
        </a>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => copiar(senha, "Senha copiada.")}>
          Copiar só a senha
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onFechar}>
          Pronto
        </button>
      </div>
    </div>
  );
}

const CONTA_VAZIA = { nome: "", email: "", papel: "autor" };

function Contas() {
  const { usuario } = useAuth();
  const [contas, setContas] = useState(null);
  const [nova, setNova] = useState(CONTA_VAZIA);
  const [criando, setCriando] = useState(false);
  const [senhaMostrada, setSenhaMostrada] = useState(null); // { conta, senha }
  const [ocupada, setOcupada] = useState(null); // id da conta com uma ação em andamento

  const carregar = useCallback(async () => {
    try {
      const { data } = await axios.get("/usuarios");
      setContas(data);
    } catch (error) {
      console.error("Erro ao listar contas:", error);
      toast.error("Não foi possível carregar as contas.");
      setContas([]);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criar = async (e) => {
    e.preventDefault();
    setCriando(true);
    try {
      const { data } = await axios.post("/usuarios", nova);
      setContas((atuais) => [...(atuais || []), data.usuario].sort((a, b) => a.nome.localeCompare(b.nome)));
      setSenhaMostrada({ conta: data.usuario, senha: data.senhaTemporaria });
      setNova(CONTA_VAZIA);
      toast.success(`Conta de ${data.usuario.nome} criada.`);
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível criar a conta."));
    } finally {
      setCriando(false);
    }
  };

  const alterar = async (conta, mudancas, aviso) => {
    setOcupada(conta.id);
    try {
      const { data } = await axios.patch(`/usuarios/${conta.id}`, mudancas);
      setContas((atuais) => atuais.map((c) => (c.id === data.id ? data : c)));
      toast.success(aviso);
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível alterar a conta."));
    } finally {
      setOcupada(null);
    }
  };

  const novaSenha = async (conta) => {
    const ok = window.confirm(
      `Gerar uma nova senha temporária para ${conta.nome}? A senha atual dela deixa de funcionar.`
    );
    if (!ok) return;
    setOcupada(conta.id);
    try {
      const { data } = await axios.post(`/usuarios/${conta.id}/nova-senha`);
      setContas((atuais) => atuais.map((c) => (c.id === data.usuario.id ? data.usuario : c)));
      setSenhaMostrada({ conta: data.usuario, senha: data.senhaTemporaria });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(mensagemDoErro(error, "Não foi possível gerar a nova senha."));
    } finally {
      setOcupada(null);
    }
  };

  return (
    <div className="container form-page">
      <header className="form-page__head">
        <p className="eyebrow">Área do professor</p>
        <h1>Contas</h1>
        <p>
          Cada professor ou aluno entra com a própria conta. <strong>Autores</strong> publicam projetos e editam só os
          seus; <strong>administradores</strong> mexem em tudo, nas contas e no backup.
        </p>
      </header>

      <div className="form">
        {senhaMostrada && (
          <SenhaTemporaria
            conta={senhaMostrada.conta}
            senha={senhaMostrada.senha}
            onFechar={() => setSenhaMostrada(null)}
          />
        )}

        <form className="form__section" onSubmit={criar}>
          <div className="form__section-head">
            <span className="form__num">I</span>
            <h2>Nova conta</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="conta-nome"
              name="nome"
              rotulo="Nome"
              placeholder="Ex.: Ana Beatriz Costa"
              value={nova.nome}
              onChange={(e) => setNova((a) => ({ ...a, nome: e.target.value }))}
              autoComplete="off"
              required
            />
            <Campo
              id="conta-email"
              name="email"
              type="email"
              rotulo="E-mail"
              dica="É com ele que a pessoa vai entrar"
              value={nova.email}
              onChange={(e) => setNova((a) => ({ ...a, email: e.target.value }))}
              autoComplete="off"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            <fieldset className="field">
              <legend className="field__label">Papel</legend>
              <div className="chips">
                {[
                  { valor: "autor", rotulo: "Autor — publica e edita os próprios projetos" },
                  { valor: "admin", rotulo: "Administrador — tudo, inclusive contas e backup" },
                ].map((opcao) => (
                  <label key={opcao.valor} className="chip">
                    <input
                      type="radio"
                      name="papel"
                      value={opcao.valor}
                      checked={nova.papel === opcao.valor}
                      onChange={() => setNova((a) => ({ ...a, papel: opcao.valor }))}
                    />
                    {opcao.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div>
            <button type="submit" className="btn btn--primary" disabled={criando}>
              {criando ? "Criando…" : "Criar conta"}
            </button>
          </div>
        </form>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">II</span>
            <h2>Contas existentes</h2>
          </div>

          {contas === null && <p className="backup__texto">Carregando…</p>}
          {contas?.length === 0 && (
            <p className="backup__texto">Nenhuma conta ainda. Crie a primeira acima.</p>
          )}

          {contas?.length > 0 && (
            <ul className="contas-lista">
              {contas.map((conta) => {
                const souEu = conta.id === usuario.id;
                return (
                  <li key={conta.id} className="conta-linha" data-ativa={conta.ativo}>
                    <span className="conta__avatar" aria-hidden="true">
                      {iniciais(conta.nome)}
                    </span>
                    <div className="conta-linha__info">
                      <p className="conta-linha__nome">
                        {conta.nome}
                        {souEu && <span className="conta-linha__voce"> (você)</span>}
                      </p>
                      <p className="conta-linha__email">{conta.email}</p>
                      <p className="conta-linha__selos">
                        <span className="selo">{ROTULO_PAPEL[conta.papel]}</span>
                        {!conta.ativo && <span className="selo selo--alerta">Desativada</span>}
                        {conta.ativo && conta.trocarSenha && <span className="selo">Senha temporária</span>}
                      </p>
                    </div>
                    <div className="conta-linha__acoes">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={souEu || ocupada === conta.id}
                        onClick={() =>
                          alterar(
                            conta,
                            { papel: conta.papel === "admin" ? "autor" : "admin" },
                            conta.papel === "admin" ? `${conta.nome} agora é autor.` : `${conta.nome} agora é administrador.`
                          )
                        }
                      >
                        {conta.papel === "admin" ? "Tornar autor" : "Tornar administrador"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={ocupada === conta.id || !conta.ativo}
                        onClick={() => novaSenha(conta)}
                      >
                        Nova senha
                      </button>
                      <button
                        type="button"
                        className={`btn btn--sm ${conta.ativo ? "btn--danger" : "btn--ghost"}`}
                        disabled={souEu || ocupada === conta.id}
                        onClick={() =>
                          alterar(
                            conta,
                            { ativo: !conta.ativo },
                            conta.ativo ? `A conta de ${conta.nome} foi desativada.` : `A conta de ${conta.nome} foi reativada.`
                          )
                        }
                      >
                        {conta.ativo ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default Contas;
