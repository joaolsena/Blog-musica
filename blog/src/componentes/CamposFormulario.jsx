import React, { useEffect, useMemo } from "react";
import { urlImagem } from "./imagens";
import { DURACOES, FAIXAS_ETARIAS, NIVEIS } from "./tipos";

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

// Ficha do projeto: para quem é (várias), nível e duração. Tudo opcional.
// valor = { faixasEtarias: [], nivel: "", duracao: "" }; onChange(campo, novoValor)
// Planos de aula usam a mesma ficha sem o nível (semNivel).
export function FichaProjeto({ valor, onChange, semNivel = false, dicaFaixas = "Marque todas as turmas em que o projeto funciona bem" }) {
  const faixas = valor.faixasEtarias || [];
  const alternarFaixa = (faixa) =>
    onChange("faixasEtarias", faixas.includes(faixa) ? faixas.filter((f) => f !== faixa) : [...faixas, faixa]);

  const escolhaUnica = (campo, legenda, opcoes) => (
    <fieldset className="field">
      <legend className="field__label">
        {legenda}
        <span className="field__optional">opcional</span>
      </legend>
      <div className="chips">
        {[{ valor: "", rotulo: "Não informar" }, ...opcoes].map((opcao) => (
          <label key={opcao.valor || "nenhum"} className="chip">
            <input
              type="radio"
              name={campo}
              value={opcao.valor}
              checked={(valor[campo] || "") === opcao.valor}
              onChange={() => onChange(campo, opcao.valor)}
            />
            {opcao.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <>
      <fieldset className="field">
        <legend className="field__label">
          Para quem é
          <span className="field__optional">opcional</span>
        </legend>
        <div className="chips">
          {FAIXAS_ETARIAS.map((faixa) => (
            <label key={faixa.valor} className="chip">
              <input
                type="checkbox"
                name="faixasEtarias"
                value={faixa.valor}
                checked={faixas.includes(faixa.valor)}
                onChange={() => alternarFaixa(faixa.valor)}
              />
              {faixa.rotulo}
            </label>
          ))}
        </div>
        <p className="field__hint">{dicaFaixas}</p>
      </fieldset>
      {!semNivel && escolhaUnica("nivel", "Nível de dificuldade", NIVEIS)}
      {escolhaUnica("duracao", "Duração", DURACOES)}
    </>
  );
}

export const LIMITE_LEGENDA = 160; // deve bater com o servidor (server.js)

// Campo de legenda embaixo de uma foto do passo a passo
function CampoLegenda({ id, indice, valor, onChange }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Legenda da foto {indice + 1}
      </label>
      <input
        id={id}
        className="input legenda-foto__campo"
        type="text"
        placeholder="Legenda (opcional)"
        maxLength={LIMITE_LEGENDA}
        value={valor || ""}
        onChange={(e) => onChange(indice, e.target.value)}
        enterKeyHint="next"
      />
    </>
  );
}

// Área de envio de imagens com pré-visualização
// Com legendas/onLegenda, cada prévia ganha um campo de legenda (fotos do passo a passo)
export function EnvioImagens({ id, rotulo, dica, arquivos, multiplo = false, accept, onChange, legendas, onLegenda }) {
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

      {previas.length > 0 && !onLegenda && (
        <div className="previews">
          {previas.map((url, index) => (
            <img key={url} src={url} alt={`Pré-visualização ${index + 1}`} />
          ))}
        </div>
      )}

      {previas.length > 0 && onLegenda && (
        <ul className="legendas-fotos">
          {previas.map((url, index) => (
            <li key={url} className="legenda-foto">
              <img src={url} alt={`Pré-visualização ${index + 1}`} />
              <CampoLegenda id={`${id}-legenda-${index}`} indice={index} valor={legendas?.[index]} onChange={onLegenda} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Imagens já salvas no projeto, cada uma com um botão para removê-la
// (e, com legendas/onLegenda, um campo para editar a legenda)
export function ImagensAtuais({ rotulo, urls, onRemover, legendas, onLegenda }) {
  if (urls.length === 0) return null;
  return (
    <div className="field">
      <span className="field__label">{rotulo}</span>
      <ul className={onLegenda ? "imagens-atuais imagens-atuais--legendas" : "imagens-atuais"}>
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
            {onLegenda && (
              <CampoLegenda id={`legenda-atual-${index}`} indice={index} valor={legendas?.[index]} onChange={onLegenda} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
