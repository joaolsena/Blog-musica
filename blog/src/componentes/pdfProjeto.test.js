import { montarDocumento, nomeDoArquivo } from "./pdfProjeto";

const ENDERECO = "https://ensine-musica.vercel.app/projeto/abc";

const projeto = {
  _id: "abc",
  titulo: "Violão de caixa",
  autor: "Ana",
  tipoProjeto: "instrumento",
  descricaoGeral: "Um violão feito com uma caixa.",
  materiais: "1 caixa; 3 cordas",
  passoAPasso: "Corte a caixa; Prenda as cordas",
  imagensPassoAPasso: ["https://res.cloudinary.com/x/image/upload/a.jpg", "https://res.cloudinary.com/x/image/upload/b.jpg"],
  legendasPassoAPasso: ["Caixa aberta", ""],
  comoTocar: "Toque com o polegar.",
  sugestoesAtividades: "Roda de acompanhamento.",
  referencias: "BRITO, Teca Alencar de. Música na educação infantil.",
};

// Todos os nós de texto do documento, em qualquer profundidade
function textos(no, lista = []) {
  if (Array.isArray(no)) no.forEach((n) => textos(n, lista));
  else if (no && typeof no === "object") {
    if (typeof no.text === "string") lista.push(no);
    Object.values(no).forEach((v) => typeof v === "object" && textos(v, lista));
  }
  return lista;
}

const acharTexto = (doc, texto) => textos(doc.content).find((n) => n.text === texto);

test("textos longos saem justificados e as referências, não", () => {
  const doc = montarDocumento(projeto, { endereco: ENDERECO });
  const { styles } = doc;
  expect(styles[acharTexto(doc, projeto.descricaoGeral).style].alignment).toBe("justify");
  expect(styles[acharTexto(doc, projeto.comoTocar).style].alignment).toBe("justify");
  expect(styles[acharTexto(doc, projeto.sugestoesAtividades).style].alignment).toBe("justify");
  expect(acharTexto(doc, "Corte a caixa").alignment).toBe("justify");
  expect(styles[acharTexto(doc, projeto.referencias).style].alignment).toBe("left");
});

test("só entram as fotos que carregaram, com a legenda de cada uma", () => {
  const doc = montarDocumento(projeto, { endereco: ENDERECO, fotos: { passo0: "data:image/jpeg;base64,AAAA" } });
  const json = JSON.stringify(doc.content);
  expect(json).toContain('"image":"passo0"');
  expect(json).not.toContain('"image":"passo1"');
  expect(json).not.toContain('"image":"capa"');
  expect(acharTexto(doc, "Caixa aberta")).toBeTruthy();
  expect(acharTexto(doc, "PASSO 1")).toBeTruthy();
});

test("seções numeradas na ordem da página e rodapé com o endereço", () => {
  const doc = montarDocumento({ ...projeto, tipoProjeto: "jogo", comoTocar: "", comoJogar: "Em duplas." }, {
    endereco: ENDERECO,
  });
  const titulos = doc.content.filter((n) => n.headlineLevel === 1).map((n) => n.text.map((t) => t.text ?? t).join(""));
  expect(titulos).toEqual(["I   Descrição", "II   Construção", "III   Como jogar", "IV   Aplicação didática", "V   Referências"]);
  expect(JSON.stringify(doc.footer(2, 3))).toContain("ensine-musica.vercel.app/projeto/abc");
  expect(JSON.stringify(doc.footer(2, 3))).toContain("2 / 3");
});

test("nome do arquivo sem acentos nem espaços", () => {
  expect(nomeDoArquivo("Violão de caixa: 3 cordas!")).toBe("violao-de-caixa-3-cordas.pdf");
  expect(nomeDoArquivo("")).toBe("projeto.pdf");
});
