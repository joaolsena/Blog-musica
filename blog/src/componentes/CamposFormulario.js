import React, { useEffect, useMemo } from "react";
import { urlImagem } from "./imagens";

// Campo de texto (linha única ou várias linhas) com rótulo e dica
export function Campo({ id, rotulo, dica, multilinha = false, ...props }) {
  const Elemento = multilinha ? "textarea" : "input";
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {rotulo}
        {!props.required && <span className="field__optional">opcional</span>}
      </label>
      <Elemento
        id={id}
        className={multilinha ? "input input--area" : "input"}
        rows={multilinha ? 4 : undefined}
        type={multilinha ? undefined : "text"}
        aria-describedby={dica ? `${id}-dica` : undefined}
        {...props}
      />
      {dica && (
        <p id={`${id}-dica`} className="field__hint">
          {dica}
        </p>
      )}
    </div>
  );
}

// Escolha entre "Instrumento" e "Jogo"
export function TipoProjeto({ valor, onChange, nome = "tipoProjeto" }) {
  const opcoes = [
    { valor: "instrumento", rotulo: "Instrumento", descricao: "Algo para tocar" },
    { valor: "jogo", rotulo: "Jogo", descricao: "Brincadeira ou jogo musical" },
  ];
  return (
    <fieldset className="field choice">
      <legend className="field__label">Tipo de projeto</legend>
      <div className="choice__options">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="choice__option">
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={onChange}
            />
            <span className="choice__title">{opcao.rotulo}</span>
            <span className="choice__desc">{opcao.descricao}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Área de envio de imagens com pré-visualização
export function EnvioImagens({ id, rotulo, dica, arquivos, multiplo = false, accept, onChange }) {
  // URLs temporárias para as prévias; liberadas quando os arquivos mudam
  const previas = useMemo(() => arquivos.map((arquivo) => URL.createObjectURL(arquivo)), [arquivos]);
  useEffect(() => () => previas.forEach((url) => URL.revokeObjectURL(url)), [previas]);

  return (
    <div className="field">
      <span className="field__label" id={`${id}-rotulo`}>
        {rotulo}
        <span className="field__optional">opcional</span>
      </span>
      <label htmlFor={id} className="dropzone">
        <input
          id={id}
          type="file"
          accept={accept}
          multiple={multiplo}
          onChange={onChange}
          className="sr-only"
          aria-labelledby={`${id}-rotulo`}
          aria-describedby={`${id}-dica`}
        />
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 17l5-4.5 4 3.5 3-2.5 5 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span className="dropzone__title">
          {arquivos.length > 0
            ? `${arquivos.length} ${arquivos.length === 1 ? "imagem selecionada" : "imagens selecionadas"}`
            : multiplo
            ? "Escolher imagens"
            : "Escolher imagem"}
        </span>
        <span id={`${id}-dica`} className="field__hint">
          {dica}
        </span>
      </label>

      {previas.length > 0 && (
        <div className="previews">
          {previas.map((url, index) => (
            <img key={url} src={url} alt={`Pré-visualização ${index + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// Imagens já salvas no projeto, cada uma com um botão para removê-la
export function ImagensAtuais({ rotulo, urls, onRemover }) {
  if (urls.length === 0) return null;
  return (
    <div className="field">
      <span className="field__label">{rotulo}</span>
      <ul className="imagens-atuais">
        {urls.map((url, index) => (
          <li key={url} className="imagens-atuais__item">
            <img src={urlImagem(url, 300)} alt={`${rotulo} ${urls.length > 1 ? index + 1 : ""}`.trim()} />
            <button
              type="button"
              className="imagens-atuais__remover"
              onClick={() => onRemover(index)}
              aria-label={`Remover ${rotulo.toLowerCase()}${urls.length > 1 ? ` ${index + 1}` : ""}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
