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
    tipoProjeto: "instrumento",
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

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
        setProjeto((prev) => ({ ...prev, ...data }));
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
      } finally {
        setCarregando(false);
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
    setSalvando(true);
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
      alert("Erro ao atualizar o projeto!");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="edit-container">
        <p className="state-message">Carregando projeto...</p>
      </div>
    );
  }

  return (
    <div className="edit-container">
      <h2>Editar projeto</h2>
      <form onSubmit={handleSubmit}>
        <fieldset className="form-fieldset">
          <legend>Informações gerais</legend>

          <div className="form-field">
            <label htmlFor="edit-titulo">Título</label>
            <input
              id="edit-titulo"
              type="text"
              name="titulo"
              value={projeto.titulo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-descricaoGeral">Descrição geral</label>
            <textarea
              id="edit-descricaoGeral"
              name="descricaoGeral"
              value={projeto.descricaoGeral}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-field">
            <label>Tipo de projeto</label>
            <div className="toggle-group">
              <label className={projeto.tipoProjeto === "instrumento" ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="tipoProjeto"
                  value="instrumento"
                  checked={projeto.tipoProjeto === "instrumento"}
                  onChange={handleChange}
                />
                Instrumento
              </label>
              <label className={projeto.tipoProjeto === "jogo" ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="tipoProjeto"
                  value="jogo"
                  checked={projeto.tipoProjeto === "jogo"}
                  onChange={handleChange}
                />
                Jogo
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="form-fieldset">
          <legend>Construção</legend>

          <div className="form-field">
            <label htmlFor="edit-materiais">Materiais</label>
            <textarea
              id="edit-materiais"
              name="materiais"
              value={projeto.materiais}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-passoAPasso">Passo a passo</label>
            <textarea
              id="edit-passoAPasso"
              name="passoAPasso"
              value={projeto.passoAPasso}
              onChange={handleChange}
              rows="4"
            />
          </div>
        </fieldset>

        <fieldset className="form-fieldset">
          <legend>Instruções de uso</legend>

          <div className="form-field">
            <label htmlFor="edit-comoTocar">Como tocar</label>
            <textarea
              id="edit-comoTocar"
              name="comoTocar"
              value={projeto.comoTocar}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-comoJogar">Como jogar</label>
            <textarea
              id="edit-comoJogar"
              name="comoJogar"
              value={projeto.comoJogar}
              onChange={handleChange}
              rows="4"
            />
          </div>
        </fieldset>

        <fieldset className="form-fieldset">
          <legend>Aplicação didática</legend>

          <div className="form-field">
            <label htmlFor="edit-sugestoesAtividades">Sugestões de atividades</label>
            <textarea
              id="edit-sugestoesAtividades"
              name="sugestoesAtividades"
              value={projeto.sugestoesAtividades}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-habilidadesMusicais">Habilidades musicais</label>
            <textarea
              id="edit-habilidadesMusicais"
              name="habilidadesMusicais"
              value={projeto.habilidadesMusicais}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-referencias">Referências</label>
            <textarea
              id="edit-referencias"
              name="referencias"
              value={projeto.referencias}
              onChange={handleChange}
              rows="4"
            />
          </div>
        </fieldset>

        <fieldset className="form-fieldset">
          <legend>Autoria</legend>
          <div className="form-field">
            <label htmlFor="edit-autor">Autor</label>
            <input
              id="edit-autor"
              type="text"
              name="autor"
              value={projeto.autor}
              onChange={handleChange}
              required
            />
          </div>
        </fieldset>

        <div className="form-card__submit">
          <button type="submit" className="btn btn-primary save-button" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProjeto;
