import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./AuthContext"; // Importando o hook de autenticação

function ProjetoDetalhes() {
  const { id } = useParams(); // Pega o ID do projeto da URL
  const [projeto, setProjeto] = useState(null); // Estado para armazenar os dados do projeto
  const [erro, setErro] = useState(null); // Estado para mensagens de erro
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
      axios
        .delete(`/projetos/${id}`)
        .then(() => {
          alert("Projeto apagado com sucesso!");
          navigate("/"); // Redireciona para a página inicial após exclusão
        })
        .catch((error) => {
          console.error("Erro ao excluir o projeto:", error);
          alert("Erro ao excluir o projeto. Tente novamente.");
        });
    }
  };

  // Exibe uma mensagem de erro, se houver
  if (erro) {
    return <p>{erro}</p>;
  }

  // Exibe um carregamento enquanto os dados estão sendo buscados
  if (!projeto) {
    return <p>Carregando...</p>;
  }

  // Renderiza os detalhes do projeto
  return (
    <div className="projeto-detalhes">
      <Link to="/" className="link">← Voltar</Link>
      <h1>{projeto.titulo}</h1>
      
      {/* Exibe a imagem, se existir */}
      {projeto.imagem && <img src={projeto.imagem} alt={projeto.titulo} />}

      <h3>Descrição Geral:</h3>
      <p>{projeto.descricaoGeral}</p>

      <h3>Processo de Construção:</h3>
      <h4>Materiais Necessários:</h4>
      <ul>
        {projeto.materiais &&
          projeto.materiais.split(";").map((material, index) => (
            <li key={index}>{material.trim()}</li>
          ))}
      </ul>

      <h4>Passo a Passo:</h4>
<div>
  {/* Verifica se o campo 'passoAPasso' não está vazio e o exibe como texto */}
  {projeto.passoAPasso &&
    projeto.passoAPasso.split(";").map((etapa, index) => (
      <p key={index}>{etapa.trim()}</p>
    ))}
  
 {/* Verifica se há imagens no campo 'imagensPassoAPasso' */}
{projeto.imagensPassoAPasso && projeto.imagensPassoAPasso.length > 0 ? (
  projeto.imagensPassoAPasso.map((url, index) => (
    <div className="imagem-container" key={index}>
      <img
        src={url}
        alt={`Imagem do Passo ${index + 1}`}
        className="imagem-passo"
        loading="lazy"
      />
    </div>
  ))
) : (
  <p></p>
)}

</div>

      <h3>Instruções de Uso:</h3>
      <h4>Como Tocar/Como Jogar:</h4>
      <p>
        {projeto.comoTocar} {projeto.comoJogar}
      </p>

      <h3>Aplicação Didática:</h3>
      <h4>Sugestões de Atividades:</h4>
      <p>{projeto.sugestoesAtividades}</p>
      <h4>Habilidades Musicais Desenvolvidas:</h4>
      <p>{projeto.habilidadesMusicais}</p>

      {/* Seção de Referências */}
      {projeto.referencias && (
        <>
          <h3>Referências:</h3>
          <p>{projeto.referencias}</p>
        </>
      )}

      <p>Adicionado por: {projeto.autor} em {projeto.data}</p>

      {/* Botão de edição aparece apenas se o usuário estiver logado */}
      {isAuthenticated && (
        <Link to={`/editar-projeto/${id}`}>
          <button className="edit-button">Editar Projeto</button>
        </Link>
      )}

      {/* Botão de apagar aparece apenas se o usuário estiver logado */}
      {isAuthenticated && (
        <button className="delete-button" onClick={handleDelete}>
          Apagar Projeto
        </button>
      )}

      <Link to="/" className="link">← Voltar</Link>
    </div>
  );
}

export default ProjetoDetalhes;
