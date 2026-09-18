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
  const [enviando, setEnviando] = useState(false);

  const handleAdicionarProjeto = (e) => {
    e.preventDefault();
    console.log("Enviando o formulário...");
    setEnviando(true);

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

    const finalizarComSucesso = (projetoComImagens) => {
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
      setEnviando(false);
      alert("Projeto adicionado com sucesso!");
    };

    const finalizarComErro = (mensagem, error) => {
      console.error(mensagem, error);
      setEnviando(false);
      alert("Não foi possível adicionar o projeto. Tente novamente.");
    };

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
                .then(() => finalizarComSucesso(projetoComImagens))
                .catch((error) => finalizarComErro("Erro ao adicionar projeto:", error));
            })
            .catch((error) =>
              finalizarComErro("Erro ao fazer upload das imagens do passo a passo:", error)
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
            .then(() => finalizarComSucesso(projetoComImagens))
            .catch((error) => finalizarComErro("Erro ao adicionar projeto:", error));
        }
      })
      .catch((error) => finalizarComErro("Erro ao fazer upload da imagem principal:", error));
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h2>Adicionar um trabalho</h2>
        <p className="form-card__intro">
          Preencha as informações abaixo para publicar um novo instrumento ou jogo musical no blog.
        </p>

        <form onSubmit={handleAdicionarProjeto}>
          <fieldset className="form-fieldset">
            <legend>Informações gerais</legend>

            <div className="form-field">
              <label htmlFor="titulo">Título do trabalho</label>
              <input
                id="titulo"
                type="text"
                placeholder="Ex: Chocalho de garrafa PET"
                value={novoProjeto.titulo}
                onChange={(e) =>
                  setNovoProjeto({ ...novoProjeto, titulo: e.target.value })
                }
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="descricaoGeral">Descrição geral</label>
              <textarea
                id="descricaoGeral"
                placeholder="Conte do que se trata o trabalho"
                value={novoProjeto.descricaoGeral}
                onChange={(e) =>
                  setNovoProjeto({ ...novoProjeto, descricaoGeral: e.target.value })
                }
                rows="4"
                required
              ></textarea>
            </div>

            <div className="form-field">
              <label>Tipo de projeto</label>
              <div className="toggle-group">
                <label className={novoProjeto.tipoProjeto === "instrumento" ? "is-selected" : ""}>
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
                <label className={novoProjeto.tipoProjeto === "jogo" ? "is-selected" : ""}>
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
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend>Construção</legend>

            <div className="form-field">
              <label htmlFor="materiais">Materiais necessários</label>
              <textarea
                id="materiais"
                placeholder="Separe cada material com ponto e vírgula (;)"
                value={novoProjeto.materiais}
                onChange={(e) =>
                  setNovoProjeto({ ...novoProjeto, materiais: e.target.value })
                }
                rows="4"
                required
              ></textarea>
            </div>

            <div className="form-field">
              <label htmlFor="passoAPasso">Passo a passo</label>
              <textarea
                id="passoAPasso"
                placeholder="Separe cada etapa com ponto e vírgula (;)"
                value={novoProjeto.passoAPasso}
                onChange={(e) =>
                  setNovoProjeto({ ...novoProjeto, passoAPasso: e.target.value })
                }
                rows="4"
                required
              ></textarea>
            </div>

            <div className="form-field">
              <label htmlFor="imagensPasso">Imagens do passo a passo</label>
              <div className="file-drop">
                <input
                  id="imagensPasso"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImagensPassoPreview([...e.target.files])}
                />
                <span className="field-hint">Você pode selecionar até 4 imagens.</span>
              </div>
              {imagensPassoPreview.length > 0 && (
                <div className="preview-grid">
                  {imagensPassoPreview.map((imagem, index) => (
                    <img
                      key={index}
                      src={URL.createObjectURL(imagem)}
                      alt={`Pré-visualização do passo ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend>Instruções de uso</legend>

            {novoProjeto.tipoProjeto === "instrumento" ? (
              <div className="form-field">
                <label htmlFor="comoTocar">Como tocar</label>
                <textarea
                  id="comoTocar"
                  value={novoProjeto.comoTocar}
                  onChange={(e) =>
                    setNovoProjeto({ ...novoProjeto, comoTocar: e.target.value })
                  }
                  rows="4"
                ></textarea>
              </div>
            ) : (
              <div className="form-field">
                <label htmlFor="comoJogar">Como jogar</label>
                <textarea
                  id="comoJogar"
                  value={novoProjeto.comoJogar}
                  onChange={(e) =>
                    setNovoProjeto({ ...novoProjeto, comoJogar: e.target.value })
                  }
                  rows="4"
                ></textarea>
              </div>
            )}
          </fieldset>

          <fieldset className="form-fieldset">
            <legend>Aplicação didática</legend>

            <div className="form-field">
              <label htmlFor="sugestoesAtividades">Sugestões de atividades</label>
              <textarea
                id="sugestoesAtividades"
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
            </div>

            <div className="form-field">
              <label htmlFor="habilidadesMusicais">Habilidades musicais desenvolvidas</label>
              <textarea
                id="habilidadesMusicais"
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
            </div>

            <div className="form-field">
              <label htmlFor="referencias">Referências</label>
              <textarea
                id="referencias"
                placeholder="Opcional"
                value={novoProjeto.referencias}
                onChange={(e) =>
                  setNovoProjeto({ ...novoProjeto, referencias: e.target.value })
                }
                rows="4"
              ></textarea>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend>Imagem e autoria</legend>

            <div className="form-field">
              <label htmlFor="imagemPrincipal">Imagem principal</label>
              <div className="file-drop">
                <input
                  id="imagemPrincipal"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagemPreview(e.target.files[0])}
                />
              </div>
              {imagemPreview && (
                <div className="preview-grid">
                  <img src={URL.createObjectURL(imagemPreview)} alt="Pré-visualização da imagem principal" />
                </div>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="autor">Seu nome</label>
              <input
                id="autor"
                type="text"
                placeholder="Como devemos assinar este trabalho?"
                value={novoProjeto.autor}
                onChange={(e) =>
                  setNovoProjeto({ ...novoProjeto, autor: e.target.value })
                }
                required
              />
            </div>
          </fieldset>

          <div className="form-card__submit">
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? "Enviando..." : "Adicionar projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdicionarProjeto;
