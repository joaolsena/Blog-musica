import React, { useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Campo, EnvioImagens, TipoProjeto } from "./CamposFormulario";

// Deve bater com o limite de upload.array() no servidor
const LIMITE_IMAGENS_PASSO = 4;

// Formatos aceitos pelo Cloudinary no servidor (allowed_formats)
const FORMATOS_ACEITOS = "image/jpeg,image/png";

// Deve bater com TAMANHO_MAXIMO_IMAGEM no servidor (limite do plano gratuito do Cloudinary)
const TAMANHO_MAXIMO_MB = 10;

// Avisa e retorna false se algum arquivo passar do tamanho máximo
function tamanhosValidos(arquivos) {
  const grande = arquivos.find((arquivo) => arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024);
  if (grande) {
    toast.error(`"${grande.name}" tem ${(grande.size / 1024 / 1024).toFixed(1)} MB. O limite é ${TAMANHO_MAXIMO_MB} MB por imagem.`);
    return false;
  }
  return true;
}

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
  const [imagemPrincipal, setImagemPrincipal] = useState([]); // no máximo um arquivo
  const [imagensPasso, setImagensPasso] = useState([]); // arquivos do passo a passo
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const navigate = useNavigate();

  const atualizar = (e) => {
    const { name, value } = e.target;
    setNovoProjeto((anterior) => ({ ...anterior, [name]: value }));
  };

  const handleAdicionarProjeto = async (e) => {
    e.preventDefault();

    // Evita envios duplicados (clique duplo ou Enter repetido antes do botão ser desabilitado)
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);

    const urlsEnviadas = [];
    const aviso = toast.loading("Enviando projeto…");

    try {
      // Enviar a imagem principal, se houver
      let imagemUrl = novoProjeto.imagem;
      if (imagemPrincipal.length > 0) {
        const formDataImagem = new FormData();
        formDataImagem.append("imagem", imagemPrincipal[0]);
        const response = await axios.post("/upload", formDataImagem);
        imagemUrl = response.data.url;
        urlsEnviadas.push(imagemUrl);
      }

      // Enviar as imagens do passo a passo, se houver
      let imagensPassoURLs = [];
      if (imagensPasso.length > 0) {
        const formDataPasso = new FormData();
        imagensPasso.forEach((imagem) => {
          formDataPasso.append("imagensPassoAPasso", imagem);
        });
        const responsePasso = await axios.post("/upload-multiplas", formDataPasso);
        imagensPassoURLs = responsePasso.data.urls || [];
        urlsEnviadas.push(...imagensPassoURLs);
      }

      // Enviar projeto ao backend
      const { data: projetoSalvo } = await axios.post("/adicionar", {
        ...novoProjeto,
        imagem: imagemUrl,
        imagensPassoAPasso: imagensPassoURLs,
      });

      toast.success("Projeto publicado!", { id: aviso });
      navigate(projetoSalvo?._id ? `/projeto/${projetoSalvo._id}` : "/");
    } catch (error) {
      console.error("Erro ao adicionar projeto:", error);
      // Remove do Cloudinary as imagens já enviadas, já que o projeto não foi salvo
      if (urlsEnviadas.length > 0) {
        axios
          .post("/imagens/remover", { urls: urlsEnviadas })
          .catch((erroLimpeza) => console.error("Erro ao remover imagens enviadas:", erroLimpeza));
      }
      // Erros de imagem (tamanho, formato, quantidade) vêm do servidor com uma mensagem clara
      const status = error.response?.status;
      const mensagem =
        [400, 413, 415].includes(status) && typeof error.response.data === "string"
          ? error.response.data
          : "Não foi possível publicar o projeto. Tente novamente.";
      toast.error(mensagem, { id: aviso });
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const handleImagensPasso = (e) => {
    const arquivos = [...e.target.files];
    if (arquivos.length > LIMITE_IMAGENS_PASSO) {
      toast.error(`Selecione no máximo ${LIMITE_IMAGENS_PASSO} imagens do passo a passo.`);
      e.target.value = "";
      setImagensPasso([]);
      return;
    }
    if (!tamanhosValidos(arquivos)) {
      e.target.value = "";
      setImagensPasso([]);
      return;
    }
    setImagensPasso(arquivos);
  };

  const ehInstrumento = novoProjeto.tipoProjeto === "instrumento";

  return (
    <div className="container form-page">
      <header className="form-page__head">
        <p className="eyebrow">Novo projeto</p>
        <h1>Adicionar um trabalho</h1>
        <p>Preencha as informações abaixo para publicar um novo instrumento ou jogo musical no blog.</p>
      </header>

      <form onSubmit={handleAdicionarProjeto} className="form">
        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">I</span>
            <h2>Informações gerais</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="titulo"
              name="titulo"
              rotulo="Título do trabalho"
              placeholder="Ex: Chocalho de garrafa PET"
              value={novoProjeto.titulo}
              onChange={atualizar}
              required
            />
            <Campo
              id="descricaoGeral"
              name="descricaoGeral"
              rotulo="Descrição geral"
              placeholder="Conte do que se trata o trabalho"
              value={novoProjeto.descricaoGeral}
              onChange={atualizar}
              multilinha
              required
            />
            <TipoProjeto valor={novoProjeto.tipoProjeto} onChange={atualizar} />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">II</span>
            <h2>Construção</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="materiais"
              name="materiais"
              rotulo="Materiais necessários"
              dica="Separe cada material com ponto e vírgula (;)"
              placeholder="Garrafa PET; grãos de arroz; fita adesiva"
              value={novoProjeto.materiais}
              onChange={atualizar}
              multilinha
              required
            />
            <Campo
              id="passoAPasso"
              name="passoAPasso"
              rotulo="Passo a passo"
              dica="Separe cada etapa com ponto e vírgula (;)"
              value={novoProjeto.passoAPasso}
              onChange={atualizar}
              multilinha
              required
            />
            <EnvioImagens
              id="imagensPasso"
              rotulo="Imagens do passo a passo"
              dica={`Até ${LIMITE_IMAGENS_PASSO} imagens, JPG ou PNG, com até ${TAMANHO_MAXIMO_MB} MB cada`}
              arquivos={imagensPasso}
              accept={FORMATOS_ACEITOS}
              multiplo
              onChange={handleImagensPasso}
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">III</span>
            <h2>Instruções de uso</h2>
          </div>
          <div className="form__fields">
            <Campo
              id={ehInstrumento ? "comoTocar" : "comoJogar"}
              name={ehInstrumento ? "comoTocar" : "comoJogar"}
              rotulo={ehInstrumento ? "Como tocar" : "Como jogar"}
              value={ehInstrumento ? novoProjeto.comoTocar : novoProjeto.comoJogar}
              onChange={atualizar}
              multilinha
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">IV</span>
            <h2>Aplicação didática</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="sugestoesAtividades"
              name="sugestoesAtividades"
              rotulo="Sugestões de atividades"
              value={novoProjeto.sugestoesAtividades}
              onChange={atualizar}
              multilinha
              required
            />
            <Campo
              id="habilidadesMusicais"
              name="habilidadesMusicais"
              rotulo="Habilidades musicais desenvolvidas"
              value={novoProjeto.habilidadesMusicais}
              onChange={atualizar}
              multilinha
              required
            />
            <Campo
              id="referencias"
              name="referencias"
              rotulo="Referências"
              value={novoProjeto.referencias}
              onChange={atualizar}
              multilinha
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">V</span>
            <h2>Imagem e autoria</h2>
          </div>
          <div className="form__fields">
            <EnvioImagens
              id="imagemPrincipal"
              rotulo="Imagem principal"
              dica={`JPG ou PNG com até ${TAMANHO_MAXIMO_MB} MB — aparece na capa do projeto`}
              arquivos={imagemPrincipal}
              accept={FORMATOS_ACEITOS}
              onChange={(e) => {
                const arquivos = e.target.files[0] ? [e.target.files[0]] : [];
                if (!tamanhosValidos(arquivos)) {
                  e.target.value = "";
                  setImagemPrincipal([]);
                  return;
                }
                setImagemPrincipal(arquivos);
              }}
            />
            <Campo
              id="autor"
              name="autor"
              rotulo="Seu nome"
              placeholder="Como devemos assinar este trabalho?"
              value={novoProjeto.autor}
              onChange={atualizar}
              autoComplete="name"
              required
            />
          </div>
        </section>

        <div className="form__submit">
          <button type="submit" className="btn btn--primary btn--lg" disabled={enviando}>
            {enviando ? "Publicando…" : "Publicar projeto"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdicionarProjeto;
