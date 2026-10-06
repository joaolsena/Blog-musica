// Configuração dos testes (Jest + Testing Library).
// jest-dom adiciona verificações como expect(elemento).toBeInTheDocument().
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// O React Router 7 usa TextEncoder, que o ambiente de testes (jsdom) não tem
Object.assign(global, { TextEncoder, TextDecoder });

// Funções do navegador que o jsdom não implementa
window.matchMedia =
  window.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
window.scrollTo = () => {};
