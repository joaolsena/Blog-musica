import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { esquecerProjeto, lerProjetoSalvo, salvarProjeto } from "./memoria";
import { AvisoSincronia, useSincronia } from "./Sincronia";
import { toast } from "sonner";
import { useAuth } from "./AuthContext"; // Importando o hook de autenticação
import Lightbox from "./Lightbox";
import NaoEncontrado from "./NaoEncontrado";
import { DURACOES, FAIXAS_ETARIAS, NIVEIS, rotuloTipo } from "./tipos";
import { srcSetImagem, urlImagem } from "./imagens";
import VideoProjeto from "./VideoProjeto";
import { BotaoCompartilhar, ConviteCompartilhar } from "./Compartilhar";
import BotaoBaixarPdf from "./BotaoBaixarPdf";
import Comentarios from "./Comentarios";

// Separa os campos de texto em que cada item é delimitado por ponto e vírgula
const dividir = (texto) => (texto ? texto.split(";").map((item) => item.trim()).filter(Boolean) : []);

// Numeração dos "movimentos" (seções), como numa obra musical
const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII"];

// Marca no sumário a seção que está visível na tela
function useSecaoAtiva(ids) {
  const [ativa, setAtiva] = useState(ids[0]);

  useEffect(() => {
    if (!("IntersectionObserver" in window) || ids.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas.filter((e) => e.isIntersecting);
        if (visiveis.length > 0) setAtiva(visiveis[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  return ativa;
}

function VoltarLink() {
  return (
    <Link to="/" className="back-link">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Todos os projetos
    </Link>
  );
}

// "Passo 2 — Interior da caixa" (ou só "Passo 2 da construção", sem legenda)
const legendaDaFoto = (projeto, index) => {
  const legenda = projeto.legendasPassoAPasso?.[index];
  return legenda ? `Passo ${index + 1} — ${legenda}` : `Passo ${index + 1} da construção`;
};

// Ficha do projeto: para quem é, nível e duração (só o que foi informado)
function Ficha({ projeto }) {
  const faixas = FAIXAS_ETARIAS.filter((f) => projeto.faixasEtarias?.includes(f.valor)).map((f) => f.curto);
  const nivel = NIVEIS.find((n) => n.valor === projeto.nivel)?.rotulo;
  const duracao = DURACOES.find((d) => d.valor === projeto.duracao)?.rotulo;
  const itens = [
    faixas.length > 0 && ["Para", faixas.join(" · ")],
    nivel && ["Nível", nivel],
    duracao && ["Duração", duracao],
  ].filter(Boolean);
  if (itens.length === 0) return null;
  return (
    <dl className="ficha">
      {itens.map(([termo, valor]) => (
        <div key={termo} className="ficha__item">
          <dt>{termo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProjetoDetalhes() {
  const { id } = useParams(); // Pega o ID do projeto da URL
  // Se este projeto já foi visto neste aparelho, aparece na hora; o servidor atualiza depois
  const [salvo] = useState(() => lerProjetoSalvo(id));
  const [projeto, setProjeto] = useState(salvo?.projeto ?? null);
  const [erro, setErro] = useState(null); // Estado para mensagens de erro
  const [excluindo, setExcluindo] = useState(false);
  const [lightbox, setLightbox] = useState(null); // índice da imagem aberta
  const { isAuthenticated, podeEditar } = useAuth(); // Verifica se o usuário está logado
  const navigate = useNavigate(); // Navegação após exclusão
  const [salvoEm, setSalvoEm] = useState(salvo?.salvoEm);
  const sincronia = useSincronia();
  const { iniciar, concluir } = sincronia;

  const buscar = useCallback(() => {
    if (!id) {
      setErro("ID do projeto não encontrado.");
      return;
    }
    if (salvo) iniciar();
    axios
      .get(`/projetos/${id}`, { timeout: 15000 })
      .then((response) => {
        setProjeto(response.data);
        salvarProjeto(response.data);
        setSalvoEm(Date.now());
        setErro(null);
        if (salvo) concluir(true);
      })
      .catch((error) => {
        console.error("Erro ao carregar projeto:", error);
        // 404: o projeto não existe mais (some também da memória do aparelho)
        if (error.response?.status === 404) {
          esquecerProjeto(id);
          setErro("nao-encontrado");
        } else if (salvo) {
          concluir(false); // sem conexão: continua mostrando a versão guardada
        } else {
          setErro("falha");
        }
      });
  }, [id, salvo, iniciar, concluir]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  // Título da aba do navegador com o nome do projeto
  useEffect(() => {
    if (!projeto?.titulo) return undefined;
    const tituloAnterior = document.title;
    document.title = `${projeto.titulo} — Ensine Música`;
    return () => {
      document.title = tituloAnterior;
    };
  }, [projeto]);

  const secoes = useMemo(() => {
    if (!projeto) return [];
    const instrucaoUso = [projeto.comoTocar, projeto.comoJogar].filter(Boolean).join(" ");
    const temConstrucao =
      dividir(projeto.materiais).length > 0 ||
      dividir(projeto.passoAPasso).length > 0 ||
      projeto.imagensPassoAPasso?.length > 0;
    return [
      projeto.descricaoGeral && { id: "descricao", titulo: "Descrição" },
      temConstrucao && { id: "construcao", titulo: "Construção" },
      projeto.videos?.length > 0 && { id: "videos", titulo: projeto.videos.length > 1 ? "Vídeos" : "Vídeo" },
      instrucaoUso && { id: "uso", titulo: projeto.tipoProjeto === "jogo" ? "Como jogar" : "Como tocar" },
      (projeto.sugestoesAtividades || projeto.habilidadesMusicais) && { id: "aplicacao", titulo: "Aplicação didática" },
      projeto.referencias && { id: "referencias", titulo: "Referências" },
    ].filter(Boolean);
  }, [projeto]);

  const idsSecoes = useMemo(() => secoes.map((s) => s.id), [secoes]);
  const secaoAtiva = useSecaoAtiva(idsSecoes);

  // Função para excluir o projeto
  const handleDelete = () => {
    const confirmDelete = window.confirm("Tem certeza que deseja apagar este projeto? Esta ação não pode ser desfeita.");
    if (!confirmDelete) return;

    setExcluindo(true);
    const pedido = axios.delete(`/projetos/${id}`);
    toast.promise(pedido, {
      loading: "Apagando projeto…",
      success: "Projeto apagado.",
      error: "Não foi possível apagar o projeto. Tente novamente.",
    });
    pedido
      .then(() => {
        esquecerProjeto(id);
        navigate("/"); // Redireciona para a página inicial após exclusão
      })
      .catch((error) => console.error("Erro ao excluir o projeto:", error))
      .finally(() => setExcluindo(false));
  };

  // Exibe uma mensagem de erro, se houver
  if (erro === "nao-encontrado") {
    return (
      <NaoEncontrado
        titulo="Projeto não encontrado"
        texto="Este projeto não existe mais ou o link está incorreto."
      />
    );
  }

  if (erro) {
    return (
      <div className="container artigo-estado">
        <h1>Algo saiu do tom</h1>
        <p>Não foi possível carregar este projeto agora. Verifique sua conexão e tente de novo.</p>
        <div className="artigo-estado__acoes">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
          <VoltarLink />
        </div>
      </div>
    );
  }

  // Esqueleto enquanto os dados estão sendo buscados
  if (!projeto) {
    return (
      <div className="container artigo" role="status" aria-label="Carregando projeto">
        <div className="artigo__head">
          <span className="skeleton skeleton--line" style={{ width: 120 }} />
          <span className="skeleton skeleton--hero-title" />
          <span className="skeleton skeleton--line" style={{ width: 200 }} />
        </div>
        <div className="artigo__capa skeleton" style={{ aspectRatio: "16 / 9" }} />
      </div>
    );
  }

  const materiais = dividir(projeto.materiais);
  const etapas = dividir(projeto.passoAPasso);
  const instrucaoUso = [projeto.comoTocar, projeto.comoJogar].filter(Boolean).join(" ");

  // Todas as imagens do projeto, na ordem em que aparecem, para o visualizador
  const imagens = [
    projeto.imagem && { src: projeto.imagem, legenda: projeto.titulo },
    ...(projeto.imagensPassoAPasso || []).map((src, index) => ({ src, legenda: legendaDaFoto(projeto, index) })),
  ].filter(Boolean);
  const deslocamentoPassos = projeto.imagem ? 1 : 0;

  const numero = (secaoId) => ROMANOS[idsSecoes.indexOf(secaoId)];

  return (
    <article className="container artigo">
      <AvisoSincronia estado={sincronia.estado} salvoEm={salvoEm} aoTentarDeNovo={buscar} />
      <header className="artigo__head">
        <VoltarLink />
        {projeto.tipoProjeto && (
          <span className={`tag tag--${projeto.tipoProjeto}`}>{rotuloTipo(projeto.tipoProjeto)}</span>
        )}
        <h1 className="artigo__title">{projeto.titulo}</h1>
        <div className="artigo__meta-linha">
          <p className="artigo__meta">
            Por <strong>{projeto.autor}</strong>
            {projeto.data && (
              <>
                <span aria-hidden="true"> · </span>
                {projeto.data}
              </>
            )}
          </p>
          <div className="artigo__botoes">
            <BotaoCompartilhar titulo={projeto.titulo} />
            <BotaoBaixarPdf
              gerar={async () => {
                const { baixarPdf } = await import("./baixarPdf");
                await baixarPdf(projeto, `${window.location.origin}/projeto/${projeto._id}`);
              }}
            />
          </div>
        </div>
        <Ficha projeto={projeto} />
        <p className="so-impressao endereco-impresso">
          Ensine Música · {window.location.origin}/projeto/{id}
        </p>
      </header>

      {projeto.imagem && (
        <button type="button" className="artigo__capa" onClick={() => setLightbox(0)} aria-label="Ampliar imagem principal">
          <img
            src={urlImagem(projeto.imagem, 1200)}
            srcSet={srcSetImagem(projeto.imagem, [800, 1200, 1600, 2000])}
            sizes="(min-width: 1240px) 1200px, 100vw"
            alt={projeto.titulo}
            fetchpriority="high"
          />
        </button>
      )}

      <div className="artigo__layout">
        {secoes.length > 1 && (
          <nav className="sumario" aria-label="Nesta página">
            <p className="sumario__titulo">Nesta página</p>
            <ol>
              {secoes.map((secao, index) => (
                <li key={secao.id}>
                  <a href={`#${secao.id}`} className={secaoAtiva === secao.id ? "is-active" : undefined}>
                    <span className="sumario__num">{ROMANOS[index]}</span>
                    {secao.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="artigo__corpo">
          {projeto.descricaoGeral && (
            <section id="descricao" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("descricao")}</span>
                Descrição
              </h2>
              <p className="secao__lead">{projeto.descricaoGeral}</p>
            </section>
          )}

          {idsSecoes.includes("construcao") && (
            <section id="construcao" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("construcao")}</span>
                Construção
              </h2>

              {materiais.length > 0 && (
                <>
                  <h3 className="secao__sub">Materiais necessários</h3>
                  <ul className="materiais">
                    {materiais.map((material, index) => (
                      <li key={index}>{material}</li>
                    ))}
                  </ul>
                </>
              )}

              {etapas.length > 0 && (
                <>
                  <h3 className="secao__sub">Passo a passo</h3>
                  <ol className="etapas">
                    {etapas.map((etapa, index) => (
                      <li key={index}>{etapa}</li>
                    ))}
                  </ol>
                </>
              )}

              {projeto.imagensPassoAPasso?.length > 0 && (
                <div className="galeria">
                  {projeto.imagensPassoAPasso.map((url, index) => {
                    const legenda = projeto.legendasPassoAPasso?.[index];
                    return (
                      <figure className="galeria__figura" key={index}>
                        <button
                          type="button"
                          className="galeria__item"
                          onClick={() => setLightbox(index + deslocamentoPassos)}
                          aria-label={`Ampliar imagem do passo ${index + 1}`}
                        >
                          <img
                            src={urlImagem(url, 600)}
                            srcSet={srcSetImagem(url, [400, 600, 900])}
                            sizes="(min-width: 1024px) 340px, 50vw"
                            alt={legendaDaFoto(projeto, index)}
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="galeria__label">Passo {index + 1}</span>
                        </button>
                        {legenda && <figcaption className="galeria__legenda">{legenda}</figcaption>}
                      </figure>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {projeto.videos?.length > 0 && (
            <section id="videos" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("videos")}</span>
                {projeto.videos.length > 1 ? "Vídeos" : "Vídeo"}
              </h2>
              <div className="videos">
                {projeto.videos.map((url, index) => (
                  <VideoProjeto
                    key={url}
                    url={url}
                    titulo={projeto.videos.length > 1 ? `${projeto.titulo} — vídeo ${index + 1}` : projeto.titulo}
                  />
                ))}
              </div>
              <ul className="so-impressao videos-impressos">
                {projeto.videos.map((url, index) => (
                  <li key={url}>
                    {url.includes("youtube.com") ? url : `Vídeo ${index + 1}: assista na página do projeto (endereço abaixo)`}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {instrucaoUso && (
            <section id="uso" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("uso")}</span>
                {projeto.tipoProjeto === "jogo" ? "Como jogar" : "Como tocar"}
              </h2>
              <p>{instrucaoUso}</p>
            </section>
          )}

          {(projeto.sugestoesAtividades || projeto.habilidadesMusicais) && (
            <section id="aplicacao" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("aplicacao")}</span>
                Aplicação didática
              </h2>
              {projeto.sugestoesAtividades && (
                <>
                  <h3 className="secao__sub">Sugestões de atividades</h3>
                  <p>{projeto.sugestoesAtividades}</p>
                </>
              )}
              {projeto.habilidadesMusicais && (
                <aside className="nota-margem">
                  <h3 className="secao__sub">Habilidades musicais desenvolvidas</h3>
                  <p>{projeto.habilidadesMusicais}</p>
                </aside>
              )}
            </section>
          )}

          {projeto.referencias && (
            <section id="referencias" className="secao">
              <h2 className="secao__titulo">
                <span className="secao__num">{numero("referencias")}</span>
                Referências
              </h2>
              <p className="referencias">{projeto.referencias}</p>
            </section>
          )}

          {isAuthenticated && projeto.publicadoPor && (
            <p className="artigo__publicado">Publicado no site por {projeto.publicadoPor}</p>
          )}

          {podeEditar(projeto) && (
            <div className="artigo__acoes">
              <Link to={`/editar-projeto/${id}`} className="btn btn--ghost">
                Editar projeto
              </Link>
              <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={excluindo}>
                {excluindo ? "Apagando…" : "Apagar projeto"}
              </button>
            </div>
          )}

          <ConviteCompartilhar titulo={projeto.titulo} />

          <Comentarios tipo="projeto" alvo={id} />

          <div className="artigo__fim">
            <VoltarLink />
          </div>
        </div>
      </div>

      {lightbox !== null && imagens.length > 0 && (
        <Lightbox imagens={imagens} indiceInicial={lightbox} onClose={() => setLightbox(null)} />
      )}
    </article>
  );
}

export default ProjetoDetalhes;
