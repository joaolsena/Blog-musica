import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BotaoInstalar } from "./InstalarApp";
import { detectarPlataforma, podeInstalar } from "./instalacao";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const UA = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  windowsEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  windowsFirefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
};

describe("detectarPlataforma", () => {
  test.each([
    ["iphoneSafari", 5, "iphone", "safari"],
    ["iphoneChrome", 5, "iphone", "chrome"],
    ["ipad", 5, "ipad", "safari"],
    ["macSafari", 0, "mac", "safari"],
    ["macChrome", 0, "mac", "chrome"],
    ["androidChrome", 5, "android", "chrome"],
    ["samsung", 5, "android", "samsung"],
    ["windowsEdge", 0, "windows", "edge"],
    ["windowsFirefox", 0, "windows", "firefox"],
  ])("%s", (nome, toques, sistema, navegador) => {
    expect(detectarPlataforma(UA[nome], toques)).toMatchObject({ sistema, navegador });
  });

  test("só esconde o botão onde não há como instalar", () => {
    expect(podeInstalar(detectarPlataforma(UA.windowsFirefox, 0))).toBe(false);
    expect(podeInstalar(detectarPlataforma(UA.macSafari, 0))).toBe(true);
    expect(podeInstalar(detectarPlataforma(UA.iphoneChrome, 5))).toBe(true);
    expect(podeInstalar(detectarPlataforma(UA.windowsEdge, 0))).toBe(true);
  });
});

describe("BotaoInstalar", () => {
  const usarNavegador = (ua, toques = 0) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
    Object.defineProperty(navigator, "maxTouchPoints", { value: toques, configurable: true });
  };

  afterEach(() => vi.restoreAllMocks());

  test("no iPhone mostra o passo a passo com a logo", async () => {
    usarNavegador(UA.iphoneSafari, 5);
    render(<BotaoInstalar />);

    await userEvent.click(screen.getByRole("button", { name: "Instalar o app" }));

    expect(screen.getByRole("heading", { name: "Ensine Música" })).toBeInTheDocument();
    expect(screen.getByText("Instale o app no seu iPhone")).toBeInTheDocument();
    expect(screen.getByText("Adicionar à Tela de Início")).toBeInTheDocument();
  });

  test("no Chrome abre a janela de instalação do navegador", async () => {
    usarNavegador(UA.androidChrome, 5);
    const convite = new Event("beforeinstallprompt");
    convite.prompt = vi.fn();
    convite.userChoice = Promise.resolve({ outcome: "accepted" });
    render(<BotaoInstalar />);
    act(() => {
      window.dispatchEvent(convite);
    });

    await userEvent.click(screen.getByRole("button", { name: "Instalar o app" }));

    expect(convite.prompt).toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Ensine Música" })).not.toBeInTheDocument();
  });

  test("some quando o site já está aberto como app", () => {
    usarNavegador(UA.androidChrome, 5);
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<BotaoInstalar />);
    expect(screen.queryByRole("button", { name: "Instalar o app" })).not.toBeInTheDocument();
  });

  test("some no Firefox do computador, que não instala sites", () => {
    usarNavegador(UA.windowsFirefox);
    render(<BotaoInstalar />);
    expect(screen.queryByRole("button", { name: "Instalar o app" })).not.toBeInTheDocument();
  });
});
