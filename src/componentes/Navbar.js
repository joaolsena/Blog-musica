import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext"; // Importando o hook para obter o estado de autenticação

function Navbar() {
  const { isAuthenticated, logout } = useAuth(); // Pegando o estado de autenticação

  return (
    <nav>
      <ul>
        <li><Link to="/">Início</Link></li>
        <li><Link to="/Ensine-Musica">Sobre o Ensine Música</Link></li>

        {/* Se o usuário estiver autenticado, mostra a opção de adicionar projeto */}
        {isAuthenticated && (
          <li><Link to="/adicionar-projeto">Adicionar Projeto</Link></li>
        )}

        {/* Se o usuário estiver autenticado, mostra a opção de logout */}
        {isAuthenticated ? (
          <li><button onClick={logout}>Sair</button></li>
        ) : (
          <li><Link to="/login">Login</Link></li>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
