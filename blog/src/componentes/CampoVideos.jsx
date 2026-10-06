import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FORMATOS_VIDEO, LIMITE_VIDEOS, TAMANHO_MAXIMO_VIDEO_MB, tamanhosValidos } from "./envioMidias";
import { capaDoVideo, capaDoYoutube, descreverVideo, idDoYoutube, urlDoYoutube } from "./videos";

// Itens de vídeo do formulário, na ordem em que aparecem no projeto:
//   { tipo: "salvo", url }     vídeo que o projeto já tinha (edição)
//   { tipo: "link", url }      link do YouTube colado agora
//   { tipo: "arquivo", arquivo } arquivo escolhido agora (sobe ao salvar)
export const videosSalvos = (urls = []) => urls.map((url) => ({ tipo: "salvo", url }));

// Junta os itens com as URLs dos arquivos já enviados, mantendo a ordem
export function urlsFinais(itens, urlsEnviadas) {
  let proximo = 0;
  return itens.map((item) => (item.tipo === "arquivo" ? urlsEnviadas[proximo++] : item.url));
}

const tamanhoLegivel = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function Miniatura({ item }) {
  // Prévia local do arquivo escolhido: mostra o primeiro quadro do vídeo
  const previa = useMemo(() => (item.tipo === "arquivo" ? URL.createObjectURL(item.arquivo) : null), [item]);
  useEffect(() => () => previa && URL.revokeObjectURL(previa), [previa]);

  if (item.tipo === "arquivo") {
    return <video src={`${previa}#t=0.5`} muted playsInline preload="metadata" aria-hidden="true" />;
  }
  const video = descreverVideo(item.url);
  const capa = video.tipo === "youtube" ? capaDoYoutube(video.id) : capaDoVideo(item.url, 400);
  return <img src={capa} alt="" />;
}

function CampoVideos({ itens, onChange }) {
  const [link, setLink] = useState("");
  const [erroLink, setErroLink] = useState("");
  const vagas = LIMITE_VIDEOS - itens.length;

  const adicionarLink = () => {
    const id = idDoYoutube(link);
    if (!id) {
      setErroLink("Esse não parece um link do YouTube. Copie o endereço do vídeo e cole aqui.");
      return;
    }
    const url = urlDoYoutube(id);
    if (itens.some((item) => item.url === url)) {
      setErroLink("Esse vídeo já foi adicionado.");
      return;
    }
    onChange([...itens, { tipo: "link", url }]);
    setLink("");
    setErroLink("");
  };

  const escolherArquivos = (e) => {
    const arquivos = [...e.target.files];
    e.target.value = "";
    if (arquivos.length > vagas) {
      toast.error(`Você pode adicionar mais ${vagas} ${vagas === 1 ? "vídeo" : "vídeos"}.`);
      return;
    }
    if (!tamanhosValidos(arquivos, TAMANHO_MAXIMO_VIDEO_MB, "vídeo")) return;
    onChange([...itens, ...arquivos.map((arquivo) => ({ tipo: "arquivo", arquivo }))]);
  };

  const remover = (indice) => onChange(itens.filter((_, i) => i !== indice));

  return (
    <div className="field videos-campo">
      <span className="field__label">
        Vídeos
        <span className="field__optional">opcional · até {LIMITE_VIDEOS}</span>
      </span>

      {itens.length > 0 && (
        <ul className="videos-lista">
          {itens.map((item, indice) => (
            <li key={item.url || `${item.arquivo.name}-${indice}`} className="videos-lista__item">
              <div className="videos-lista__capa">
                <Miniatura item={item} />
                <span className="videos-lista__play" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
              <div className="videos-lista__info">
                <span className="videos-lista__nome">
                  {item.tipo === "arquivo" ? item.arquivo.name : descreverVideo(item.url).tipo === "youtube" ? "Vídeo do YouTube" : "Vídeo enviado"}
                </span>
                <span className="videos-lista__detalhe">
                  {item.tipo === "arquivo" ? `${tamanhoLegivel(item.arquivo.size)} · sobe ao salvar` : item.tipo === "link" ? "Link adicionado" : "Já está no projeto"}
                </span>
              </div>
              <button
                type="button"
                className="videos-lista__remover"
                onClick={() => remover(indice)}
                aria-label={`Remover vídeo ${indice + 1}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {vagas > 0 ? (
        <div className="videos-opcoes">
          <div className="videos-link">
            <label htmlFor="video-link" className="sr-only">
              Link do YouTube
            </label>
            <input
              id="video-link"
              type="url"
              inputMode="url"
              className="input"
              placeholder="Cole um link do YouTube"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setErroLink("");
              }}
              onKeyDown={(e) => {
                // Enter adiciona o link em vez de enviar o formulário
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarLink();
                }
              }}
              aria-invalid={Boolean(erroLink) || undefined}
              aria-describedby={erroLink ? "video-link-erro" : undefined}
            />
            <button type="button" className="btn btn--ghost" onClick={adicionarLink} disabled={!link.trim()}>
              Adicionar
            </button>
          </div>
          {erroLink && (
            <p id="video-link-erro" className="field__error" role="alert">
              {erroLink}
            </p>
          )}

          <span className="videos-opcoes__ou">ou</span>

          <label htmlFor="video-arquivo" className="dropzone dropzone--compacta">
            <input
              id="video-arquivo"
              type="file"
              accept={FORMATOS_VIDEO}
              multiple
              onChange={escolherArquivos}
              className="sr-only"
            />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="13" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 10l5-3v10l-5-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span className="dropzone__title">Enviar vídeo do aparelho</span>
            <span className="field__hint">
              Até {TAMANHO_MAXIMO_VIDEO_MB} MB cada. Para vídeos longos, prefira o YouTube.
            </span>
          </label>
        </div>
      ) : (
        <p className="field__hint">Este projeto já tem {LIMITE_VIDEOS} vídeos. Remova algum para adicionar outro.</p>
      )}
    </div>
  );
}

export default CampoVideos;
