import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Campo, EnvioImagens, ImagensAtuais, TipoProjeto } from "./CamposFormulario";
import {
  FORMATOS_ACEITOS,
  LIMITE_IMAGENS_PASSO,
  TAMANHO_MAXIMO_MB,
  enviarMidias,
  mensagemDeErro,
  removerMidias,
  tamanhosValidos,
} from "./envioMidias";
import CampoVideos, { urlsFinais, videosSalvos } from "./CampoVideos";

// A rota já é protegida pelo PrivateRoute, então aqui o usuário está sempre autenticado
function EditProjeto() {
  const { id } = useParams(); // Obtém o ID do projeto da URL
  const navigate = useNavigate();

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
  const salvandoRef = useRef(false);

  // Imagens: as já salvas que continuam no projeto e os arquivos novos escolhidos agora.
  // As que forem removidas aqui são apagadas do Cloudinary pelo servidor ao salvar.
  const [imagemAtual, setImagemAtual] = useState("");
  const [passosAtuais, setPassosAtuais] = useState([]);
  const [novaPrincipal, setNovaPrincipal] = useState([]); // no máximo um arquivo
  const [novosPassos, setNovosPassos] = useState([]);
  const [videos, setVideos] = useState([]); // salvos, links novos e arquivos novos (ver CampoVideos)
  const vagasPasso = LIMITE_IMAGENS_PASSO - passosAtuais.length;

  // Busca os dados do projeto atual para pré-popular o formulário
  useEffect(() => {
    const fetchProjeto = async () => {
      try {
        const { data } = await axios.get(`/projetos/${id}`);
        setProjeto((prev) => ({ ...prev, ...data }));
        setImagemAtual(data.imagem || "");
        setPassosAtuais(data.imagensPassoAPasso || []);
        setVideos(videosSalvos(data.videos));
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
        toast.error("Não foi possível carregar o projeto.");
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

  const handleNovaPrincipal = (e) => {
    const arquivos = e.target.files[0] ? [e.target.files[0]] : [];
    if (!tamanhosValidos(arquivos)) {
      e.target.value = "";
      setNovaPrincipal([]);
      return;
    }
    setNovaPrincipal(arquivos);
  };

  const handleNovosPassos = (e) => {
    const arquivos = [...e.target.files];
    if (arquivos.length > vagasPasso) {
      toast.error(
        vagasPasso === 0
          ? `O passo a passo já tem ${LIMITE_IMAGENS_PASSO} imagens. Remova alguma para adicionar outra.`
          : `Você pode adicionar mais ${vagasPasso} ${vagasPasso === 1 ? "imagem" : "imagens"} ao passo a passo.`
      );
      e.target.value = "";
      setNovosPassos([]);
      return;
    }
    if (!tamanhosValidos(arquivos)) {
      e.target.value = "";
      setNovosPassos([]);
      return;
    }
    setNovosPassos(arquivos);
  };

  const removerPasso = (indice) => {
    setPassosAtuais((atuais) => atuais.filter((_, i) => i !== indice));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Evita envios duplicados (clique duplo ou Enter repetido)
    if (salvandoRef.current) return;
    salvandoRef.current = true;
    setSalvando(true);

    let enviadas = [];
    const aviso = toast.loading("Salvando alterações…");

    try {
      const midias = await enviarMidias(
        {
          principal: novaPrincipal[0],
          passos: novosPassos,
          videos: videos.filter((item) => item.tipo === "arquivo").map((item) => item.arquivo),
        },
        (mensagem) => toast.loading(mensagem, { id: aviso })
      );
      enviadas = midias.enviadas;

      // axios envia o token de acesso automaticamente (ver AuthContext)
      toast.loading("Salvando alterações…", { id: aviso });
      await axios.put(`/projetos/${id}`, {
        ...projeto,
        imagem: midias.urlPrincipal || imagemAtual,
        imagensPassoAPasso: [...passosAtuais, ...midias.urlsPassos],
        videos: urlsFinais(videos, midias.urlsVideos),
      });
      toast.success("Alterações salvas.", { id: aviso });
      navigate(`/projeto/${id}`);
    } catch (error) {
      console.error("Erro ao editar projeto:", error);
      // As alterações não foram salvas: remove do Cloudinary as mídias novas que já tinham subido
      removerMidias(enviadas);
      toast.error(mensagemDeErro(error, "Não foi possível salvar as alterações. Tente novamente."), { id: aviso });
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="container form-page" role="status" aria-label="Carregando projeto">
        <header className="form-page__head">
          <span className="skeleton skeleton--line" style={{ width: 100 }} />
          <span className="skeleton skeleton--hero-title" />
        </header>
        <div className="form">
          <div className="form__section skeleton" style={{ height: 320 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="container form-page">
      <header className="form-page__head">
        <p className="eyebrow">Editar projeto</p>
        <h1>{projeto.titulo || "Editar projeto"}</h1>
      </header>

      <form onSubmit={handleSubmit} className="form">
        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">I</span>
            <h2>Informações gerais</h2>
          </div>
          <div className="form__fields">
            <Campo id="edit-titulo" name="titulo" rotulo="Título" value={projeto.titulo} onChange={handleChange} required />
            <Campo
              id="edit-descricaoGeral"
              name="descricaoGeral"
              rotulo="Descrição geral"
              value={projeto.descricaoGeral}
              onChange={handleChange}
              multilinha
            />
            <TipoProjeto valor={projeto.tipoProjeto} onChange={handleChange} />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">II</span>
            <h2>Construção</h2>
          </div>
          <div className="form__fields">
            <Campo
              id="edit-materiais"
              name="materiais"
              rotulo="Materiais"
              dica="Separe cada material com ponto e vírgula (;)"
              value={projeto.materiais}
              onChange={handleChange}
              multilinha
            />
            <Campo
              id="edit-passoAPasso"
              name="passoAPasso"
              rotulo="Passo a passo"
              dica="Separe cada etapa com ponto e vírgula (;)"
              value={projeto.passoAPasso}
              onChange={handleChange}
              multilinha
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
              id="edit-comoTocar"
              name="comoTocar"
              rotulo="Como tocar"
              value={projeto.comoTocar}
              onChange={handleChange}
              multilinha
            />
            <Campo
              id="edit-comoJogar"
              name="comoJogar"
              rotulo="Como jogar"
              value={projeto.comoJogar}
              onChange={handleChange}
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
              id="edit-sugestoesAtividades"
              name="sugestoesAtividades"
              rotulo="Sugestões de atividades"
              value={projeto.sugestoesAtividades}
              onChange={handleChange}
              multilinha
            />
            <Campo
              id="edit-habilidadesMusicais"
              name="habilidadesMusicais"
              rotulo="Habilidades musicais"
              value={projeto.habilidadesMusicais}
              onChange={handleChange}
              multilinha
            />
            <Campo
              id="edit-referencias"
              name="referencias"
              rotulo="Referências"
              value={projeto.referencias}
              onChange={handleChange}
              multilinha
            />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">V</span>
            <h2>Imagens e vídeos</h2>
          </div>
          <div className="form__fields">
            <ImagensAtuais
              rotulo="Imagem principal"
              urls={imagemAtual && novaPrincipal.length === 0 ? [imagemAtual] : []}
              onRemover={() => setImagemAtual("")}
            />
            <EnvioImagens
              id="edit-imagemPrincipal"
              rotulo={imagemAtual ? "Trocar imagem principal" : "Imagem principal"}
              dica={`JPG ou PNG com até ${TAMANHO_MAXIMO_MB} MB — aparece na capa do projeto`}
              arquivos={novaPrincipal}
              accept={FORMATOS_ACEITOS}
              onChange={handleNovaPrincipal}
            />
            <ImagensAtuais rotulo="Imagens do passo a passo" urls={passosAtuais} onRemover={removerPasso} />
            {vagasPasso > 0 ? (
              <EnvioImagens
                id="edit-imagensPasso"
                rotulo="Adicionar imagens ao passo a passo"
                dica={`Mais ${vagasPasso} ${vagasPasso === 1 ? "imagem" : "imagens"}, JPG ou PNG, com até ${TAMANHO_MAXIMO_MB} MB cada`}
                arquivos={novosPassos}
                accept={FORMATOS_ACEITOS}
                multiplo
                onChange={handleNovosPassos}
              />
            ) : (
              <p className="field__hint">
                O passo a passo já tem {LIMITE_IMAGENS_PASSO} imagens. Remova alguma para adicionar outra.
              </p>
            )}
            <CampoVideos itens={videos} onChange={setVideos} />
          </div>
        </section>

        <section className="form__section">
          <div className="form__section-head">
            <span className="form__num">VI</span>
            <h2>Autoria</h2>
          </div>
          <div className="form__fields">
            <Campo id="edit-autor" name="autor" rotulo="Autor" value={projeto.autor} onChange={handleChange} required />
          </div>
        </section>

        <div className="form__submit">
          <Link to={`/projeto/${id}`} className="btn btn--ghost btn--lg">
            Cancelar
          </Link>
          <button type="submit" className="btn btn--primary btn--lg" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProjeto;
