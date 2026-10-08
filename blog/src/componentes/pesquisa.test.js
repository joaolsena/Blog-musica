import { buscar, montarIndice, normalizar, realcar } from "./pesquisa";

const indice = montarIndice({
  projetos: [
    { _id: "1", titulo: "Violão de caixa", tipoProjeto: "instrumento", autor: "Ana", descricaoGeral: "Três cordas e uma caixa de madeira." },
    { _id: "2", titulo: "Chocalho de garrafa PET", tipoProjeto: "instrumento", autor: "Beto", materiais: "Garrafa; arroz" },
    { _id: "3", titulo: "Batalha dos ritmos", tipoProjeto: "jogo", autor: "Lucas" },
  ],
  planos: [{ _id: "p1", titulo: "Pulsação e ritmo", resumo: "Com chocalhos.", projetos: [{ titulo: "Chocalho de garrafa PET" }] }],
  topicos: [{ _id: "t1", titulo: "Como afinar o violão?", texto: "Sem afinador.", categoria: "duvidas", respostas: 2 }],
});

test("ignora acentos e maiúsculas", () => {
  expect(normalizar("Violão PULSAÇÃO")).toBe("violao pulsacao");
  const { grupos } = buscar(indice, "VIOLAO");
  expect(grupos.map((g) => g.tipo)).toEqual(["projeto", "topico"]);
});

test("todas as palavras precisam aparecer, no título ou no texto", () => {
  expect(buscar(indice, "garrafa arroz").total).toBe(1);
  expect(buscar(indice, "garrafa violino").total).toBe(0);
});

test("título vale mais que o texto e começo de palavra vale mais", () => {
  const { grupos } = buscar(indice, "ritmo");
  expect(grupos[0].itens[0].titulo).toBe("Batalha dos ritmos");
  expect(grupos.find((g) => g.tipo === "plano").itens[0].url).toBe("/plano/p1");
});

test("acha o plano pelo nome do projeto que ele usa", () => {
  const { grupos } = buscar(indice, "garrafa");
  expect(grupos.find((g) => g.tipo === "plano").itens[0].titulo).toBe("Pulsação e ritmo");
});

test("precisa de pelo menos 2 letras", () => {
  expect(buscar(indice, "v").total).toBe(0);
});

test("destaca o trecho encontrado mesmo com acento", () => {
  expect(realcar("Violão de caixa", ["violao"])).toEqual([
    { texto: "Violão", marcado: true },
    { texto: " de caixa", marcado: false },
  ]);
});
