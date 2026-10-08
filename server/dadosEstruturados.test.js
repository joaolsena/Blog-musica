// Dados estruturados (schema.org) das páginas de projeto, plano de aula e tópico do fórum
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { dadosEstruturados, scriptJsonLd, dataIso } = require("./dadosEstruturados");

const origem = "https://ensine-musica.vercel.app";
const foto = "https://res.cloudinary.com/demo/image/upload/v1/projetos/chocalho.jpg";
const principal = (dados) => dados["@graph"][0];
const trilha = (dados) => dados["@graph"].find((parte) => parte["@type"] === "BreadcrumbList");

test("projeto vira material didático com autor, data, turmas e fotos em 3 proporções", () => {
  const endereco = `${origem}/projeto/65f000000000000000000001`;
  const dados = dadosEstruturados({
    tipo: "projeto",
    endereco,
    origem,
    item: {
      _id: "65f000000000000000000001",
      titulo: "Chocalho de garrafa",
      descricaoGeral: "Um chocalho feito com garrafa PET e grãos.",
      imagem: foto,
      autor: "Ana Costa",
      data: "05/03/2025",
      tipoProjeto: "instrumento",
      faixasEtarias: ["infantil", "fundamental1"],
      habilidadesMusicais: "",
    },
  });

  const material = principal(dados);
  assert.equal(dados["@context"], "https://schema.org");
  assert.deepEqual(material["@type"], ["Article", "LearningResource"]);
  assert.equal(material.headline, "Chocalho de garrafa");
  assert.deepEqual(material.author, { "@type": "Person", name: "Ana Costa" });
  assert.equal(material.datePublished, "2025-03-05");
  assert.deepEqual(material.educationalLevel, ["Educação Infantil", "Ensino Fundamental I"]);
  assert.equal(material.image.length, 3);
  assert.match(material.image[0], /\/image\/upload\/c_fill,g_auto,w_1200,h_675,q_auto,f_jpg\/v1\/projetos\/chocalho\.jpg$/);
  assert.equal(material.mainEntityOfPage, endereco);
  assert.equal(material.isAccessibleForFree, true);
  assert.equal("teaches" in material, false, "campo vazio não vai para o Google");
  assert.deepEqual(
    trilha(dados).itemListElement.map((item) => item.name),
    ["Ensine Música", "Chocalho de garrafa"]
  );
});

test("projeto sem autor nem data usa o site como autor e a data de criação do ID", () => {
  const material = principal(
    dadosEstruturados({
      tipo: "projeto",
      endereco: `${origem}/projeto/x`,
      origem,
      item: { _id: "65f000000000000000000001", titulo: "Tambor", tipoProjeto: "instrumento" },
    })
  );
  assert.equal(material.author["@type"], "Organization");
  assert.equal(material.datePublished, new Date(0x65f00000 * 1000).toISOString());
  assert.equal("image" in material, false);
});

test("plano de aula: objetivos, turmas e os projetos usados na aula", () => {
  const material = principal(
    dadosEstruturados({
      tipo: "plano",
      endereco: `${origem}/plano/p1`,
      origem,
      item: {
        _id: "65f000000000000000000002",
        titulo: "Ritmo com garrafas",
        resumo: "Aula sobre pulso e ritmo.",
        objetivos: "Sentir o pulso\n\nTocar em grupo",
        faixasEtarias: ["fundamental2"],
        autor: "",
        publicadoPor: "Beto Lima",
        createdAt: new Date("2025-04-01T12:00:00Z"),
        updatedAt: new Date("2025-04-02T12:00:00Z"),
        projetos: [{ _id: "65f000000000000000000001", titulo: "Chocalho de garrafa", imagem: foto }],
      },
    })
  );
  assert.equal(material.learningResourceType, "Plano de aula");
  assert.deepEqual(material.teaches, ["Sentir o pulso", "Tocar em grupo"]);
  assert.deepEqual(material.author, { "@type": "Person", name: "Beto Lima" });
  assert.equal(material.dateModified, "2025-04-02T12:00:00.000Z");
  assert.deepEqual(material.isBasedOn, [
    { "@type": "CreativeWork", name: "Chocalho de garrafa", url: `${origem}/projeto/65f000000000000000000001` },
  ]);
  assert.equal(material.image.length, 3, "usa a foto do projeto da aula");
});

test("tópico do fórum vira conversa com as respostas e a contagem", () => {
  const dados = dadosEstruturados({
    tipo: "forum",
    endereco: `${origem}/forum/t1`,
    origem,
    item: {
      _id: "65f000000000000000000003",
      titulo: "Onde acho cabaça?",
      texto: "Alguém sabe onde\ncomprar cabaça?",
      nome: "Carla",
      categoria: "materiais",
      createdAt: new Date("2025-05-01T10:00:00Z"),
    },
    respostas: [{ texto: "Na feira!", nome: "Davi", createdAt: new Date("2025-05-01T11:00:00Z") }],
  });
  const conversa = principal(dados);
  assert.equal(conversa["@type"], "DiscussionForumPosting");
  assert.equal(conversa.text, "Alguém sabe onde comprar cabaça?");
  assert.equal(conversa.articleSection, "Materiais");
  assert.equal(conversa.interactionStatistic.userInteractionCount, 1);
  assert.deepEqual(conversa.comment[0].author, { "@type": "Person", name: "Davi" });
  assert.equal("publisher" in conversa, false);
  assert.equal(trilha(dados).itemListElement[1].name, "Fórum");
});

test("nenhum texto consegue fechar o <script> do bloco", () => {
  const html = scriptJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.equal(html.match(/<\/script>/g).length, 1);
  assert.match(html, /\\u003c\/script>/);
  assert.deepEqual(JSON.parse(html.replace(/^<script[^>]*>|<\/script>$/g, "")), {
    name: "</script><script>alert(1)</script>",
  });
});

test("data no formato do site vira ISO; data inválida fica de fora", () => {
  assert.equal(dataIso("31/12/2024"), "2024-12-31");
  assert.equal(dataIso("ontem"), undefined);
  assert.equal(dataIso("", "2025-01-02T03:04:05Z"), "2025-01-02T03:04:05.000Z");
});
