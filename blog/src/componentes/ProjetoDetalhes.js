import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./AuthContext"; // Importando o hook de autenticação
import Waveform from "./Waveform";

function ProjetoDetalhes() {
  const { id } = useParams(); // Pega o ID do projeto da URL
  const [projeto, setProjeto] = useState(null); // Estado para armazenar os dados do projeto
  const [erro, setErro] = useState(null); // Estado para mensagens de erro
  const [excluindo, setExcluindo] = useState(false);
  const { isAuthenticated } = useAuth(); // Verifica se o usuário está logado
  const navigate = useNavigate(); // Navegação após exclusão

  useEffect(() => {
    if (!id) {
      setErro("ID do projeto não encontrado.");
      return;
    }

    // Busca o projeto específico pelo ID
    axios
      .get(`/projetos/${id}`)
      .then((response) => {
        setProjeto(response.data);
        setErro(null); // Limpa mensagens de erro, se houver
      })
      .catch((error) => {
        setErro("Erro ao carregar o projeto. Tente novamente.");
        console.error("Erro ao carregar projeto:", error);
      });
  }, [id]);

  // Função para excluir o projeto
  const handleDelete = () => {
    const confirmDelete = window.confirm("Tem certeza que deseja apagar este projeto?");

    if (confirmDelete) {
      setExcluindo(true);
      axios
        .delete(`/projetos/${id}`)
        .then(() => {
          alert("Projeto apagado com sucesso!");
          navigate("/"); // Redireciona para a página inicial após exclusão
        })
        .catch((error) => {
          console.error("Erro ao excluir o projeto:", error);
          alert("Erro ao excluir o projeto. Tente novamente.");
        })
        .finally(() => setExcluindo(false));
    }
  };

  // Exibe uma mensagem de erro, se houver
  if (erro) {
    return (
      <div className="container">
        <p className="state-message">{erro}</p>
      </div>
    );
  }

  // Exibe um carregamento enquanto os dados estão sendo buscados
  if (!projeto) {
    return (
      <div className="container">
        <p className="state-message">Carregando projeto...</p>
      </div>
    );
  }

  const materiais = projeto.materiais
    ? projeto.materiais.split(";").map((item) => item.trim()).filter(Boolean)
    : [];

  const etapasPassoAPasso = projeto.passoAPasso
    ? projeto.passoAPasso.split(";").map((item) => item.trim()).filter(Boolean)
    : [];

  const instrucaoUso = [projeto.comoTocar, projeto.comoJogar].filter(Boolean).join(" ");

  return (
    <div className="projeto-detalhes">
      <Link to="/" className="projeto-detalhes__back">
        ← Voltar para projetos
      </Link>

      <div className="projeto-detalhes__head">
        {projeto.tipoProjeto && (
          <span className={`badge badge--${projeto.tipoProjeto}`}>
            {projeto.tipoProjeto === "jogo" ? "Jogo" : "Instrumento"}
          </span>
        )}
        <h1>{projeto.titulo}</h1>
        <Waveform />
        <div className="projeto-detalhes__meta">
          <span>Adicionado por {projeto.autor}</span>
          <span aria-hidden="true">•</span>
          <span>{projeto.data}</span>
        </div>
      </div>

      {/* Exibe a imagem, se existir */}
      {projeto.imagem && (
        <div className="projeto-detalhes__media">
          <img src={projeto.imagem} alt={projeto.titulo} />
        </div>
      )}

      <section>
        <h3>Descrição geral</h3>
        <p>{projeto.descricaoGeral}</p>
      </section>

      <section>
        <h3>Processo de construção</h3>
        {materiais.length > 0 && (
          <>
            <h4>Materiais necessários</h4>
            <ul className="materiais-lista">
              {materiais.map((material, index) => (
                <li key={index}>{material}</li>
              ))}
            </ul>
          </>
        )}

        {(etapasPassoAPasso.length > 0 || (projeto.imagensPassoAPasso && projeto.imagensPassoAPasso.length > 0)) && (
          <>
            <h4>Passo a passo</h4>
            {etapasPassoAPasso.map((etapa, index) => (
              <p className="passo-etapa" key={index}>{etapa}</p>
            ))}

            {projeto.imagensPassoAPasso && projeto.imagensPassoAPasso.length > 0 && (
              <div className="imagens-passo-grid">
                {projeto.imagensPassoAPasso.map((url, index) => (
                  <div className="imagem-container" key={index}>
                    <img
                      src={url}
                      alt={`Passo ${index + 1} da construção`}
                      className="imagem-passo"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {instrucaoUso && (
        <section>
          <h3>Instruções de uso</h3>
          <h4>Como tocar / como jogar</h4>
          <p>{instrucaoUso}</p>
        </section>
      )}

      {(projeto.sugestoesAtividades || projeto.habilidadesMusicais) && (
        <section>
          <h3>Aplicação didática</h3>
          {projeto.sugestoesAtividades && (
            <>
              <h4>Sugestões de atividades</h4>
              <p>{projeto.sugestoesAtividades}</p>
            </>
          )}
          {projeto.habilidadesMusicais && (
            <>
              <h4>Habilidades musicais desenvolvidas</h4>
              <p>{projeto.habilidadesMusicais}</p>
            </>
          )}
        </section>
      )}

      {/* Seção de Referências */}
      {projeto.referencias && (
        <section>
          <h3>Referências</h3>
          <p>{projeto.referencias}</p>
        </section>
      )}

      {isAuthenticated && (
        <div className="projeto-detalhes__actions">
          <Link to={`/editar-projeto/${id}`} className="btn btn-secondary">
            Editar projeto
          </Link>
          <button className="btn btn-danger" onClick={handleDelete} disabled={excluindo}>
            {excluindo ? "Apagando..." : "Apagar projeto"}
          </button>
        </div>
      )}

      <Link to="/" className="projeto-detalhes__back">
        ← Voltar para projetos
      </Link>
    </div>
  );
}

export default ProjetoDetalhes;
