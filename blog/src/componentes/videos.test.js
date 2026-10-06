import { capaDoVideo, descreverVideo, idDoYoutube, urlDoYoutube, urlVideo } from "./videos";
import { urlsFinais, videosSalvos } from "./CampoVideos";

describe("idDoYoutube", () => {
  test.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "link comum"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc", "link com tempo e playlist"],
    ["https://youtu.be/dQw4w9WgXcQ", "link curto"],
    ["https://youtu.be/dQw4w9WgXcQ?si=compartilhado", "link curto do botão compartilhar"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "link do celular"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "Shorts"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "embed"],
    ["  https://youtu.be/dQw4w9WgXcQ  ", "com espaços em volta"],
  ])("reconhece %s (%s)", (link) => {
    expect(idDoYoutube(link)).toBe("dQw4w9WgXcQ");
  });

  test.each([
    "https://vimeo.com/123456",
    "https://www.youtube.com/channel/UC123",
    "https://www.youtube.com/watch?v=curto",
    "https://youtube.com.golpe.com/watch?v=dQw4w9WgXcQ",
    "não é um link",
    "",
    undefined,
  ])("recusa %s", (link) => {
    expect(idDoYoutube(link)).toBeNull();
  });

  test("gera o endereço no formato que o servidor aceita", () => {
    expect(urlDoYoutube("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});

describe("vídeos do Cloudinary", () => {
  const url = "https://res.cloudinary.com/demo/video/upload/v1712345/videos/aula.mov";

  test("entrega a versão otimizada", () => {
    expect(urlVideo(url)).toBe("https://res.cloudinary.com/demo/video/upload/f_auto,q_auto,c_limit,w_1280/v1712345/videos/aula.mov");
  });

  test("gera a imagem de capa a partir de um quadro do vídeo", () => {
    expect(capaDoVideo(url, 400)).toBe("https://res.cloudinary.com/demo/video/upload/so_auto,c_limit,w_400/v1712345/videos/aula.jpg");
  });

  test("identifica o tipo de cada vídeo", () => {
    expect(descreverVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ").tipo).toBe("youtube");
    expect(descreverVideo(url).tipo).toBe("arquivo");
  });
});

describe("lista final de vídeos", () => {
  test("mantém a ordem, trocando cada arquivo pela URL enviada", () => {
    const itens = [
      ...videosSalvos(["https://salvo/1"]),
      { tipo: "arquivo", arquivo: {} },
      { tipo: "link", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { tipo: "arquivo", arquivo: {} },
    ];
    expect(urlsFinais(itens, ["https://enviado/a", "https://enviado/b"])).toEqual([
      "https://salvo/1",
      "https://enviado/a",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://enviado/b",
    ]);
  });
});
