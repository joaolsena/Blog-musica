import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Logo from "./Logo";
import { BotaoTema } from "./Tema";

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [rolou, setRolou] = useState(false);
  const location = useLocation();

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  // Cabeçalho ganha borda e fundo mais sólido depois que a página rola
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 8);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  // Com o menu aberto no celular: trava a rolagem da página e fecha com Esc
  useEffect(() => {
    if (!menuAberto) return undefined;
    const aoTeclar = (e) => e.key === "Escape" && setMenuAberto(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [menuAberto]);

  const links = [
    { to: "/", rotulo: "Projetos", end: true },
    { to: "/Ensine-Musica", rotulo: "Sobre" },
  ];

  return (
    <>
      <header
        className={`header${rolou ? " is-scrolled" : ""}${menuAberto ? " is-menu-open" : ""}`}
      >
        <div className="header__inner">
          <Link
            to="/"
            className="header__brand"
            aria-label="Ensine Música — página inicial"
          >
            <Logo />
          </Link>

          <nav className="header__nav" aria-label="Navegação principal">
            <ul className="nav-list">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} className="nav-link">
                    {link.rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="header__actions">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/adicionar-projeto"
                    className="btn btn--primary btn--sm"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Novo projeto
                  </Link>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={logout}
                  >
                    Sair
                  </button>
                </>
              ) : (
                <NavLink to="/login" className="nav-link nav-link--quiet">
                  Entrar
                </NavLink>
              )}
            </div>
          </nav>

          <div className="header__end">
            <BotaoTema />
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              aria-controls="menu-mobile"
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Menu do celular. Fica fora do <header> porque o backdrop-filter do cabeçalho
          faria o position: fixed se posicionar dentro dele, cortando o menu. */}
      <div
        id="menu-mobile"
        className={`mobile-menu${menuAberto ? " is-open" : ""}`}
        aria-hidden={!menuAberto}
        inert={menuAberto ? undefined : ""}
      >
        <ul>
          {links.map((link, index) => (
            <li key={link.to} style={{ "--i": index }}>
              <NavLink
                to={link.to}
                end={link.end}
                className="mobile-menu__link"
              >
                {link.rotulo}
              </NavLink>
            </li>
          ))}
          {isAuthenticated ? (
            <>
              <li style={{ "--i": links.length }}>
                <NavLink to="/adicionar-projeto" className="mobile-menu__link">
                  Novo projeto
                </NavLink>
              </li>
              <li style={{ "--i": links.length + 1 }}>
                <button
                  type="button"
                  className="mobile-menu__link"
                  onClick={logout}
                >
                  Sair
                </button>
              </li>
            </>
          ) : (
            <li style={{ "--i": links.length }}>
              <NavLink to="/login" className="mobile-menu__link">
                Entrar
              </NavLink>
            </li>
          )}
        </ul>
      </div>
    </>
  );
}

export default Navbar;
