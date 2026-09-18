import React from "react";

function Header() {
  return (
    <header className="site-header">
      <img
        className="site-header__media"
        src="/imagens/logo.jpeg"
        alt="Instrumentos musicais artesanais feitos com materiais reaproveitados"
      />
      <div className="site-header__caption">
        <p>Instrumentos, jogos e ideias para o ensino musical, feitos à mão.</p>
      </div>
    </header>
  );
}

export default Header;
