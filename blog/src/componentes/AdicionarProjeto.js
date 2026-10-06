import React, { useRef, useState } from "react";
import axios from "axios";

// Deve bater com o limite de upload.array() no servidor
const LIMITE_IMAGENS_PASSO = 4;

// Formatos aceitos pelo Cloudinary no servidor (allowed_formats)
const FORMATOS_ACEITOS = "image/jpeg,image/png";

const projetoVazio = {
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
};

function AdicionarProjeto() {
  const [novoProjeto, setNovoProjeto] = useState(projetoVazio);

  const [imagemPreview, setImagemPreview] = useState(null);
  const [imagensPassoPreview, setImagensPassoPreview] = useState([]); // Pré-visualização das imagens do passo a passo
  const [projetos, setProjetos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  const handleAdicionarProjeto = async (e) => {
    e.preventDefault();

    // Evita envios duplicados (clique duplo ou Enter repetido antes do botão ser desabilitado)
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);

    const urlsEnviadas = [];

    try {
      // Enviar a imagem principal, se houver
      let imagemUrl = novoProjeto.imagem;
      if (imagemPreview) {
        const formDataImagem = new FormData();
        formDataImagem.append("imagem", imagemPreview);
        const response = await axios.post("/upload", formDataImagem);
        imagemUrl = response.data.url;
        urlsEnviadas.push(imagemUrl);
      }

      // Enviar as imagens do passo a passo, se houver
      let imagensPassoURLs = [];
      if (imagensPassoPreview.length > 0) {
        const formDataPasso = new FormData();
        imagensPassoPreview.forEach((imagem) => {
          formDataPasso.append("imagensPassoAPasso", imagem);
        });
        const responsePasso = await axios.post("/upload-multiplas", formDataPasso);
        imagensPassoURLs = responsePasso.data.urls || [];
        urlsEnviadas.push(...imagensPassoURLs);
      }

      const projetoComImagens = {
        ...novoProjeto,
        imagem: imagemUrl,
        imagensPassoAPasso: imagensPassoURLs,
      };

      // Enviar projeto ao backend
      await axios.post("/adicionar", projetoComImagens);

      setProjetos([...projetos, projetoComImagens]);
      setNovoProjeto(projetoVazio);
      setImagemPreview(null);
      setImagensPassoPreview([]);
      // Limpa os campos de arquivo (não são controlados pelo estado)
      e.target.querySelectorAll('input[type="file"]').forEach((input) => (input.value = ""));
      alert("Projeto adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar projeto:", error);
      // Remove do Cloudinary as imagens já enviadas, já que o projeto não foi salvo
      if (urlsEnviadas.length > 0) {
        axios
          .post("/imagens/remover", { urls: urlsEnviadas })
          .catch((erroLimpeza) => console.error("Erro ao remover imagens enviadas:", erroLimpeza));
      }
      alert("Não foi possível adicionar o projeto. Tente novamente.");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const handleImagensPasso = (e) => {
    const arquivos = [...e.target.files];
    if (arquivos.length > LIMITE_IMAGENS_PASSO) {
      alert(`Selecione no máximo ${LIMITE_IMAGENS_PASSO} imagens do passo a passo.`);
      e.target.value = "";
      setImagensPassoPreview([]);
      return;
    }
    setImagensPassoPreview(arquivos);
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
                  accept={FORMATOS_ACEITOS}
                  multiple
                  onChange={handleImagensPasso}
                />
                <span className="field-hint">Você pode selecionar até 4 imagens (JPG ou PNG).</span>
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
                  accept={FORMATOS_ACEITOS}
                  onChange={(e) => setImagemPreview(e.target.files[0] || null)}
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
