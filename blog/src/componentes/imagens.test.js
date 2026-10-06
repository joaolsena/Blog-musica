import { srcSetImagem, urlImagem } from "./imagens";

const CLOUDINARY = "https://res.cloudinary.com/demo/image/upload/v1712345/projetos/abc.jpg";

describe("urlImagem", () => {
  test("pede ao Cloudinary a largura e o formato otimizados", () => {
    expect(urlImagem(CLOUDINARY, 800)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/v1712345/projetos/abc.jpg"
    );
  });

  test("não mexe em imagens de outros lugares", () => {
    const externa = "https://picsum.photos/seed/x/800/600";
    expect(urlImagem(externa, 800)).toBe(externa);
  });

  test("aceita valores vazios sem quebrar", () => {
    expect(urlImagem("", 800)).toBe("");
    expect(urlImagem(undefined, 800)).toBeUndefined();
  });
});

describe("srcSetImagem", () => {
  test("lista uma versão para cada largura", () => {
    expect(srcSetImagem(CLOUDINARY, [400, 800])).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_400/v1712345/projetos/abc.jpg 400w, " +
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/v1712345/projetos/abc.jpg 800w"
    );
  });

  test("não gera srcSet para imagens de outros lugares", () => {
    expect(srcSetImagem("https://exemplo.com/foto.jpg", [400, 800])).toBeUndefined();
  });
});
