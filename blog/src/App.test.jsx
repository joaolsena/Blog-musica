import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import App from "./App";
import { baixarPdf } from "./componentes/baixarPdf";

// O PDF de verdade é gerado no navegador; aqui só confere que o botão chama o gerador
vi.mock("./componentes/baixarPdf", () => ({ baixarPdf: vi.fn(() => Promise.resolve()) }));

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

const PROJETOS = [
  { _id: "1", titulo: "Chocalho de garrafa", tipoProjeto: "instrumento", autor: "Ana", data: "02/10/2026" },
  { _id: "2", titulo: "Batalha dos ritmos", tipoProjeto: "jogo", autor: "Lucas", data: "28/09/2026" },
  { _id: "3", titulo: "Tambor de lata", tipoProjeto: "instrumento", autor: "Júlia", data: "10/09/2026" },
];

function abrir(caminho) {
  window.history.pushState({}, "", caminho);
  return render(<App />);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

// Para testes que simulam falhas de propósito: o componente registra o erro no console
const silenciarErrosEsperados = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("página inicial", () => {
  test("lista os projetos, com o mais recente em destaque", async () => {
    axios.get.mockResolvedValue({ data: PROJETOS });
    abrir("/");

    const destaque = await screen.findByRole("region", { name: "Projeto mais recente" });
    expect(within(destaque).getByText("Chocalho de garrafa")).toBeInTheDocument();
    expect(screen.getByText("Batalha dos ritmos")).toBeInTheDocument();
    expect(screen.getByText("Tambor de lata")).toBeInTheDocument();
  });

  test("filtra por tipo de projeto", async () => {
    axios.get.mockResolvedValue({ data: PROJETOS });
    abrir("/");
    await screen.findByText("Batalha dos ritmos");

    await userEvent.click(screen.getByRole("button", { name: /Jogos/ }));

    expect(screen.getByText("Batalha dos ritmos")).toBeInTheDocument();
    expect(screen.queryByText("Chocalho de garrafa")).not.toBeInTheDocument();
    expect(screen.queryByText("Tambor de lata")).not.toBeInTheDocument();
  });

  test("busca por título ou autor", async () => {
    axios.get.mockResolvedValue({ data: PROJETOS });
    abrir("/");
    await screen.findByText("Batalha dos ritmos");

    await userEvent.type(screen.getByLabelText(/Buscar projetos/), "júlia");

    expect(screen.getByText("Tambor de lata")).toBeInTheDocument();
    expect(screen.queryByText("Batalha dos ritmos")).not.toBeInTheDocument();
  });

  test("mostra o estado vazio quando não há projetos", async () => {
    axios.get.mockResolvedValue({ data: [] });
    abrir("/");
    expect(await screen.findByText("Silêncio por enquanto")).toBeInTheDocument();
  });

  test("avisa quando o servidor não responde", async () => {
    silenciarErrosEsperados();
    axios.get.mockRejectedValue(new Error("sem conexão"));
    abrir("/");
    expect(await screen.findByText("Fora do tom")).toBeInTheDocument();
  });
});

describe("páginas não encontradas", () => {
  test("endereço inexistente mostra a página 404", () => {
    abrir("/pagina-que-nao-existe");
    expect(screen.getByRole("heading", { name: "Esta nota está fora da pauta" })).toBeInTheDocument();
  });

  test("projeto inexistente mostra 'Projeto não encontrado'", async () => {
    silenciarErrosEsperados();
    axios.get.mockRejectedValue({ response: { status: 404 } });
    abrir("/projeto/6ac53dc9b97f33c7c5f9597f");
    expect(await screen.findByRole("heading", { name: "Projeto não encontrado" })).toBeInTheDocument();
  });
});

describe("login", () => {
  test("senha incorreta mostra o erro e mantém na tela de login", async () => {
    axios.post.mockRejectedValue({ response: { status: 401 } });
    abrir("/login");

    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Senha incorreta");
    expect(axios.post).toHaveBeenCalledWith("/auth/login", { email: "", senha: "errada" });
  });

  test("conta com senha temporária vai direto criar a própria senha", async () => {
    axios.post.mockResolvedValue({
      data: {
        token: "t",
        expiraEm: Date.now() + 60000,
        usuario: { id: "u1", nome: "Ana Costa", email: "ana@escola.com", papel: "autor", trocarSenha: true },
      },
    });
    abrir("/login");

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@escola.com");
    await userEvent.type(screen.getByLabelText("Senha"), "abcde-fghij");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Crie a sua senha" })).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith("/auth/login", { email: "ana@escola.com", senha: "abcde-fghij" });
  });

  test("muitas tentativas mostram o aviso de bloqueio", async () => {
    axios.post.mockRejectedValue({ response: { status: 429 } });
    abrir("/login");

    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas");
  });

  test("páginas de professor exigem login", () => {
    abrir("/adicionar-projeto");
    expect(screen.getByRole("heading", { name: "Área do professor" })).toBeInTheDocument();
  });
});

describe("contas individuais", () => {
  const entrarComo = (usuario) =>
    localStorage.setItem(
      "ensine-musica:sessao",
      JSON.stringify({ token: "t", expiraEm: Date.now() + 60000, usuario })
    );
  const AUTORA = { id: "u1", nome: "Ana Costa", email: "ana@escola.com", papel: "autor" };

  test("autor só vê Editar e Apagar nos próprios projetos", async () => {
    entrarComo(AUTORA);
    axios.get.mockResolvedValue({ data: { ...PROJETOS[0], criadoPor: "outra-conta", publicadoPor: "Lucas" } });
    abrir("/projeto/1");
    expect(await screen.findByText("Publicado no site por Lucas")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Editar projeto" })).not.toBeInTheDocument();
  });

  test("autor vê Editar no projeto que publicou", async () => {
    entrarComo(AUTORA);
    axios.get.mockResolvedValue({ data: { ...PROJETOS[0], criadoPor: "u1", publicadoPor: "Ana Costa" } });
    abrir("/projeto/1");
    expect(await screen.findByRole("link", { name: "Editar projeto" })).toBeInTheDocument();
  });

  test("autor não entra nas páginas de administração", () => {
    entrarComo(AUTORA);
    axios.get.mockResolvedValue({ data: [] });
    abrir("/contas");
    expect(screen.queryByRole("heading", { name: "Contas" })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });

  test("menu da conta mostra Contas e Backup só para administradores", async () => {
    entrarComo({ ...AUTORA, papel: "admin" });
    axios.get.mockResolvedValue({ data: PROJETOS });
    abrir("/");
    await userEvent.click(screen.getByRole("button", { name: "Conta de Ana Costa" }));
    expect(screen.getAllByRole("link", { name: "Contas" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Backup" }).length).toBeGreaterThan(0);
  });
});

describe("legendas das fotos", () => {
  test("aparecem embaixo das fotos e no texto alternativo", async () => {
    axios.get.mockResolvedValue({
      data: {
        ...PROJETOS[0],
        imagensPassoAPasso: ["https://exemplo.com/1.jpg", "https://exemplo.com/2.jpg"],
        legendasPassoAPasso: ["Garrafas lavadas", ""],
      },
    });
    abrir("/projeto/1");
    expect(await screen.findByText("Garrafas lavadas")).toBeInTheDocument();
    expect(screen.getByAltText("Passo 1 — Garrafas lavadas")).toBeInTheDocument();
    expect(screen.getByAltText("Passo 2 da construção")).toBeInTheDocument();
  });
});

describe("projetos guardados no aparelho", () => {
  const guardar = (projetos) =>
    localStorage.setItem("ensine-musica:projetos", JSON.stringify({ salvoEm: Date.now(), projetos }));

  test("mostra na hora a última lista vista e avisa que está sincronizando", async () => {
    guardar(PROJETOS.slice(0, 2));
    axios.get.mockReturnValue(new Promise(() => {})); // servidor ainda não respondeu
    abrir("/");

    expect(screen.getByText("Batalha dos ritmos")).toBeInTheDocument();
    expect(await screen.findByText("Sincronizando…")).toBeInTheDocument();
  });

  test("troca pela lista do servidor quando ela chega e guarda a nova", async () => {
    guardar(PROJETOS.slice(0, 1));
    axios.get.mockResolvedValue({ data: PROJETOS });
    abrir("/");

    expect(await screen.findByText("Tambor de lata")).toBeInTheDocument();
    const guardados = JSON.parse(localStorage.getItem("ensine-musica:projetos")).projetos;
    expect(guardados).toHaveLength(3);
  });

  test("sem conexão, continua mostrando a versão guardada", async () => {
    silenciarErrosEsperados();
    guardar(PROJETOS);
    axios.get.mockRejectedValue(new Error("Network Error"));
    abrir("/");

    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument();
    expect(screen.getByText("Tambor de lata")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  test("abre sem internet um projeto já visto", async () => {
    silenciarErrosEsperados();
    guardar([{ ...PROJETOS[0], descricaoGeral: "Um chocalho colorido." }]);
    axios.get.mockRejectedValue(new Error("Network Error"));
    abrir("/projeto/1");

    expect(screen.getByRole("heading", { level: 1, name: "Chocalho de garrafa" })).toBeInTheDocument();
    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument();
  });
});

describe("ficha do projeto (turma, nível e duração)", () => {
  const COM_FICHA = [
    { ...PROJETOS[0], faixasEtarias: ["infantil", "fundamental1"], nivel: "facil", duracao: "1" },
    { ...PROJETOS[1], faixasEtarias: ["fundamental2"], nivel: "desafiador", duracao: "2" },
    { ...PROJETOS[2] }, // sem ficha
  ];

  test("filtra por nível e mostra o resumo nos cards", async () => {
    axios.get.mockResolvedValue({ data: COM_FICHA });
    abrir("/");
    await screen.findByText("Batalha dos ritmos");
    expect(screen.getByText("Infantil · Fundamental I · Fácil · 1 aula")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Turma, nível e duração/ }));
    await userEvent.click(screen.getByRole("button", { name: "Desafiador" }));

    expect(screen.getByText("Batalha dos ritmos")).toBeInTheDocument();
    expect(screen.queryByText("Chocalho de garrafa")).not.toBeInTheDocument();
    expect(screen.queryByText("Tambor de lata")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.getByText("Tambor de lata")).toBeInTheDocument();
  });

  test("sem nenhuma ficha preenchida, os filtros nem aparecem", async () => {
    axios.get.mockResolvedValue({ data: PROJETOS });
    abrir("/");
    await screen.findByText("Batalha dos ritmos");
    expect(screen.queryByRole("button", { name: /Turma, nível e duração/ })).not.toBeInTheDocument();
  });

  test("a página do projeto mostra a ficha e o botão de baixar o PDF", async () => {
    axios.get.mockResolvedValue({ data: COM_FICHA[0] });
    abrir("/projeto/1");

    expect(await screen.findByText("Infantil · Fundamental I")).toBeInTheDocument();
    expect(screen.getByText("Fácil")).toBeInTheDocument();
    expect(screen.getByText("1 aula")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Baixar PDF" }));
    expect(baixarPdf).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: COM_FICHA[0].titulo }),
      `${window.location.origin}/projeto/${COM_FICHA[0]._id}`
    );
  });
});
