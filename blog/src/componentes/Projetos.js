import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function Projetos() {
  const [projetos, setProjetos] = useState([]);

  // Carregar projetos ao montar o componente
  useEffect(() => {
    axios
      .get("/projetos")
      .then((response) => {
        const projetosComIdString = response.data.map((projeto) => ({
          ...projeto,
          id: projeto._id, // Caso o backend use MongoDB, converte o ID
        }));
        
        // Ordenar os projetos pelo título em ordem alfabética
        projetosComIdString.sort((a, b) => a.titulo.localeCompare(b.titulo));

        setProjetos(projetosComIdString);
      })
      .catch((error) => console.error("Erro ao carregar projetos:", error));
  }, []);

  return (
    <div className="container">
      <h2>Lista de Projetos</h2>
      <div className="lista-projetos">
        {projetos.map((projeto) => (
          <div className="trabalho" key={projeto.id}>
            <Link className="titulo-link" to={`/projeto/${projeto.id}`}>
              <h3>{projeto.titulo}</h3>
            </Link>
            {projeto.imagem && (
              <Link to={`/projeto/${projeto.id}`}>
                <img src={projeto.imagem} alt={projeto.titulo} loading="lazy"/>
              </Link>
            )}
            <span>
              Adicionado por: {projeto.autor} em {projeto.data}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Projetos;
