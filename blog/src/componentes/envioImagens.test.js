import { toast } from "sonner";
import { TAMANHO_MAXIMO_MB, mensagemDeErro, tamanhosValidos } from "./envioImagens";

jest.mock("axios", () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const arquivo = (nome, megabytes) => ({ name: nome, size: megabytes * 1024 * 1024 });

describe("tamanhosValidos", () => {
  beforeEach(() => toast.error.mockClear());

  test("aceita imagens dentro do limite", () => {
    expect(tamanhosValidos([arquivo("a.jpg", 2), arquivo("b.jpg", TAMANHO_MAXIMO_MB)])).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("recusa e avisa qual imagem passou do limite", () => {
    expect(tamanhosValidos([arquivo("pequena.jpg", 1), arquivo("enorme.jpg", 12)])).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('"enorme.jpg" tem 12.0 MB'));
  });

  test("lista vazia é válida", () => {
    expect(tamanhosValidos([])).toBe(true);
  });
});

describe("mensagemDeErro", () => {
  const erro = (status, data) => ({ response: { status, data } });

  test("usa a mensagem do servidor para erros de imagem", () => {
    expect(mensagemDeErro(erro(413, "Imagem muito grande."), "padrão")).toBe("Imagem muito grande.");
    expect(mensagemDeErro(erro(415, "Formato não aceito."), "padrão")).toBe("Formato não aceito.");
    expect(mensagemDeErro(erro(400, "Imagens demais."), "padrão")).toBe("Imagens demais.");
  });

  test("usa a mensagem padrão para outros erros", () => {
    expect(mensagemDeErro(erro(500, "Erro interno"), "padrão")).toBe("padrão");
    expect(mensagemDeErro(new Error("sem conexão"), "padrão")).toBe("padrão");
  });
});
