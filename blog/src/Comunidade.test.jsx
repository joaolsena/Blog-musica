import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import App from "./App";
import { quando } from "./componentes/comunidade";

// Simula o servidor: nenhum teste faz requisições de verdade
vi.mock("axios", () => {
  const interceptor = { use: vi.fn(), eject: vi.fn() };
  return {
    __esModule: true,
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: {},
      interceptors: { request: interceptor, response: interceptor },
    },
  };
});

const PROJETO = { _id: "1", titulo: "Chocalho de garrafa", tipoProjeto: "instrumento", autor: "Ana", data: "02/10/2026" };

const TOPICOS = [
  { _id: "t1", titulo: "Como afinar o violão de caixa?", texto: "Alguém tem uma dica?", categoria: "duvidas", nome: "Marcos", respostas: 2, ultimaAtividade: new Date().toISOString() },
  { _id: "t2", titulo: "Pau de chuva na educação infantil", texto: "Deu muito certo.", categoria: "relatos", nome: "Juliana", respostas: 0, ultimaAtividade: new Date().toISOString() },
];

const PLANO = {
  _id: "p1",
  titulo: "Pulsação com chocalhos",
  resumo: "Uma aula sobre pulsação.",
  faixasEtarias: ["infantil"],
  duracao: "2",
  objetivos: "Perceber a pulsação\nManter o pulso em grupo",
  materiais: "Chocalhos",
  desenvolvimento: "Acolhida (10 min): conversa\nPrática (20 min): tocar junto",
  projetos: [{ _id: "1", titulo: "Chocalho de garrafa", tipoProjeto: "instrumento" }],
  autor: "Ana",
  data: "07/10/2026",
};

// Responde cada endereço com os dados certos
function servidor(rotas) {
  axios.get.mockImplementation((url) => {
    const resposta = rotas[url];
    return resposta ? Promise.resolve({ data: resposta }) : Promise.reject(new Error(`sem rota: ${url}`));
  });
}

function abrir(caminho) {
  window.history.pushState({}, "", caminho);
  return render(<App />);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

test("o menu tem os links de planos de aula e do fórum", async () => {
  servidor({ "/projetos": [PROJETO] });
  abrir("/");
  const navegacao = screen.getByRole("navigation", { name: "Navegação principal" });
  expect(within(navegacao).getByRole("link", { name: "Planos de aula" })).toHaveAttribute("href", "/planos");
  expect(within(navegacao).getByRole("link", { name: "Fórum" })).toHaveAttribute("href", "/forum");
});

test("visitante comenta num projeto: a mensagem espera aprovação e fica visível só para ele", async () => {
  servidor({ "/projetos/1": PROJETO, "/comentarios": [] });
  axios.post.mockResolvedValue({
    status: 202,
    data: { _id: "c1", nome: "Paula", texto: "Adorei o projeto!", status: "pendente", criadoEm: new Date().toISOString() },
  });
  abrir("/projeto/1");

  await screen.findByText("Ainda não há comentários. Conte o que achou ou tire uma dúvida.");
  await userEvent.type(screen.getByLabelText("Seu nome"), "Paula");
  await userEvent.type(screen.getByLabelText("Seu comentário"), "Adorei o projeto!");
  await userEvent.click(screen.getByRole("button", { name: "Enviar comentário" }));

  expect(axios.post).toHaveBeenCalledWith("/comentarios", {
    tipo: "projeto",
    alvo: "1",
    nome: "Paula",
    texto: "Adorei o projeto!",
    site: "",
  });
  expect(await screen.findByText(/Recebemos a sua mensagem/)).toBeInTheDocument();
  expect(screen.getByText("Adorei o projeto!")).toBeInTheDocument();
  expect(screen.getByText("Aguardando aprovação")).toBeInTheDocument();
});

test("fórum filtra os tópicos por categoria", async () => {
  servidor({ "/forum": TOPICOS });
  abrir("/forum");
  await screen.findByText("Como afinar o violão de caixa?");

  await userEvent.click(screen.getByRole("button", { name: /Relatos de sala de aula/ }));

  expect(screen.getByText("Pau de chuva na educação infantil")).toBeInTheDocument();
  expect(screen.queryByText("Como afinar o violão de caixa?")).not.toBeInTheDocument();
});

test("plano de aula mostra objetivos, etapas e o link do projeto usado", async () => {
  servidor({ "/planos/p1": PLANO, "/comentarios": [] });
  abrir("/plano/p1");

  expect(await screen.findByRole("heading", { level: 1, name: "Pulsação com chocalhos" })).toBeInTheDocument();
  expect(screen.getByText("Manter o pulso em grupo")).toBeInTheDocument();
  expect(screen.getByText("Prática (20 min): tocar junto")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Chocalho de garrafa/ })).toHaveAttribute("href", "/projeto/1");
  expect(screen.getByRole("button", { name: "Baixar PDF" })).toBeInTheDocument();
});

test("datas das mensagens em linguagem do dia a dia", () => {
  const agora = new Date("2026-10-07T15:00:00");
  expect(quando("2026-10-07T14:59:30", agora)).toBe("agora");
  expect(quando("2026-10-07T14:55:00", agora)).toBe("há 5 minutos");
  expect(quando("2026-10-06T15:00:00", agora)).toBe("ontem");
  expect(quando("2026-08-01T10:00:00", agora)).toMatch(/1 de ago/);
});

test("plano de aula guarda rascunho: volta ao reabrir e pode ser descartado", async () => {
  localStorage.setItem(
    "ensine-musica:sessao",
    JSON.stringify({ token: "t", expiraEm: Date.now() + 3600_000, usuario: { id: "u1", nome: "Ana Costa", papel: "autor" } })
  );
  servidor({ "/projetos": [PROJETO] });
  const { unmount } = abrir("/novo-plano");

  await userEvent.type(await screen.findByLabelText("Título"), "Pulsação com chocalhos");
  expect(await screen.findByText(/Rascunho salvo neste aparelho/, {}, { timeout: 2000 })).toBeInTheDocument();
  expect(localStorage.getItem("ensine-musica:rascunho-plano:novo")).toContain("Pulsação com chocalhos");

  // Saiu da página (ou o login venceu) e voltou: o texto continua lá
  unmount();
  abrir("/novo-plano");
  expect(await screen.findByLabelText("Título")).toHaveValue("Pulsação com chocalhos");
  expect(screen.getByLabelText("Quem escreveu")).toHaveValue("Ana Costa");

  await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
  expect(screen.getByLabelText("Título")).toHaveValue("");
  expect(localStorage.getItem("ensine-musica:rascunho-plano:novo")).toBeNull();
});

test("página de privacidade: link no rodapé e lembrete nos formulários do público", async () => {
  servidor({ "/forum": TOPICOS });
  abrir("/forum");
  await screen.findByText("Como afinar o violão de caixa?");
  expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "/privacidade");

  await userEvent.click(screen.getByRole("button", { name: "Novo tópico" }));
  expect(screen.getByText(/Não escreva telefone, endereço nem dados de alunos/)).toBeInTheDocument();

  await userEvent.click(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Privacidade" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Privacidade" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Alunos e menores de idade" })).toBeInTheDocument();
});
