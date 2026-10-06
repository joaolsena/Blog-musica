import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Tema claro/escuro. O tema inicial é aplicado por um script em public/index.html
// (antes do React carregar); aqui o React assume a partir dele.
const CHAVE_TEMA = "ensine-musica:tema";
const COR_BARRA = { light: "#f5f1ea", dark: "#12100e" };

const TemaContext = createContext({ tema: "light", alternarTema: () => {} });

export const useTema = () => useContext(TemaContext);

function lerEscolhaSalva() {
  try {
    const tema = localStorage.getItem(CHAVE_TEMA);
    return tema === "light" || tema === "dark" ? tema : null;
  } catch {
    return null;
  }
}

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  // Cor da barra do navegador no celular
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = COR_BARRA[tema];
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(
    () => document.documentElement.dataset.theme || "light",
  );

  // Enquanto o visitante não escolher, acompanha mudanças no tema do sistema
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = (e) => {
      if (lerEscolhaSalva()) return;
      const novo = e.matches ? "dark" : "light";
      aplicarTema(novo);
      setTema(novo);
    };
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  const alternarTema = useCallback(() => {
    const novo = tema === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(CHAVE_TEMA, novo);
    } catch {
      // sem armazenamento: a escolha vale só até fechar a página
    }

    const trocar = () => {
      aplicarTema(novo);
      setTema(novo);
    };

    // Transição suave entre os temas onde o navegador suporta (View Transitions);
    // nos outros, e para quem prefere menos movimento, a troca é imediata.
    const reduzirMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (document.startViewTransition && !reduzirMovimento) {
      document.startViewTransition(trocar);
    } else {
      trocar();
    }
  }, [tema]);

  return (
    <TemaContext.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}

// Botão sol/lua do cabeçalho
export function BotaoTema() {
  const { tema, alternarTema } = useTema();
  const escuro = tema === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={alternarTema}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
      data-tema={tema}
    >
      {/* Sol */}
      <svg
        className="theme-toggle__icon theme-toggle__sol"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {/* Lua */}
      <svg
        className="theme-toggle__icon theme-toggle__lua"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
