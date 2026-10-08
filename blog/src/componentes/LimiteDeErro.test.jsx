import React from "react";
import { render, screen } from "@testing-library/react";
import { LimiteDeErro, ehErroDeArquivo } from "./LimiteDeErro";

function Quebra({ erro }) {
  throw erro;
}

const recarregar = vi.fn();
let online = true;

beforeEach(() => {
  recarregar.mockClear();
  online = true;
  sessionStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
  Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload: recarregar } });
});

afterEach(() => vi.restoreAllMocks());

const erroDeArquivo = () => new TypeError("Failed to fetch dynamically imported module: /assets/Forum-abc.js");

test("reconhece o erro de arquivo de página em cada navegador", () => {
  expect(ehErroDeArquivo(erroDeArquivo())).toBe(true);
  expect(ehErroDeArquivo(new TypeError("Importing a module script failed."))).toBe(true);
  expect(ehErroDeArquivo(new TypeError("error loading dynamically imported module"))).toBe(true);
  expect(ehErroDeArquivo(new Error("Cannot read properties of undefined"))).toBe(false);
});

test("um erro comum mostra o aviso no lugar da página, sem tela branca", () => {
  render(
    <LimiteDeErro>
      <Quebra erro={new Error("Cannot read properties of undefined")} />
    </LimiteDeErro>
  );
  expect(screen.getByRole("heading", { name: "Algo saiu do compasso" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/");
  expect(recarregar).not.toHaveBeenCalled();
});

test("arquivo de uma versão antiga do site: recarrega sozinho, mas uma vez só", () => {
  const { unmount } = render(
    <LimiteDeErro>
      <Quebra erro={erroDeArquivo()} />
    </LimiteDeErro>
  );
  expect(recarregar).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status", { name: "Carregando página" })).toBeInTheDocument();
  unmount();

  // O erro voltou logo depois de recarregar: mostra o aviso em vez de recarregar sem parar
  render(
    <LimiteDeErro>
      <Quebra erro={erroDeArquivo()} />
    </LimiteDeErro>
  );
  expect(recarregar).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("heading", { name: "Algo saiu do compasso" })).toBeInTheDocument();
});

test("sem internet, avisa que a página ainda não foi aberta no aparelho", () => {
  online = false;
  render(
    <LimiteDeErro>
      <Quebra erro={erroDeArquivo()} />
    </LimiteDeErro>
  );
  expect(screen.getByRole("heading", { name: "Esta página precisa de internet" })).toBeInTheDocument();
  expect(recarregar).not.toHaveBeenCalled();

  // A internet voltou: tenta de novo sozinho
  online = true;
  window.dispatchEvent(new Event("online"));
  expect(recarregar).toHaveBeenCalledTimes(1);
});
