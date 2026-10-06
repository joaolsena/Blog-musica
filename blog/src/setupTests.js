// Configuração dos testes (Vitest + Testing Library).
// jest-dom adiciona verificações como expect(elemento).toBeInTheDocument().
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta o que cada teste renderizou, para um teste não interferir no próximo
afterEach(() => cleanup());

// Funções do navegador que o jsdom (o navegador simulado dos testes) não implementa
window.matchMedia =
  window.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
window.scrollTo = () => {};
