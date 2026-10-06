import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Pauta from "./Pauta";

// Página para endereços que não existem (link errado ou antigo)
function NaoEncontrado({
  titulo = "Esta nota está fora da pauta",
  texto = "A página que você procurou não existe ou mudou de endereço.",
}) {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = "Página não encontrada — Ensine Música";
    return () => {
      document.title = tituloAnterior;
    };
  }, []);

  return (
    <div className="container nao-encontrado">
      <p className="eyebrow">Erro 404</p>
      <h1>{titulo}</h1>
      <p className="nao-encontrado__texto">{texto}</p>
      <Pauta className="nao-encontrado__pauta" />
      <Link to="/" className="btn btn--primary btn--lg">
        Ver todos os projetos
      </Link>
    </div>
  );
}

export default NaoEncontrado;
