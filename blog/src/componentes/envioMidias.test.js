import { toast } from "sonner";
import { TAMANHO_MAXIMO_MB, mensagemDeErro, prepararImagem, tamanhosValidos } from "./envioMidias";

vi.mock("axios", () => ({ __esModule: true, default: { post: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

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

describe("prepararImagem", () => {
  const foto = (megabytes, tipo = "image/jpeg", nome = "foto.png") =>
    new File([new Uint8Array(megabytes * 1024 * 1024)], nome, { type: tipo });
  const bitmap = (width, height) => ({ width, height, close: vi.fn() });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("envia o original se o navegador não conseguir ler a imagem", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("sem suporte")));
    const original = foto(1);
    expect(await prepararImagem(original)).toBe(original);
  });

  test("não mexe em fotos pequenas", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap(1600, 1200)));
    const original = foto(1, "image/png");
    expect(await prepararImagem(original)).toBe(original);
  });

  test("reduz fotos grandes para 2000 px em JPG", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap(4000, 3000)));
    const contexto = { fillRect: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(contexto);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((pronto) =>
      pronto(new Blob(["x"], { type: "image/jpeg" }))
    );

    const reduzida = await prepararImagem(foto(6, "image/png", "palco.png"));

    expect(contexto.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2000, 1500);
    expect(reduzida.name).toBe("palco.jpg");
    expect(reduzida.type).toBe("image/jpeg");
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
