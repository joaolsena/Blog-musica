import React from "react";
import { Link } from "react-router-dom";
import { BotaoInstalar } from "./InstalarApp";
import Logo from "./Logo";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__top">
          <div className="footer__brand">
            <Logo size={28} />
            <p>Instrumentos e jogos musicais feitos com materiais alternativos, para inspirar quem ensina música.</p>
          </div>

          <nav className="footer__nav" aria-label="Rodapé">
            <Link to="/">Projetos</Link>
            <Link to="/planos">Planos de aula</Link>
            <Link to="/forum">Fórum</Link>
            <Link to="/Ensine-Musica">Sobre</Link>
            <BotaoInstalar variante="link" />
          </nav>
        </div>

        <p className="footer__credit">
          &copy; {new Date().getFullYear()} Ensine Música. Todos os direitos reservados. Desenvolvido por{" "}
          <a href="mailto:joaolsena129@gmail.com">João Sena</a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
