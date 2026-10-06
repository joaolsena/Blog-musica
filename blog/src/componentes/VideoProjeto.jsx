import React, { useState } from "react";
import { capaDoVideo, capaDoYoutube, descreverVideo, embedDoYoutube, urlVideo } from "./videos";

// Um vídeo na página do projeto.
// YouTube: mostra só a miniatura com um botão de play e carrega o player ao clicar
// (a página fica leve e o YouTube só é acionado quando a pessoa quer assistir).
// Arquivo enviado: player do próprio navegador, na versão otimizada do Cloudinary.
function VideoProjeto({ url, titulo }) {
  const [tocando, setTocando] = useState(false);
  const video = descreverVideo(url);

  if (video.tipo === "arquivo") {
    return (
      <div className="video">
        <video
          src={urlVideo(url)}
          poster={capaDoVideo(url)}
          controls
          playsInline
          preload="none"
          aria-label={titulo}
        />
      </div>
    );
  }

  if (tocando) {
    return (
      <div className="video">
        <iframe
          src={embedDoYoutube(video.id)}
          title={titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="video">
      <button type="button" className="video__capa" onClick={() => setTocando(true)} aria-label={`Assistir: ${titulo}`}>
        <img src={capaDoYoutube(video.id)} alt="" loading="lazy" decoding="async" />
        <span className="video__play" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        </span>
      </button>
    </div>
  );
}

export default VideoProjeto;
