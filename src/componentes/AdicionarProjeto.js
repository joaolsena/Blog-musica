import React, { useState } from "react";
import axios from "axios";

function AdicionarProjeto() {
  const [novoProjeto, setNovoProjeto] = useState({
    titulo: "",
    nomeMaterial: "",
    descricaoGeral: "",
    materiais: "",
    passoAPasso: "",
    comoTocar: "",
    comoJogar: "",
    sugestoesAtividades: "",
    habilidadesMusicais: "",
    autor: "",
    imagem: "",
    tipoProjeto: "instrumento",
    referencias: "",
    imagensPassoAPasso: [], // URLs das imagens do passo a passo
  });

  const [imagemPreview, setImagemPreview] = useState(null);
  const [imagensPassoPreview, setImagensPassoPreview] = useState([]); // Pré-visualização das imagens do passo a passo
  const [projetos, setProjetos] = useState([]);

  const handleAdicionarProjeto = (e) => {
    e.preventDefault();
    console.log("Enviando o formulário...");

    const formDataImagem = new FormData();
    const formDataPasso = new FormData();

    // Enviar imagem principal
    if (imagemPreview) {
      formDataImagem.append("imagem", imagemPreview); 
    }

    // Enviar imagens do passo a passo
    if (imagensPassoPreview.length > 0) {
      imagensPassoPreview.forEach((imagem) => {
        formDataPasso.append("imagensPassoAPasso", imagem); 
      });
    }

    // Enviar a imagem principal
    axios
      .post("/upload", formDataImagem, {
        onUploadProgress: (progressEvent) => {
          let percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload da Imagem Principal: ${percent}%`);
        },
      })
      .then((response) => {
        const imagemUrl = response.data.url; // URL da imagem principal

        // Se houver imagens do passo a passo, enviar depois
        if (imagensPassoPreview.length > 0) {
          axios
            .post("/upload-multiplas", formDataPasso, {
              onUploadProgress: (progressEvent) => {
                let percent = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                console.log(`Upload Passo a Passo Progress: ${percent}%`);
              },
            })
            .then((responsePasso) => {
              const imagensPassoURLs = responsePasso.data.urls || [];

              // Adicionar URLs das imagens ao projeto
              const projetoComImagens = {
                ...novoProjeto,
                imagem: imagemUrl || novoProjeto.imagem,
                imagensPassoAPasso: imagensPassoURLs,
              };

              // Enviar projeto ao backend
              axios
                .post("/adicionar", projetoComImagens)
                .then(() => {
                  setProjetos([...projetos, projetoComImagens]);
                  setNovoProjeto({
                    titulo: "",
                    nomeMaterial: "",
                    descricaoGeral: "",
                    materiais: "",
                    passoAPasso: "",
                    comoTocar: "",
                    comoJogar: "",
                    sugestoesAtividades: "",
                    habilidadesMusicais: "",
                    autor: "",
                    imagem: "",
                    tipoProjeto: "instrumento",
                    referencias: "",
                    imagensPassoAPasso: [],
                  });
                  setImagemPreview(null);
                  setImagensPassoPreview([]);
                })
                .catch((error) =>
                  console.error("Erro ao adicionar projeto:", error)
                );
            })
            .catch((error) =>
              console.error("Erro ao fazer upload das imagens do passo a passo:", error)
            );
        } else {
          // Caso não haja imagens do passo a passo
          const projetoComImagens = {
            ...novoProjeto,
            imagem: imagemUrl || novoProjeto.imagem,
            imagensPassoAPasso: [], // Caso não haja imagens do passo a passo
          };

          // Enviar projeto ao backend
          axios
            .post("/adicionar", projetoComImagens)
            .then(() => {
              setProjetos([...projetos, projetoComImagens]);
              setNovoProjeto({
                titulo: "",
                nomeMaterial: "",
                descricaoGeral: "",
                materiais: "",
                passoAPasso: "",
                comoTocar: "",
                comoJogar: "",
                sugestoesAtividades: "",
                habilidadesMusicais: "",
                autor: "",
                imagem: "",
                tipoProjeto: "instrumento",
                referencias: "",
                imagensPassoAPasso: [],
              });
              setImagemPreview(null);
              setImagensPassoPreview([]);
            })
            .catch((error) =>
              console.error("Erro ao adicionar projeto:", error)
            );
        }
      })
      .catch((error) =>
        console.error("Erro ao fazer upload da imagem principal:", error)
      );
  };
  

  return (
    <div>
      <form onSubmit={handleAdicionarProjeto}>
        <h2>Adicionar um Trabalho</h2>

        <input
          type="text"
          placeholder="Título do Trabalho"
          value={novoProjeto.titulo}
          onChange={(e) =>
            setNovoProjeto({ ...novoProjeto, titulo: e.target.value })
          }
          required
        />
        <textarea
          placeholder="Descrição Geral"
          value={novoProjeto.descricaoGeral}
          onChange={(e) =>
            setNovoProjeto({ ...novoProjeto, descricaoGeral: e.target.value })
          }
          rows="4"
          required
        ></textarea>
        <textarea
          placeholder="Materiais Necessários"
          value={novoProjeto.materiais}
          onChange={(e) =>
            setNovoProjeto({ ...novoProjeto, materiais: e.target.value })
          }
          rows="4"
          required
        ></textarea>
        <textarea
          placeholder="Passo a Passo"
          value={novoProjeto.passoAPasso}
          onChange={(e) =>
            setNovoProjeto({ ...novoProjeto, passoAPasso: e.target.value })
          }
          rows="4"
          required
        ></textarea>

        {/* Imagens do Passo a Passo */}
        <div>
          <label>Imagens do Passo a Passo:</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImagensPassoPreview([...e.target.files])}
          />
          <div>
            {imagensPassoPreview.map((imagem, index) => (
              <img
                key={index}
                src={URL.createObjectURL(imagem)}
                alt={`Passo ${index + 1}`}
                style={{ width: "100px", height: "100px", margin: "5px" }}
              />
            ))}
          </div>
        </div>

        {/* Tipo de Projeto */}
        <div>
          <label>
            <input
              type="radio"
              name="tipoProjeto"
              value="instrumento"
              checked={novoProjeto.tipoProjeto === "instrumento"}
              onChange={(e) =>
                setNovoProjeto({ ...novoProjeto, tipoProjeto: e.target.value })
              }
            />
            Instrumento
          </label>
          <label>
            <input
              type="radio"
              name="tipoProjeto"
              value="jogo"
              checked={novoProjeto.tipoProjeto === "jogo"}
              onChange={(e) =>
                setNovoProjeto({ ...novoProjeto, tipoProjeto: e.target.value })
              }
            />
            Jogo
          </label>
        </div>

        {novoProjeto.tipoProjeto === "instrumento" ? (
          <textarea
            placeholder="Como Tocar"
            value={novoProjeto.comoTocar}
            onChange={(e) =>
              setNovoProjeto({ ...novoProjeto, comoTocar: e.target.value })
            }
            rows="4"
          ></textarea>
        ) : (
          <textarea
            placeholder="Como Jogar"
            value={novoProjeto.comoJogar}
            onChange={(e) =>
              setNovoProjeto({ ...novoProjeto, comoJogar: e.target.value })
            }
            rows="4"
          ></textarea>
        )}

        <textarea
          placeholder="Sugestões de Atividades"
          value={novoProjeto.sugestoesAtividades}
          onChange={(e) =>
            setNovoProjeto({
              ...novoProjeto,
              sugestoesAtividades: e.target.value,
            })
          }
          rows="4"
          required
        ></textarea>
        <textarea
          placeholder="Habilidades Musicais Desenvolvidas"
          value={novoProjeto.habilidadesMusicais}
          onChange={(e) =>
            setNovoProjeto({
              ...novoProjeto,
              habilidadesMusicais: e.target.value,
            })
          }
          rows="4"
          required
        ></textarea>

        {/* Referências */}
        <textarea
          placeholder="Referências"
          value={novoProjeto.referencias}
          onChange={(e) =>
            setNovoProjeto({ ...novoProjeto, referencias: e.target.value })
          }
          rows="4"
        ></textarea>

        {/* Imagem Principal */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImagemPreview(e.target.files[0])}
        />

        {/* Nome do Autor */}
        <input
          type="text"
          placeholder="Seu Nome"
          value={novoProjeto.autor}
          onChange={(e) =>
            setNovoProjeto({ ...novoProjeto, autor: e.target.value })
          }
          required
        />

        <button type="submit">Adicionar</button>
      </form>
    </div>
  );
}

export default AdicionarProjeto;
