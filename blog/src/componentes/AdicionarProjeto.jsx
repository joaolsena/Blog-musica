import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Campo, EnvioImagens, FichaProjeto, TipoProjeto } from "./CamposFormulario";
import CampoVideos, { urlsFinais } from "./CampoVideos";
import {
  FORMATOS_ACEITOS,
  LIMITE_IMAGENS_PASSO,
  TAMANHO_MAXIMO_MB,
  enviarMidias,
  mensagemDeErro,
  removerMidias,
  tamanhosValidos,
} from "./envioMidias";
import { quandoFoiSalvo } from "./memoria";
import { apagarRascunho, lerRascunho, salvarRascunho } from "./rascunho";

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
  faixasEtarias: [],
  nivel: "",
  duracao: "",
  referencias: "",
  imagensPassoAPasso: [], // URLs das imagens do passo a passo
};

function AdicionarProjeto() {
  const [novoProjeto, setNovoProjeto] = useState(projetoVazio);
  const [imagemPrincipal, setImagemPrincipal] = useState([]); // no máximo um arquivo
  const [imagensPasso, setImagensPasso] = useState([]); // arquivos do passo a passo
  const [videos, setVideos] = useState([]); // links do YouTube e arquivos de vídeo (ver CampoVideos)
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const navigate = useNavigate();

  // Rascunho automático: volta ao abrir o formulário e é salvo enquanto a pessoa preenche
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);
  const [rascunhoSalvoEm, setRascunhoSalvoEm] = useState(null);

  const descartarRascunho = useCallback(() => {
    apagarRascunho();
    setNovoProjeto(projetoVazio);
    setImagemPrincipal([]);
    setImagensPasso([]);
    setVideos([]);
    setRascunhoSalvoEm(null);
  }, []);

  useEffect(() => {
    let ativo = true;
    lerRascunho().then((rascunho) => {
      if (!ativo) return;
      if (rascunho) {
        setNovoProjeto({ ...projetoVazio, ...rascunho.campos });
        setImagemPrincipal(rascunho.imagemPrincipal || []);
        setImagensPasso(rascunho.imagensPasso || []);
        setVideos(rascunho.videos || []);
        setRascunhoSalvoEm(rascunho.salvoEm);
        toast("Rascunho recuperado", {
          description: `Você continua de onde parou (salvo ${quandoFoiSalvo(rascunho.salvoEm)}).`,
          action: { label: "Descartar", onClick: descartarRascunho },
        });
      }
      setRascunhoCarregado(true);
    });
    return () => {
      ativo = false;
    };
  }, [descartarRascunho]);

  useEffect(() => {
    if (!rascunhoCarregado || enviandoRef.current) return undefined;
    const temConteudo =
      Object.entries(novoProjeto).some(
        ([campo, valor]) => campo !== "tipoProjeto" && (Array.isArray(valor) ? valor.length > 0 : Boolean(valor))
      ) ||
      imagemPrincipal.length > 0 ||
      imagensPasso.length > 0 ||
      videos.length > 0;
    if (!temConteudo) return undefined;
    // Espera a pessoa parar de digitar por um instante antes de salvar
    const temporizador = setTimeout(async () => {
      const salvoEm = await salvarRascunho({ campos: novoProjeto, imagemPrincipal, imagensPasso, videos });
      if (salvoEm && !enviandoRef.current) setRascunhoSalvoEm(salvoEm);
    }, 600);
    return () => clearTimeout(temporizador);
  }, [rascunhoCarregado, novoProjeto, imagemPrincipal, imagensPasso, videos]);

  const atualizar = (e) => {
    const { name, value } = e.target;
    setNovoProjeto((anterior) => ({ ...anterior, [name]: value }));
  };

  const atualizarFicha = (campo, valor) => setNovoProjeto((anterior) => ({ ...anterior, [campo]: valor }));

  const handleAdicionarProjeto = async (e) => {
    e.preventDefault();

    // Evita envios duplicados (clique duplo ou Enter repetido antes do botão ser desabilitado)
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);

    let enviadas = [];
    const aviso = toast.loading("Enviando projeto…");

    try {
      const midias = await enviarMidias(
        {
          principal: imagemPrincipal[0],
          passos: imagensPasso,
          videos: videos.filter((item) => item.tipo === "arquivo").map((item) => item.arquivo),
        },
        (mensagem) => toast.loading(mensagem, { id: aviso })
      );
      enviadas = midias.enviadas;

      // Enviar projeto ao backend
      toast.loading("Publicando projeto…", { id: aviso });
      const { data: projetoSalvo } = await axios.post("/adicionar", {
        ...novoProjeto,
        imagem: midias.urlPrincipal || novoProjeto.imagem,
        imagensPassoAPasso: midias.urlsPassos,
        videos: urlsFinais(videos, midias.urlsVideos),
      });

      await apagarRascunho();
      toast.success("Projeto publicado!", { id: aviso });
      navigate(projetoSalvo?._id ? `/projeto/${projetoSalvo._id}` : "/");
    } catch (error) {
      console.error("Erro ao adicionar projeto:", error);
      // O projeto não foi salvo: remove do Cloudinary as imagens e vídeos que já tinham subido
      removerMidias(enviadas);
      toast.error(mensagemDeErro(error, "Não foi possível publicar o projeto. Tente novamente."), { id: aviso });
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
            <FichaProjeto valor={novoProjeto} onChange={atualizarFicha} />
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
            <h2>Vídeos</h2>
          </div>
          <div className="form__fields">
            <CampoVideos itens={videos} onChange={setVideos} />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">IV</span>
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
            <span className="form__num">V</span>
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
            <span className="form__num">VI</span>
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
          {rascunhoSalvoEm && (
            <p className="rascunho-status" aria-live="polite">
              Rascunho salvo neste aparelho {quandoFoiSalvo(rascunhoSalvoEm)}
              <button type="button" className="rascunho-status__descartar" onClick={descartarRascunho}>
                Descartar
              </button>
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--lg" disabled={enviando}>
            {enviando ? "Publicando…" : "Publicar projeto"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdicionarProjeto;
