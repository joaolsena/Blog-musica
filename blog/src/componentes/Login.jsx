import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { LogoMark } from "./Logo";

const Login = () => {
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null); // mensagem de erro exibida abaixo do campo
  const [entrando, setEntrando] = useState(false);
  const [tremendo, setTremendo] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (entrando) return;

    // A senha é conferida pelo servidor
    setEntrando(true);
    const resultado = await login(password);
    setEntrando(false);

    if (resultado === "ok") {
      toast.success("Bem-vindo de volta!");
      navigate("/"); // Redireciona para a página inicial após o login
      return;
    }

    setErro(
      {
        "senha-incorreta": "Senha incorreta. Tente novamente.",
        bloqueado: "Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.",
      }[resultado] || "Não foi possível entrar agora. Tente novamente em instantes."
    );
    setTremendo(true);
  };

  return (
    <div className="container auth">
      <form
        className={`auth__card${tremendo ? " is-shaking" : ""}`}
        onSubmit={handleSubmit}
        onAnimationEnd={(e) => e.target === e.currentTarget && setTremendo(false)}
      >
        <LogoMark size={44} />
        <h1>Área do professor</h1>
        <p className="auth__hint">Digite a senha de acesso para gerenciar os projetos.</p>

        <div className="field">
          <label htmlFor="login-password" className="field__label">
            Senha
          </label>
          <input
            id="login-password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErro(null);
            }}
            autoComplete="current-password"
            enterKeyHint="go"
            required
            autoFocus
            aria-invalid={Boolean(erro) || undefined}
            aria-describedby={erro ? "login-erro" : undefined}
          />
          {erro && (
            <p id="login-erro" className="field__error" role="alert">
              {erro}
            </p>
          )}
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
};

export default Login;
