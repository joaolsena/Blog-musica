// Monta o PDF de um projeto (definição de documento do pdfmake).
// Só descreve o documento: as fontes, as fotos e o download ficam em baixarPdf.js.
// Os textos longos saem justificados; listas curtas, legendas e referências, alinhados à esquerda.

import { DURACOES, FAIXAS_ETARIAS, NIVEIS, rotuloTipo } from "./tipos";

// A4 em pontos e margens (esquerda, topo, direita, base)
const PAGINA = { largura: 595.28, altura: 841.89 };
const MARGENS = [54, 52, 54, 64];
export const LARGURA_UTIL = PAGINA.largura - MARGENS[0] - MARGENS[2];

const COR = {
  tinta: "#1a1714",
  tinta2: "#4a433c",
  suave: "#6b6258",
  linha: "#e2dacd",
  fundo: "#f5f1ea",
  destaque: "#b53a26",
  jogo: "#2f4f8f",
};

// Mesmo desenho do favicon.svg
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="16" fill="#B53A26"/>
  <g fill="#FBF8F3">
    <ellipse cx="12.6" cy="21.2" rx="4.4" ry="3.2" transform="rotate(-24 12.6 21.2)"/>
    <rect x="15.5" y="7.5" width="1.8" height="13.6" rx="0.9"/>
    <path d="M16.4 7.5c0 2.7 2.2 3.9 3.6 5.1 1.5 1.3 2.4 2.8 1.9 5.2-.1.6-.6.7-.7.1-.4-2-1.6-3.1-3-3.8-.8-.4-1.4-.6-1.8-.6z"/>
  </g>
</svg>`;

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII"];
const FOTOS_POR_LINHA = 3;
const ESPACO_FOTOS = 14;

// Itens separados por ponto e vírgula (materiais e passo a passo), como na página do projeto
export const dividir = (texto) => (texto ? texto.split(";").map((item) => item.trim()).filter(Boolean) : []);

// Um parágrafo por linha do texto digitado
const paragrafos = (texto) => (texto ? texto.split(/\n+/).map((p) => p.trim()).filter(Boolean) : []);

const corrido = (texto, estilo = "corpo") => paragrafos(texto).map((p) => ({ text: p, style: estilo }));

const linhaFina = (margem = [0, 0, 0, 0]) => ({
  canvas: [{ type: "line", x1: 0, y1: 0, x2: LARGURA_UTIL, y2: 0, lineWidth: 0.6, lineColor: COR.linha }],
  margin: margem,
});

const tituloSecao = (numero, titulo) => [
  {
    text: [{ text: `${numero}   `, color: COR.destaque, italics: true }, titulo],
    style: "secao",
    headlineLevel: 1,
  },
  linhaFina([0, 5, 0, 12]),
];

const subtitulo = (texto) => ({ text: texto, style: "sub", headlineLevel: 2 });

function ficha(projeto) {
  const faixas = FAIXAS_ETARIAS.filter((f) => projeto.faixasEtarias?.includes(f.valor)).map((f) => f.curto);
  const nivel = NIVEIS.find((n) => n.valor === projeto.nivel)?.rotulo;
  const duracao = DURACOES.find((d) => d.valor === projeto.duracao)?.rotulo;
  const itens = [
    faixas.length > 0 && ["Para", faixas.join(" · ")],
    nivel && ["Nível", nivel],
    duracao && ["Duração", duracao],
  ].filter(Boolean);
  if (itens.length === 0) return null;
  return {
    table: {
      widths: itens.map(([termo]) => (termo === "Para" ? "*" : "auto")),
      body: [
        itens.map(([termo, valor]) => ({
          stack: [
            { text: termo.toUpperCase(), style: "fichaTermo" },
            { text: valor, style: "fichaValor" },
          ],
          fillColor: COR.fundo,
          margin: [10, 7, 14, 8],
        })),
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i, no) => (i === 0 || i === no.table.widths.length ? 0 : 1.5),
      vLineColor: () => "#ffffff",
    },
    margin: [0, 14, 0, 0],
  };
}

// Materiais com um quadradinho para marcar; em duas colunas quando a lista é longa
function listaMateriais(materiais) {
  const item = (texto) => ({
    columns: [
      {
        width: 15,
        canvas: [{ type: "rect", x: 0, y: 3, w: 7.5, h: 7.5, r: 1.2, lineWidth: 0.8, lineColor: COR.suave }],
      },
      { text: texto, width: "*" },
    ],
    columnGap: 0,
    margin: [0, 0, 0, 5],
    unbreakable: true,
  });
  if (materiais.length < 7) return { stack: materiais.map(item), margin: [0, 0, 0, 8] };
  const metade = Math.ceil(materiais.length / 2);
  return {
    columns: [
      { stack: materiais.slice(0, metade).map(item), width: "*" },
      { stack: materiais.slice(metade).map(item), width: "*" },
    ],
    columnGap: 20,
    margin: [0, 0, 0, 8],
  };
}

function listaEtapas(etapas) {
  return {
    stack: etapas.map((etapa, index) => ({
      columns: [
        { text: String(index + 1), width: 18, style: "numeroEtapa" },
        { text: etapa, width: "*", alignment: "justify" },
      ],
      columnGap: 4,
      margin: [0, 0, 0, 7],
    })),
    margin: [0, 0, 0, 6],
  };
}

// Fotos do passo a passo em linhas de três, com "Passo N" e a legenda embaixo
function galeria(projeto, fotos) {
  const largura = (LARGURA_UTIL - ESPACO_FOTOS * (FOTOS_POR_LINHA - 1)) / FOTOS_POR_LINHA;
  const celulas = (projeto.imagensPassoAPasso || [])
    .map((_, index) => {
      const foto = fotos[`passo${index}`];
      if (!foto) return null;
      const legenda = projeto.legendasPassoAPasso?.[index];
      return {
        width: largura,
        stack: [
          { image: `passo${index}`, width: largura, height: largura },
          { text: `PASSO ${index + 1}`, style: "passoFoto" },
          legenda ? { text: legenda, style: "legenda" } : null,
        ].filter(Boolean),
      };
    })
    .filter(Boolean);
  if (celulas.length === 0) return null;

  const linhas = [];
  for (let i = 0; i < celulas.length; i += FOTOS_POR_LINHA) {
    const linha = celulas.slice(i, i + FOTOS_POR_LINHA);
    while (linha.length < FOTOS_POR_LINHA) linha.push({ width: largura, text: "" });
    linhas.push({ columns: linha, columnGap: ESPACO_FOTOS, margin: [0, 0, 0, 14], unbreakable: true });
  }
  return { stack: linhas, margin: [0, 6, 0, 0] };
}

/**
 * @param {object} projeto      projeto como vem da API
 * @param {object} opcoes
 * @param {object} opcoes.fotos     imagens já carregadas: { capa, passo0, passo1, ... } (data URLs); as que faltarem ficam de fora
 * @param {string} opcoes.endereco  endereço da página do projeto
 */
export function montarDocumento(projeto, { fotos = {}, endereco }) {
  const materiais = dividir(projeto.materiais);
  const etapas = dividir(projeto.passoAPasso);
  const instrucaoUso = [projeto.comoTocar, projeto.comoJogar].filter(Boolean).join("\n");
  const ehJogo = projeto.tipoProjeto === "jogo";
  const enderecoCurto = endereco.replace(/^https?:\/\//, "");
  const fotosDaGaleria = galeria(projeto, fotos);

  // Seções na mesma ordem e numeração da página do projeto
  const secoes = [];
  const secao = (titulo, conteudo) => secoes.push({ titulo, conteudo: conteudo.filter(Boolean) });

  if (projeto.descricaoGeral) secao("Descrição", corrido(projeto.descricaoGeral, "abertura"));

  if (materiais.length > 0 || etapas.length > 0 || fotosDaGaleria) {
    secao("Construção", [
      materiais.length > 0 && subtitulo("Materiais necessários"),
      materiais.length > 0 && listaMateriais(materiais),
      etapas.length > 0 && subtitulo("Passo a passo"),
      etapas.length > 0 && listaEtapas(etapas),
      fotosDaGaleria,
    ]);
  }

  if (projeto.videos?.length > 0) {
    secao(projeto.videos.length > 1 ? "Vídeos" : "Vídeo", [
      {
        ul: projeto.videos.map((url, index) => {
          const nome = projeto.videos.length > 1 ? `Vídeo ${index + 1}: ` : "";
          return url.includes("youtube.com") || url.includes("youtu.be")
            ? { text: [nome, { text: url, link: url, style: "link" }] }
            : { text: [nome, "assista na página do projeto, ", { text: enderecoCurto, link: endereco, style: "link" }] };
        }),
        markerColor: COR.destaque,
        margin: [0, 0, 0, 6],
      },
    ]);
  }

  if (instrucaoUso) secao(ehJogo ? "Como jogar" : "Como tocar", corrido(instrucaoUso));

  if (projeto.sugestoesAtividades || projeto.habilidadesMusicais) {
    secao("Aplicação didática", [
      projeto.sugestoesAtividades && subtitulo("Sugestões de atividades"),
      ...corrido(projeto.sugestoesAtividades),
      projeto.habilidadesMusicais && subtitulo("Habilidades musicais desenvolvidas"),
      ...corrido(projeto.habilidadesMusicais),
    ]);
  }

  // Referências não são justificadas: são citações com nomes, títulos e endereços
  if (projeto.referencias) secao("Referências", corrido(projeto.referencias, "referencias"));

  const meta = [{ text: "Por " }, { text: projeto.autor || "Ensine Música", bold: true }];
  if (projeto.data) meta.push({ text: `  ·  ${projeto.data}` });

  return {
    pageSize: "A4",
    pageMargins: MARGENS,
    language: "pt-BR",
    info: {
      title: projeto.titulo,
      author: projeto.autor || "Ensine Música",
      subject: projeto.descricaoGeral?.slice(0, 200),
      creator: "Ensine Música",
      producer: "Ensine Música",
    },

    content: [
      {
        columns: [
          { svg: LOGO, width: 16, height: 16 },
          { text: "ENSINE MÚSICA", style: "marca", width: "*", margin: [7, 4, 0, 0] },
          {
            text: rotuloTipo(projeto.tipoProjeto).toUpperCase(),
            style: "marca",
            color: ehJogo ? COR.jogo : COR.destaque,
            width: "auto",
            margin: [0, 4, 0, 0],
          },
        ],
        margin: [0, 0, 0, 22],
      },
      { text: projeto.titulo, style: "titulo" },
      { text: meta, style: "meta" },
      ficha(projeto),
      fotos.capa && { image: "capa", fit: [LARGURA_UTIL, 290], alignment: "center", margin: [0, 18, 0, 0] },
      ...secoes.flatMap(({ titulo, conteudo }, index) => [
        { text: "", margin: [0, index === 0 ? 22 : 16, 0, 0] },
        ...tituloSecao(ROMANOS[index], titulo),
        ...conteudo,
      ]),
    ].filter(Boolean),

    images: fotos,

    footer: (pagina, total) => ({
      columns: [
        { text: [{ text: "Ensine Música  ·  " }, { text: enderecoCurto, link: endereco }], width: "*" },
        { text: `${pagina} / ${total}`, width: "auto" },
      ],
      style: "rodape",
      margin: [MARGENS[0], 26, MARGENS[2], 0],
    }),

    // Título de seção perto do fim da página vai para a próxima, junto com o texto
    pageBreakBefore: (no) =>
      (no.headlineLevel === 1 && no.startPosition.verticalRatio > 0.82) ||
      (no.headlineLevel === 2 && no.startPosition.verticalRatio > 0.9),

    defaultStyle: { font: "Sans", fontSize: 10.5, lineHeight: 1.38, color: COR.tinta },
    styles: {
      marca: { fontSize: 7.5, bold: true, characterSpacing: 1.4, color: COR.suave },
      titulo: { font: "Serif", fontSize: 34, lineHeight: 1.02, margin: [0, 0, 0, 8] },
      meta: { fontSize: 10, color: COR.tinta2 },
      fichaTermo: { fontSize: 6.5, bold: true, characterSpacing: 1.2, color: COR.suave, margin: [0, 0, 0, 1] },
      fichaValor: { fontSize: 10 },
      secao: { font: "Serif", fontSize: 21, lineHeight: 1 },
      sub: { fontSize: 8, bold: true, characterSpacing: 1.2, color: COR.tinta2, margin: [0, 4, 0, 8] },
      abertura: { fontSize: 12, lineHeight: 1.42, alignment: "justify", margin: [0, 0, 0, 8] },
      corpo: { alignment: "justify", margin: [0, 0, 0, 8] },
      numeroEtapa: { font: "Serif", fontSize: 13, lineHeight: 1.1, color: COR.destaque },
      passoFoto: { fontSize: 6.5, bold: true, characterSpacing: 1.2, color: COR.destaque, margin: [0, 6, 0, 1] },
      legenda: { fontSize: 8.5, lineHeight: 1.3, color: COR.tinta2 },
      referencias: { fontSize: 9.5, lineHeight: 1.4, color: COR.tinta2, alignment: "left", margin: [0, 0, 0, 6] },
      link: { color: COR.destaque },
      rodape: { fontSize: 7.5, color: COR.suave },
    },
  };
}

// Nome do arquivo: "Violão de caixa" → "violao-de-caixa.pdf"
export function nomeDoArquivo(titulo) {
  const base = (titulo || "projeto")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "projeto"}.pdf`;
}
