import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "./AuthContext"; // Importando o hook para obter o estado de autenticação

function Navbar() {
  const { isAuthenticated, logout } = useAuth(); // Pegando o estado de autenticação
  const [menuAberto, setMenuAberto] = useState(false);

  const fecharMenu = () => setMenuAberto(false);

  const linkClasse = ({ isActive }) => (isActive ? "is-active" : undefined);

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <NavLink to="/" className="navbar__brand" onClick={fecharMenu}>
          Ensine Música
        </NavLink>

        <button
          type="button"
          className="navbar__toggle"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className={`navbar__list${menuAberto ? " is-open" : ""}`}>
          <li>
            <NavLink to="/" className={linkClasse} onClick={fecharMenu} end>
              Início
            </NavLink>
          </li>
          <li>
            <NavLink to="/Ensine-Musica" className={linkClasse} onClick={fecharMenu}>
              Sobre o Ensine Música
            </NavLink>
          </li>

          {/* Se o usuário estiver autenticado, mostra a opção de adicionar projeto */}
          {isAuthenticated && (
            <li>
              <NavLink to="/adicionar-projeto" className="navbar__cta" onClick={fecharMenu}>
                Adicionar Projeto
              </NavLink>
            </li>
          )}

          {/* Se o usuário estiver autenticado, mostra a opção de logout */}
          {isAuthenticated ? (
            <li>
              <button
                type="button"
                className="navbar__logout"
                onClick={() => {
                  logout();
                  fecharMenu();
                }}
              >
                Sair
              </button>
            </li>
          ) : (
            <li>
              <NavLink to="/login" className={linkClasse} onClick={fecharMenu}>
                Login
              </NavLink>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
