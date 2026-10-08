// Busca única: procura ao mesmo tempo nos projetos, planos de aula e tópicos do fórum.
// Tudo acontece no aparelho, com as listas que o site já carrega (e guarda para usar sem
// internet). Ignora acentos e maiúsculas: "violao" acha "Violão".

import { resumoDoPlano, rotuloCategoria, rotuloTipo } from "./tipos";

export const normalizar = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export const palavrasDa = (busca) => normalizar(busca).split(/\s+/).filter(Boolean);

export const GRUPOS = [
  { tipo: "projeto", rotulo: "Projetos" },
  { tipo: "plano", rotulo: "Planos de aula" },
  { tipo: "topico", rotulo: "Fórum" },
];

const juntar = (...partes) => normalizar(partes.flat().filter(Boolean).join(" "));

// Transforma as listas do servidor em itens de busca, todos no mesmo formato
export function montarIndice({ projetos = [], planos = [], topicos = [] }) {
  return [
    ...projetos.map((p) => ({
      tipo: "projeto",
      id: p._id,
      titulo: p.titulo || "",
      detalhe: [rotuloTipo(p.tipoProjeto), p.autor].filter(Boolean).join(" · "),
      imagem: p.imagem,
      url: `/projeto/${p._id}`,
      texto: juntar(p.descricaoGeral, p.materiais, p.autor, p.habilidadesMusicais, p.sugestoesAtividades),
    })),
    ...planos.map((p) => ({
      tipo: "plano",
      id: p._id,
      titulo: p.titulo || "",
      detalhe: resumoDoPlano(p) || p.autor || p.publicadoPor || "",
      url: `/plano/${p._id}`,
      texto: juntar(p.resumo, p.objetivos, p.materiais, p.autor, (p.projetos || []).map((projeto) => projeto?.titulo)),
    })),
    ...topicos.map((t) => ({
      tipo: "topico",
      id: t._id,
      titulo: t.titulo || "",
      detalhe: [
        rotuloCategoria(t.categoria),
        t.respostas ? `${t.respostas} ${t.respostas === 1 ? "resposta" : "respostas"}` : "sem respostas",
      ].join(" · "),
      url: `/forum/${t._id}`,
      texto: juntar(t.texto, t.nome),
    })),
  ].map((item) => ({ ...item, tituloNormal: normalizar(item.titulo) }));
}

// Pontos de um item: título vale mais que o resto; todas as palavras precisam aparecer
function pontuar(item, palavras) {
  let pontos = 0;
  for (const palavra of palavras) {
    const noTitulo = item.tituloNormal.indexOf(palavra);
    const noTexto = item.texto.includes(palavra);
    if (noTitulo === -1 && !noTexto) return 0;
    if (noTitulo === 0) pontos += 6;
    else if (noTitulo > 0) pontos += item.tituloNormal[noTitulo - 1] === " " ? 4 : 2;
    if (noTexto) pontos += 1;
  }
  return pontos;
}

/**
 * Procura `busca` no índice. Devolve os grupos com resultados, na ordem Projetos, Planos,
 * Fórum, cada um com até `porGrupo` itens, os mais relevantes primeiro.
 */
export function buscar(indice, busca, { porGrupo = 6 } = {}) {
  const palavras = palavrasDa(busca);
  if (palavras.join("").length < 2) return { palavras, grupos: [], total: 0 };
  const achados = indice
    .map((item) => ({ ...item, pontos: pontuar(item, palavras) }))
    .filter((item) => item.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.titulo.localeCompare(b.titulo));
  const grupos = GRUPOS.map((grupo) => {
    const itens = achados.filter((item) => item.tipo === grupo.tipo);
    return { ...grupo, itens: itens.slice(0, porGrupo), total: itens.length };
  }).filter((grupo) => grupo.itens.length > 0);
  return { palavras, grupos, total: achados.length };
}

// Divide um título em pedaços, marcando os que combinam com a busca (para destacar)
export function realcar(texto, palavras) {
  // Normaliza letra por letra, guardando de onde veio cada uma
  let normal = "";
  const origem = [];
  [...texto].forEach((letra, indice) => {
    const n = normalizar(letra);
    for (let i = 0; i < n.length; i++) origem.push(indice);
    normal += n;
  });
  const letras = [...texto];
  const marcado = new Array(letras.length).fill(false);
  for (const palavra of palavras) {
    let inicio = normal.indexOf(palavra);
    while (palavra && inicio !== -1) {
      for (let i = inicio; i < inicio + palavra.length; i++) marcado[origem[i]] = true;
      inicio = normal.indexOf(palavra, inicio + palavra.length);
    }
  }
  const pedacos = [];
  letras.forEach((letra, i) => {
    const ultimo = pedacos[pedacos.length - 1];
    if (ultimo && ultimo.marcado === marcado[i]) ultimo.texto += letra;
    else pedacos.push({ texto: letra, marcado: marcado[i] });
  });
  return pedacos;
}
