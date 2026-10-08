import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Logo from "./Logo";
import { BotaoInstalar } from "./InstalarApp";
import { BotaoBusca } from "./Busca";
import MenuConta, { ROTULO_PAPEL, iniciais } from "./MenuConta";
import { BotaoTema } from "./Tema";
import { atualizarContagem, useContagemModeracao, zerarContagem } from "./contagemModeracao";

// Ícones dos links no menu do celular
const ICONES = {
  projetos: (
    <>
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  planos: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8.5 10h7M8.5 14h7M8.5 18h4" />
    </>
  ),
  forum: (
    <>
      <path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.3A7.5 7.5 0 1 1 20 12.5z" />
    </>
  ),
  sobre: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
};

function IconeMenu({ nome }) {
  return (
    <svg className="menu-painel__icone" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nome]}
    </svg>
  );
}

function Navbar() {
  const { isAuthenticated, ehAdmin, logout, usuario } = useAuth();
  const pendentes = useContagemModeracao();
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenu = useRef(null);
  const painel = useRef(null);
  const [rolou, setRolou] = useState(false);
  const location = useLocation();

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  // Mensagens esperando aprovação: confere ao entrar e ao trocar de página
  useEffect(() => {
    if (isAuthenticated) atualizarContagem();
    else zerarContagem();
  }, [isAuthenticated, location.pathname]);

  // Cabeçalho ganha borda e fundo mais sólido depois que a página rola
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 8);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  // Fecha o menu do celular e devolve o foco ao botão (para quem usa teclado ou leitor de tela)
  const fecharMenu = useCallback(() => {
    setMenuAberto(false);
    botaoMenu.current?.focus({ preventScroll: true });
  }, []);

  // Com o menu aberto no celular: o foco entra no painel, o Tab circula só entre o botão e
  // os itens do painel (sem cair na página escurecida atrás) e Esc fecha
  useEffect(() => {
    if (!menuAberto) return undefined;
    const focaveis = () =>
      [botaoMenu.current, ...painel.current.querySelectorAll("a[href], button:not([disabled])")].filter(
        (el) => el.getClientRects().length > 0 // só os visíveis
      );
    focaveis()[1]?.focus({ preventScroll: true });
    const aoTeclar = (e) => {
      if (e.key === "Escape") {
        fecharMenu();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = focaveis();
      const atual = lista.indexOf(document.activeElement);
      if (e.shiftKey && atual <= 0) {
        e.preventDefault();
        lista[lista.length - 1].focus();
      } else if (!e.shiftKey && (atual === -1 || atual === lista.length - 1)) {
        e.preventDefault();
        lista[0].focus();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [menuAberto, fecharMenu]);

  const links = [
    { to: "/", rotulo: "Projetos", end: true, icone: "projetos" },
    { to: "/planos", rotulo: "Planos de aula", icone: "planos" },
    { to: "/forum", rotulo: "Fórum", icone: "forum" },
    { to: "/Ensine-Musica", rotulo: "Sobre", icone: "sobre" },
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
                  <MenuConta />
                </>
              ) : (
                <NavLink to="/login" className="nav-link nav-link--quiet">
                  Entrar
                </NavLink>
              )}
            </div>
          </nav>

          <div className="header__end">
            <BotaoBusca />
            <BotaoInstalar />
            <BotaoTema />
            <button
              ref={botaoMenu}
              type="button"
              className="menu-toggle"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              aria-controls="menu-mobile"
              onClick={() => (menuAberto ? fecharMenu() : setMenuAberto(true))}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Menu do celular: um painel que abre a partir do botão, sem cobrir a tela toda.
          Fica fora do <header> porque o backdrop-filter do cabeçalho faria o position: fixed
          se posicionar dentro dele. */}
      <div
        className={`menu-painel__fundo${menuAberto ? " is-open" : ""}`}
        onClick={fecharMenu}
        aria-hidden="true"
      />
      <nav
        ref={painel}
        id="menu-mobile"
        className={`menu-painel${menuAberto ? " is-open" : ""}`}
        aria-label="Menu"
        aria-hidden={!menuAberto}
        inert={menuAberto ? undefined : ""}
      >
        <ul className="menu-painel__lista">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end} className="menu-painel__link">
                <IconeMenu nome={link.icone} />
                {link.rotulo}
              </NavLink>
            </li>
          ))}
          <li className="menu-painel__so-estreito">
            <BotaoInstalar variante="menu" />
          </li>
        </ul>

        {isAuthenticated ? (
          <div className="menu-painel__conta">
            <div className="menu-painel__quem">
              <span className="conta__avatar" aria-hidden="true">
                {iniciais(usuario?.nome)}
              </span>
              <span>
                <strong>{usuario?.nome}</strong>
                {usuario?.nome !== ROTULO_PAPEL[usuario?.papel] && <span>{ROTULO_PAPEL[usuario?.papel]}</span>}
              </span>
            </div>
            <div className="menu-painel__criar">
              <Link to="/adicionar-projeto" className="btn btn--primary btn--sm">
                + Projeto
              </Link>
              <Link to="/novo-plano" className="btn btn--ghost btn--sm">
                + Plano de aula
              </Link>
            </div>
            <ul className="menu-painel__lista menu-painel__lista--conta">
              {[
                { to: "/moderacao", rotulo: "Moderação", contagem: pendentes },
                { to: "/minha-conta", rotulo: "Minha conta" },
                ...(ehAdmin
                  ? [
                      { to: "/contas", rotulo: "Contas" },
                      { to: "/backup", rotulo: "Backup" },
                    ]
                  : []),
              ].map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} className="menu-painel__link menu-painel__link--conta">
                    {link.rotulo}
                    {link.contagem > 0 && (
                      <span className="contagem-pendentes" aria-label={`${link.contagem} esperando aprovação`}>
                        {link.contagem}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
              <li>
                <button type="button" className="menu-painel__link menu-painel__link--conta menu-painel__sair" onClick={logout}>
                  Sair
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="menu-painel__conta">
            <NavLink to="/login" className="menu-painel__link menu-painel__link--conta">
              Entrar como professor
            </NavLink>
          </div>
        )}
      </nav>
    </>
  );
}

export default Navbar;
