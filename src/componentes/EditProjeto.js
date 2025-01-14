import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // Importa o AuthContext

function EditProjeto() {
  const { id } = useParams(); // Obtém o ID do projeto da URL
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth(); // Verifica se o usuário está autenticado

  const [projeto, setProjeto] = useState({
    titulo: "",
    descricaoGeral: "",
    materiais: "",
    passoAPasso: "",
    comoTocar: "",
    comoJogar: "",
    sugestoesAtividades: "",
    habilidadesMusicais: "",
    autor: "",
    referencias: "",
  });

  // Se não estiver autenticado, redireciona para a página de login
  useEffect(() => {
    if (!isAuthenticated) {
      alert("Você precisa estar logado para acessar esta página!");
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Busca os dados do projeto atual para pré-popular o formulário
  useEffect(() => {
    const fetchProjeto = async () => {
      try {
        const response = await fetch(`/projetos/${id}`);
        const data = await response.json();
        setProjeto(data);
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
      }
    };
    fetchProjeto();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjeto((prevProjeto) => ({ ...prevProjeto, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/projetos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projeto),
      });

      if (response.ok) {
        alert("Projeto atualizado com sucesso!");
        navigate("/");
      } else {
        alert("Erro ao atualizar o projeto!");
      }
    } catch (error) {
      console.error("Erro ao editar projeto:", error);
    }
  };

  return (
    <div className="edit-container">
      <h2>Editar Projeto</h2>
      <form onSubmit={handleSubmit}>
        <label>Título:</label>
        <input
          type="text"
          name="titulo"
          value={projeto.titulo}
          onChange={handleChange}
        />

        <label>Descrição Geral:</label>
        <textarea
          name="descricaoGeral"
          value={projeto.descricaoGeral}
          onChange={handleChange}
        />

        <label>Materiais:</label>
        <textarea
          name="materiais"
          value={projeto.materiais}
          onChange={handleChange}
        />

        <label>Passo a Passo:</label>
        <textarea
          name="passoAPasso"
          value={projeto.passoAPasso}
          onChange={handleChange}
        />

        <label>Como Tocar:</label>
        <textarea
          name="comoTocar"
          value={projeto.comoTocar}
          onChange={handleChange}
        />

        <label>Como Jogar:</label>
        <textarea
          name="comoJogar"
          value={projeto.comoJogar}
          onChange={handleChange}
        />

        <label>Sugestões de Atividades:</label>
        <textarea
          name="sugestoesAtividades"
          value={projeto.sugestoesAtividades}
          onChange={handleChange}
        />

        <label>Habilidades Musicais:</label>
        <textarea
          name="habilidadesMusicais"
          value={projeto.habilidadesMusicais}
          onChange={handleChange}
        />

        <label>Autor:</label>
        <input
          type="text"
          name="autor"
          value={projeto.autor}
          onChange={handleChange}
        />

        <label>Referências:</label>
        <textarea
          name="referencias"
          value={projeto.referencias}
          onChange={handleChange}
        />

        <button type="submit" className="save-button">
          Salvar Alterações
        </button>
      </form>
    </div>
  );
}

export default EditProjeto;
