import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "./AuthContext"; // Importando o hook para obter o estado de autenticação

// Marca decorativa inspirada na roseta (boca) do violão.
// Gira como um vinil quando alguém clica — um pequeno easter egg.
function RosetteMark({ girando }) {
  const raios = Array.from({ length: 8 });
  return (
    <svg
      className={`site-header__mark${girando ? " is-spinning" : ""}`}
      width="30"
      height="30"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="2.6" fill="currentColor" />
      {raios.map((_, index) => (
        <line
          key={index}
          x1="20"
          y1="9.5"
          x2="20"
          y2="13.5"
          stroke="currentColor"
          strokeWidth="1.1"
          transform={`rotate(${index * 45} 20 20)`}
        />
      ))}
    </svg>
  );
}

function Navbar() {
  const { isAuthenticated, logout } = useAuth(); // Pegando o estado de autenticação
  const [menuAberto, setMenuAberto] = useState(false);
  const [girando, setGirando] = useState(false);

  const fecharMenu = () => setMenuAberto(false);

  const girarLogo = () => {
    setGirando(true);
    window.setTimeout(() => setGirando(false), 700);
  };

  const linkClasse = ({ isActive }) => (isActive ? "is-active" : undefined);

  return (
    <header className="site-header">
      <div className="navbar__inner">
        <NavLink
          to="/"
          className="site-header__brand"
          onClick={() => {
            fecharMenu();
            girarLogo();
          }}
        >
          <RosetteMark girando={girando} />
          <span className="site-header__wordmark">Ensine Música</span>
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

        <nav aria-label="Navegação principal">
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
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
