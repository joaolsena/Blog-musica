import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { Campo } from "./CamposFormulario";
import { ROTULO_PAPEL, iniciais } from "./MenuConta";

const TAMANHO_MINIMO_SENHA = 8; // deve bater com o servidor (server.js)

function MinhaConta() {
  const { usuario, atualizarUsuario } = useAuth();
  const navigate = useNavigate();
  const [senhas, setSenhas] = useState({ senhaAtual: "", novaSenha: "", confirmacao: "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const atualizar = (e) => {
    setSenhas((atual) => ({ ...atual, [e.target.name]: e.target.value }));
    setErro(null);
  };

  const trocarSenha = async (e) => {
    e.preventDefault();
    if (senhas.novaSenha.length < TAMANHO_MINIMO_SENHA) {
      setErro(`A nova senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
      return;
    }
    if (senhas.novaSenha !== senhas.confirmacao) {
      setErro("A confirmação não é igual à nova senha.");
      return;
    }
    setSalvando(true);
    try {
      await axios.post("/auth/senha", { senhaAtual: senhas.senhaAtual, novaSenha: senhas.novaSenha });
      const eraTemporaria = usuario.trocarSenha;
      atualizarUsuario({ trocarSenha: false });
      setSenhas({ senhaAtual: "", novaSenha: "", confirmacao: "" });
      toast.success("Senha alterada.");
      if (eraTemporaria) navigate("/");
    } catch (error) {
      setErro(typeof error.response?.data === "string" ? error.response.data : "Não foi possível trocar a senha agora.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="container form-page">
      <header className="form-page__head">
        <p className="eyebrow">Área do professor</p>
        <h1>Minha conta</h1>
      </header>

      <div className="form">
        <section className="form__section">
          <div className="perfil">
            <span className="perfil__avatar" aria-hidden="true">
              {iniciais(usuario.nome)}
            </span>
            <div>
              <p className="perfil__nome">{usuario.nome}</p>
              <p className="perfil__detalhe">
                {usuario.email ? `${usuario.email} · ` : ""}
                {ROTULO_PAPEL[usuario.papel]}
              </p>
            </div>
          </div>
        </section>

        {usuario.principal ? (
          <section className="form__section">
            <div className="form__section-head">
              <h2>Senha principal</h2>
            </div>
            <p className="backup__texto">
              Você entrou com a senha principal do site. Ela continua funcionando como chave reserva, mas o
              ideal é cada pessoa ter a sua conta. Crie uma conta de administrador com o seu e-mail em{" "}
              <Link to="/contas" className="link">
                Contas
              </Link>{" "}
              e use-a no dia a dia. Depois disso, você pode apagar a senha principal (a variável ADMIN_PASSWORD, no
              Vercel): só as contas entram. Se um dia perder o acesso, é só recriá-la lá.
            </p>
          </section>
        ) : (
          <form className="form__section" onSubmit={trocarSenha}>
            <div className="form__section-head">
              <h2>{usuario.trocarSenha ? "Crie a sua senha" : "Trocar senha"}</h2>
            </div>
            {usuario.trocarSenha && (
              <p className="aviso-senha" role="status">
                Você entrou com uma senha temporária. Crie uma senha só sua para continuar.
              </p>
            )}
            <div className="form__fields">
              <Campo
                id="senhaAtual"
                name="senhaAtual"
                type="password"
                rotulo={usuario.trocarSenha ? "Senha temporária" : "Senha atual"}
                value={senhas.senhaAtual}
                onChange={atualizar}
                autoComplete="current-password"
                required
              />
              <Campo
                id="novaSenha"
                name="novaSenha"
                type="password"
                rotulo="Nova senha"
                dica={`Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`}
                value={senhas.novaSenha}
                onChange={atualizar}
                autoComplete="new-password"
                minLength={TAMANHO_MINIMO_SENHA}
                required
              />
              <Campo
                id="confirmacao"
                name="confirmacao"
                type="password"
                rotulo="Repita a nova senha"
                value={senhas.confirmacao}
                onChange={atualizar}
                autoComplete="new-password"
                required
              />
              {erro && (
                <p className="field__error" role="alert">
                  {erro}
                </p>
              )}
            </div>
            <div>
              <button type="submit" className="btn btn--primary" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar nova senha"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default MinhaConta;
