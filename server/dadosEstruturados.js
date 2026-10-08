// **Dados estruturados (schema.org) para o Google**
// Além do título e da foto (prévia), a página de um projeto, plano de aula ou tópico do fórum
// leva um bloco JSON-LD que diz ao Google o que ela é: um material didático com autor, data,
// turmas e foto, ou uma conversa de fórum com as respostas. O Google usa isso para entender
// a página e pode mostrá-la com mais detalhes nos resultados (não é garantido).
// Teste de uma página publicada: https://search.google.com/test/rich-results

const FAIXAS_ETARIAS = {
  infantil: "Educação Infantil",
  fundamental1: "Ensino Fundamental I",
  fundamental2: "Ensino Fundamental II",
  medio: "Ensino Médio",
};

const CATEGORIAS_FORUM = {
  duvidas: "Dúvidas",
  ideias: "Ideias e adaptações",
  relatos: "Relatos de sala de aula",
  materiais: "Materiais",
};

// Seção de cada tipo de página (a lista de projetos é a própria página inicial)
const SECOES = {
  projeto: null,
  plano: { nome: "Planos de aula", caminho: "/planos" },
  forum: { nome: "Fórum", caminho: "/forum" },
};

const limpar = (texto) => String(texto || "").replace(/\s+/g, " ").trim();

const cortar = (texto, limite) => {
  const limpo = limpar(texto);
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite).replace(/\s+\S*$/, "")}…`;
};

// "05/03/2025" (como o site mostra) vira "2025-03-05". Sem data, usa a reserva (Date ou texto ISO).
function dataIso(data, reserva) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(limpar(data));
  if (partes) return `${partes[3]}-${partes[2]}-${partes[1]}`;
  const quando = reserva ? new Date(reserva) : null;
  return quando && !Number.isNaN(quando.getTime()) ? quando.toISOString() : undefined;
}

// O ID do MongoDB começa com o momento em que o registro foi criado
const criadoEm = (id) => {
  const segundos = parseInt(String(id || "").slice(0, 8), 16);
  return Number.isFinite(segundos) && segundos > 0 ? new Date(segundos * 1000) : undefined;
};

// O Google pede a foto em três proporções (16:9, 4:3 e 1:1), com pelo menos 1200 px de largura
function fotos(url) {
  if (!url) return undefined;
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return [url];
  return [
    [1200, 675],
    [1200, 900],
    [1200, 1200],
  ].map(([w, h]) => url.replace("/image/upload/", `/image/upload/c_fill,g_auto,w_${w},h_${h},q_auto,f_jpg/`));
}

const site = (origem) => ({
  "@type": "Organization",
  "@id": `${origem}/#organizacao`,
  name: "Ensine Música",
  url: `${origem}/`,
  logo: `${origem}/app/icon-512.png`,
});

// Quem escreveu: o nome informado no material ou, sem nome, o próprio site
const autorDe = (nome, origem) =>
  limpar(nome) ? { "@type": "Person", name: limpar(nome) } : { "@type": "Organization", name: "Ensine Música", url: `${origem}/` };

// Caminho mostrado no Google acima do título: Ensine Música › Fórum › Onde acho cabaça?
const trilha = (tipo, titulo, endereco, origem) => ({
  "@type": "BreadcrumbList",
  itemListElement: [
    { name: "Ensine Música", item: `${origem}/` },
    SECOES[tipo] && { name: SECOES[tipo].nome, item: `${origem}${SECOES[tipo].caminho}` },
    { name: limpar(titulo), item: endereco },
  ]
    .filter(Boolean)
    .map((parte, i) => ({ "@type": "ListItem", position: i + 1, ...parte })),
});

// Tira campos vazios (o Google reclama de listas e textos vazios)
function semVazios(objeto) {
  if (Array.isArray(objeto)) return objeto.map(semVazios);
  if (!objeto || typeof objeto !== "object" || objeto instanceof Date) return objeto;
  return Object.fromEntries(
    Object.entries(objeto)
      .map(([chave, valor]) => [chave, semVazios(valor)])
      .filter(([, valor]) => valor !== undefined && valor !== null && valor !== "" && !(Array.isArray(valor) && !valor.length))
  );
}

const turmas = (faixas) => (faixas || []).map((f) => FAIXAS_ETARIAS[f]).filter(Boolean);

const linhas = (texto) =>
  String(texto || "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

function projeto(p, endereco, origem) {
  const jogo = p.tipoProjeto === "jogo";
  return {
    "@type": ["Article", "LearningResource"],
    "@id": `${endereco}#material`,
    headline: cortar(p.titulo, 110),
    name: limpar(p.titulo),
    description: cortar(p.descricaoGeral, 300),
    image: fotos(p.imagem),
    author: autorDe(p.autor, origem),
    datePublished: dataIso(p.data, criadoEm(p._id)),
    learningResourceType: jogo ? "Jogo musical" : "Tutorial de construção de instrumento musical",
    educationalLevel: turmas(p.faixasEtarias),
    teaches: cortar(p.habilidadesMusicais, 300),
    about: { "@type": "Thing", name: "Educação musical" },
    keywords: ["educação musical", jogo ? "jogo musical" : "instrumento com materiais alternativos"],
  };
}

function plano(p, endereco, origem) {
  return {
    "@type": ["Article", "LearningResource"],
    "@id": `${endereco}#material`,
    headline: cortar(p.titulo, 110),
    name: limpar(p.titulo),
    description: cortar(p.resumo, 300),
    image: fotos(p.projetos?.find((proj) => proj?.imagem)?.imagem),
    author: autorDe(p.autor || p.publicadoPor, origem),
    datePublished: dataIso(p.data, p.createdAt || criadoEm(p._id)),
    dateModified: dataIso(null, p.updatedAt),
    learningResourceType: "Plano de aula",
    educationalLevel: turmas(p.faixasEtarias),
    teaches: linhas(p.objetivos).slice(0, 8).map((objetivo) => cortar(objetivo, 200)),
    about: { "@type": "Thing", name: "Educação musical" },
    // Os projetos do site usados na aula
    isBasedOn: (p.projetos || [])
      .filter((proj) => proj?._id && proj.titulo)
      .map((proj) => ({ "@type": "CreativeWork", name: limpar(proj.titulo), url: `${origem}/projeto/${proj._id}` })),
  };
}

function topico(t, endereco, origem, respostas = []) {
  return {
    "@type": "DiscussionForumPosting",
    "@id": `${endereco}#conversa`,
    headline: cortar(t.titulo, 110),
    text: limpar(t.texto),
    url: endereco,
    author: { "@type": "Person", name: limpar(t.nome) || "Visitante" },
    datePublished: dataIso(null, t.createdAt || criadoEm(t._id)),
    articleSection: CATEGORIAS_FORUM[t.categoria],
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: respostas.length,
    },
    comment: respostas.map((r) => ({
      "@type": "Comment",
      text: limpar(r.texto),
      author: { "@type": "Person", name: limpar(r.nome) || "Visitante" },
      datePublished: dataIso(null, r.createdAt || criadoEm(r._id)),
    })),
  };
}

const MONTAR = { projeto, plano, forum: topico };

/**
 * Dados estruturados de uma página.
 * - tipo: "projeto", "plano" ou "forum"
 * - item: o documento do banco (plano com os projetos preenchidos)
 * - respostas: só para o fórum, as respostas aprovadas
 */
function dadosEstruturados({ tipo, item, endereco, origem, respostas }) {
  const principal = { ...MONTAR[tipo](item, endereco, origem, respostas), inLanguage: "pt-BR" };
  // Planos e projetos: o site é quem publica; no fórum, cada pessoa fala por si
  if (tipo !== "forum") {
    Object.assign(principal, {
      publisher: { "@id": `${origem}/#organizacao` },
      mainEntityOfPage: endereco,
      isAccessibleForFree: true,
    });
  }
  return semVazios({
    "@context": "https://schema.org",
    "@graph": [principal, trilha(tipo, item.titulo, endereco, origem), site(origem)],
  });
}

// Bloco <script> para o <head>. O "<" vira código para nenhum texto conseguir fechar o script.
const scriptJsonLd = (dados) =>
  `<script type="application/ld+json">${JSON.stringify(dados).replace(/</g, "\\u003c")}</script>`;

module.exports = { dadosEstruturados, scriptJsonLd, dataIso };
