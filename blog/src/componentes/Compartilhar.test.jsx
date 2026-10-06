import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BotaoCompartilhar, linksDeCompartilhamento } from "./Compartilhar";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const URL_PROJETO = "https://ensine-musica.vercel.app/projeto/123";

describe("linksDeCompartilhamento", () => {
  test("monta a mensagem do WhatsApp com título e link", () => {
    const { whatsapp } = linksDeCompartilhamento({ titulo: "Chocalho & cia", url: URL_PROJETO });
    expect(decodeURIComponent(whatsapp.split("text=")[1])).toBe(`Chocalho & cia — Ensine Música\n${URL_PROJETO}`);
  });

  test("codifica o link do Facebook", () => {
    const { facebook } = linksDeCompartilhamento({ titulo: "x", url: URL_PROJETO });
    expect(facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_PROJETO)}`);
  });
});

describe("BotaoCompartilhar", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/projeto/123");
  });

  afterEach(() => {
    delete navigator.share;
    vi.restoreAllMocks();
  });

  test("no computador abre o menu com as redes", async () => {
    render(<BotaoCompartilhar titulo="Chocalho" />);
    const botao = screen.getByRole("button", { name: "Compartilhar" });
    expect(botao).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(botao);

    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", expect.stringContaining("https://wa.me/"));
    expect(screen.getByRole("link", { name: "Telegram" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "E-mail" })).toBeInTheDocument();
  });

  test("Esc fecha o menu e devolve o foco ao botão", async () => {
    render(<BotaoCompartilhar titulo="Chocalho" />);
    const botao = screen.getByRole("button", { name: "Compartilhar" });
    await userEvent.click(botao);
    await userEvent.keyboard("{Escape}");

    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveFocus();
  });

  test("copia o link da página", async () => {
    const escrever = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    render(<BotaoCompartilhar titulo="Chocalho" />);

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    await userEvent.click(screen.getByRole("button", { name: /Copiar link/ }));

    expect(escrever).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText("Link copiado!")).toBeInTheDocument();
  });

  test("no celular usa o menu nativo do aparelho", async () => {
    const compartilhar = vi.fn().mockResolvedValue();
    navigator.share = compartilhar;
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(pointer: coarse)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<BotaoCompartilhar titulo="Chocalho" />);

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(compartilhar).toHaveBeenCalledWith({
      title: "Chocalho",
      text: "Chocalho — Ensine Música",
      url: window.location.href,
    });
    expect(screen.getByRole("button", { name: "Compartilhar" })).toHaveAttribute("aria-expanded", "false");
  });
});
