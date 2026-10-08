import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { MEMORIA, guardar, lerGuardado, lerProjetosSalvos, salvarProjetos } from "./memoria";
import { urlImagem } from "./imagens";
import { buscar, montarIndice, realcar } from "./pesquisa";

// Busca única do cabeçalho: projetos, planos de aula e fórum num lugar só.
// Abre pela lupa ou pelo teclado (Ctrl+K / ⌘K, ou "/"). É usada muitas vezes, então abre
// sem animação de entrada: a resposta precisa parecer imediata.

const IconeLupa = ({ tamanho = 20 }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);

const ICONE_TIPO = {
  plano: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8.5 10h7M8.5 14h7M8.5 18h4" />
    </>
  ),
  topico: <path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.3A7.5 7.5 0 1 1 20 12.5z" />,
  projeto: (
    <>
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
};

function Miniatura({ item }) {
  if (item.imagem) {
    return (
      <span className="busca__miniatura">
        <img src={urlImagem(item.imagem, 96)} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span className="busca__miniatura busca__miniatura--icone">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONE_TIPO[item.tipo]}
      </svg>
    </span>
  );
}

function TituloRealcado({ titulo, palavras }) {
  return realcar(titulo, palavras).map((pedaco, i) =>
    pedaco.marcado ? <mark key={i}>{pedaco.texto}</mark> : <React.Fragment key={i}>{pedaco.texto}</React.Fragment>
  );
}

// Listas guardadas no aparelho: os resultados aparecem antes mesmo de o servidor responder
const listasGuardadas = () => ({
  projetos: lerProjetosSalvos()?.projetos || [],
  planos: lerGuardado(MEMORIA.planos)?.dados || [],
  topicos: lerGuardado(MEMORIA.forum)?.dados || [],
});

const SUGESTOES = ["garrafa", "ritmo", "percussão", "educação infantil"];

function PainelBusca({ aoFechar }) {
  const dialogo = useRef(null);
  const campo = useRef(null);
  const navigate = useNavigate();
  const id = useId();
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [listas, setListas] = useState(listasGuardadas);

  // Abre como modal: prende o foco, fecha com Esc e devolve o foco ao botão ao fechar
  useEffect(() => {
    const el = dialogo.current;
    if (el.showModal) el.showModal();
    else el.setAttribute("open", "");
    campo.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Busca as listas mais novas (e guarda, para a próxima vez e para usar sem internet)
  useEffect(() => {
    let ativoNaTela = true;
    Promise.allSettled([
      axios.get("/projetos", { timeout: 15000 }),
      axios.get("/planos", { timeout: 15000 }),
      axios.get("/forum", { timeout: 15000 }),
    ]).then(([projetos, planos, topicos]) => {
      if (projetos.status === "fulfilled") salvarProjetos(projetos.value.data);
      if (planos.status === "fulfilled") guardar(MEMORIA.planos, planos.value.data);
      if (topicos.status === "fulfilled") guardar(MEMORIA.forum, topicos.value.data);
      if (ativoNaTela) setListas(listasGuardadas());
    });
    return () => {
      ativoNaTela = false;
    };
  }, []);

  const indice = useMemo(() => montarIndice(listas), [listas]);
  const resultado = useMemo(() => buscar(indice, termo), [indice, termo]);
  const itens = resultado.grupos.flatMap((grupo) => grupo.itens);
  const idOpcao = (indiceItem) => `${id}-opcao-${indiceItem}`;

  useEffect(() => setAtivo(0), [termo]);

  // Mantém a opção escolhida pelo teclado à vista
  useEffect(() => {
    document.getElementById(idOpcao(ativo))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  const fechar = () => {
    dialogo.current?.close?.();
    aoFechar();
  };

  const abrir = (item) => {
    fechar();
    navigate(item.url);
  };

  const aoTeclar = (e) => {
    if (itens.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((atual) => (atual + 1) % itens.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((atual) => (atual - 1 + itens.length) % itens.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      abrir(itens[ativo]);
    }
  };

  const temTermo = resultado.palavras.join("").length >= 2;
  let posicao = -1;

  return (
    <dialog
      ref={dialogo}
      className="busca"
      aria-label="Buscar no site"
      onCancel={(e) => {
        e.preventDefault();
        fechar();
      }}
      onClick={(e) => e.target === e.currentTarget && fechar()}
    >
      <div className="busca__painel">
        <div className="busca__campo">
          <IconeLupa />
          <input
            ref={campo}
            type="search"
            role="combobox"
            aria-expanded={itens.length > 0}
            aria-controls={`${id}-resultados`}
            aria-activedescendant={itens.length > 0 ? idOpcao(ativo) : undefined}
            aria-autocomplete="list"
            aria-label="Buscar projetos, planos de aula e fórum"
            placeholder="Buscar projetos, planos e fórum"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={aoTeclar}
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="button" className="busca__fechar" onClick={fechar}>
            <span className="busca__esc">Esc</span>
            <span className="busca__fechar-texto">Fechar</span>
          </button>
        </div>

        <div className="busca__corpo">
          {!temTermo && (
            <div className="busca__vazio">
              <p>Busque por um material, um tema ou o nome de um projeto.</p>
              <div className="chips chips--compactas">
                {SUGESTOES.map((sugestao) => (
                  <button key={sugestao} type="button" className="chip" onClick={() => { setTermo(sugestao); campo.current?.focus(); }}>
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {temTermo && resultado.total === 0 && (
            <div className="busca__vazio">
              <p>
                Nada encontrado para <strong>“{termo.trim()}”</strong>. Tente outra palavra ou só o começo dela.
              </p>
            </div>
          )}

          <div id={`${id}-resultados`} role="listbox" aria-label="Resultados" className="busca__resultados">
            {resultado.grupos.map((grupo) => (
              <div key={grupo.tipo} role="group" aria-label={grupo.rotulo} className="busca__grupo">
                <p className="busca__grupo-titulo" aria-hidden="true">
                  {grupo.rotulo}
                  <span>{grupo.total > grupo.itens.length ? `${grupo.itens.length} de ${grupo.total}` : grupo.total}</span>
                </p>
                {grupo.itens.map((item) => {
                  posicao += 1;
                  const minhaPosicao = posicao;
                  return (
                    <div
                      key={`${item.tipo}-${item.id}`}
                      id={idOpcao(minhaPosicao)}
                      role="option"
                      aria-selected={ativo === minhaPosicao}
                      className="busca__item"
                      onMouseMove={() => ativo !== minhaPosicao && setAtivo(minhaPosicao)}
                      onClick={() => abrir(item)}
                    >
                      <Miniatura item={item} />
                      <span className="busca__texto">
                        <span className="busca__titulo">
                          <TituloRealcado titulo={item.titulo} palavras={resultado.palavras} />
                        </span>
                        {item.detalhe && <span className="busca__detalhe">{item.detalhe}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {itens.length > 0 && (
          <p className="busca__rodape" aria-hidden="true">
            <kbd>↑</kbd> <kbd>↓</kbd> para escolher · <kbd>Enter</kbd> para abrir
          </p>
        )}
      </div>
    </dialog>
  );
}

// Lupa do cabeçalho. Também abre com Ctrl+K / ⌘K, ou com "/" fora de um campo de texto.
export function BotaoBusca() {
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    const aoTeclar = (e) => {
      const digitando = e.target.closest?.("input, textarea, select, [contenteditable='true']");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberta(true);
      } else if (e.key === "/" && !digitando && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setAberta(true);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <>
      <button
        type="button"
        className="botao-instalar botao-busca"
        aria-label="Buscar no site"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K /"
        title="Buscar (Ctrl+K)"
        onClick={() => setAberta(true)}
      >
        <IconeLupa />
      </button>
      {aberta && <PainelBusca aoFechar={() => setAberta(false)} />}
    </>
  );
}
