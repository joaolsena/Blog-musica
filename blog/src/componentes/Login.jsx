import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { LogoMark } from "./Logo";

const Login = () => {
  const [email, setEmail] = useState("");
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
    const { resultado, usuario } = await login(email, password);
    setEntrando(false);

    if (resultado === "ok") {
      // Senha temporária (conta nova ou senha gerada de novo): pede uma senha própria
      if (usuario?.trocarSenha) {
        toast("Crie uma senha só sua para continuar.");
        navigate("/minha-conta");
        return;
      }
      const primeiroNome = usuario?.principal ? "" : `, ${usuario?.nome?.split(" ")[0]}`;
      toast.success(`Bem-vindo de volta${primeiroNome}!`);
      navigate("/"); // Redireciona para a página inicial após o login
      return;
    }

    setErro(
      {
        "senha-incorreta": email.trim() ? "E-mail ou senha incorretos." : "Senha incorreta. Tente novamente.",
        "email-obrigatorio": "Informe o e-mail da sua conta.",
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
        <p className="auth__hint">Entre com o e-mail e a senha da sua conta.</p>

        <div className="field">
          <label htmlFor="login-email" className="field__label">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(null);
            }}
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            autoFocus
            aria-describedby="login-email-dica"
          />
          <p id="login-email-dica" className="field__hint">
            Para entrar com a senha principal do site, deixe em branco.
          </p>
        </div>

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
