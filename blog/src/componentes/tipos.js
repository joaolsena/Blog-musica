// Rótulo legível do tipo de projeto salvo no banco ("instrumento" ou "jogo")
export function rotuloTipo(tipo) {
  return tipo === "jogo" ? "Jogo" : "Instrumento";
}

// Ficha do projeto (opcional). Os valores devem bater com o servidor (server.js).
export const FAIXAS_ETARIAS = [
  { valor: "infantil", rotulo: "Educação Infantil", curto: "Infantil" },
  { valor: "fundamental1", rotulo: "Fundamental I (1º ao 5º ano)", curto: "Fundamental I" },
  { valor: "fundamental2", rotulo: "Fundamental II (6º ao 9º ano)", curto: "Fundamental II" },
  { valor: "medio", rotulo: "Ensino Médio", curto: "Ensino Médio" },
];

export const NIVEIS = [
  { valor: "facil", rotulo: "Fácil" },
  { valor: "medio", rotulo: "Médio" },
  { valor: "desafiador", rotulo: "Desafiador" },
];

export const DURACOES = [
  { valor: "1", rotulo: "1 aula" },
  { valor: "2", rotulo: "2 aulas" },
  { valor: "3+", rotulo: "3 aulas ou mais" },
];

const rotuloDe = (lista, valor, campo = "rotulo") => lista.find((item) => item.valor === valor)?.[campo];

// Resumo da ficha para mostrar no projeto: ["Infantil", "Fundamental I", "Fácil", "1 aula"]
export function resumoDaFicha(projeto) {
  const faixas = FAIXAS_ETARIAS.filter((f) => projeto.faixasEtarias?.includes(f.valor)).map((f) => f.curto);
  return [...faixas, rotuloDe(NIVEIS, projeto.nivel), rotuloDe(DURACOES, projeto.duracao)].filter(Boolean);
}

// Categorias do fórum. Os valores devem bater com o servidor (comunidade.js).
export const CATEGORIAS_FORUM = [
  { valor: "duvidas", rotulo: "Dúvidas", descricao: "Perguntas sobre os projetos e a prática" },
  { valor: "ideias", rotulo: "Ideias e adaptações", descricao: "Variações e novos usos dos projetos" },
  { valor: "relatos", rotulo: "Relatos de sala de aula", descricao: "Como foi aplicar com a turma" },
  { valor: "materiais", rotulo: "Materiais", descricao: "Onde encontrar e o que usar no lugar" },
];

export const rotuloCategoria = (valor) => rotuloDe(CATEGORIAS_FORUM, valor) || "Fórum";

// Listas dos planos de aula: um item por linha
export const linhas = (texto) => (texto ? texto.split("\n").map((linha) => linha.trim()).filter(Boolean) : []);

// Turmas e duração de um plano de aula: "Fundamental I · 2 aulas"
export function resumoDoPlano(plano) {
  const faixas = FAIXAS_ETARIAS.filter((f) => plano.faixasEtarias?.includes(f.valor)).map((f) => f.curto);
  return [...faixas, rotuloDe(DURACOES, plano.duracao)].filter(Boolean).join(" · ");
}
