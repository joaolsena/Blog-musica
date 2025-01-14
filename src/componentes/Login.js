import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    // Verifica se a senha foi preenchida
    if (!password) {
      alert("Por favor, insira a senha.");
      return;
    }

    // Tenta realizar o login
    if (login(password)) {
      navigate("/"); // Redireciona para a página inicial após o login
    } else {
      alert("Senha incorreta!");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Digite a senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="password-input"  
        />
        <button type="submit" className="login-button">Entrar</button> 
      </form>
    </div>
  );
};

export default Login;
