// Testes do servidor: login, permissões e limites de envio de imagens.
// Rodam com o executor de testes do próprio Node (npm test), sem banco de dados
// nem Cloudinary: todas as verificações testadas acontecem antes de chegar neles.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

// Configuração de teste. Definida antes de carregar o servidor; o dotenv não
// sobrescreve variáveis que já existem, então o .env real não é usado.
const SENHA = "senha-de-teste";
const SEGREDO = "segredo-de-teste";
Object.assign(process.env, {
  MONGO_URI: "",
  ADMIN_PASSWORD: SENHA,
  TOKEN_SECRET: SEGREDO,
  CLOUDINARY_CLOUD_NAME: "teste",
  CLOUDINARY_API_KEY: "teste",
  CLOUDINARY_API_SECRET: "teste",
});

const app = require("./server");

let servidor;
let base;
let token;

before(async () => {
  servidor = app.listen(0);
  await new Promise((resolve) => servidor.once("listening", resolve));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

const login = (senha) =>
  fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senha }),
  });

const comToken = (t = token) => ({ Authorization: `Bearer ${t}` });

// Formulário com imagens falsas (o conteúdo não importa: os limites barram antes do envio)
const formulario = (campo, arquivos) => {
  const form = new FormData();
  arquivos.forEach(({ tipo, bytes }, i) => form.append(campo, new Blob([Buffer.alloc(bytes)], { type: tipo }), `foto${i}`));
  return form;
};

test("senha errada é recusada", async () => {
  const resposta = await login("errada");
  assert.equal(resposta.status, 401);
});

test("senha certa devolve um token com validade", async () => {
  const resposta = await login(SENHA);
  assert.equal(resposta.status, 200);
  const dados = await resposta.json();
  assert.ok(dados.token);
  assert.ok(dados.expiraEm > Date.now());
  token = dados.token;
});

test("rotas de escrita recusam pedidos sem token", async () => {
  const id = "6ac53dc9b97f33c7c5f9597f";
  const pedidos = [
    ["POST", "/adicionar"],
    ["PUT", `/projetos/${id}`],
    ["DELETE", `/projetos/${id}`],
    ["POST", "/upload"],
    ["POST", "/videos/assinatura"],
    ["POST", "/midias/remover"],
  ];
  for (const [method, caminho] of pedidos) {
    const resposta = await fetch(base + caminho, { method });
    assert.equal(resposta.status, 401, `${method} ${caminho}`);
  }
});

test("token falsificado é recusado", async () => {
  const dados = Buffer.from(JSON.stringify({ exp: Date.now() + 1e9 })).toString("base64url");
  const resposta = await fetch(`${base}/upload`, { method: "POST", headers: comToken(`${dados}.assinatura-falsa`) });
  assert.equal(resposta.status, 401);
});

test("token vencido é recusado", async () => {
  const dados = Buffer.from(JSON.stringify({ exp: Date.now() - 1000 })).toString("base64url");
  const assinatura = crypto.createHmac("sha256", SEGREDO).update(dados).digest("base64url");
  const resposta = await fetch(`${base}/upload`, { method: "POST", headers: comToken(`${dados}.${assinatura}`) });
  assert.equal(resposta.status, 401);
});

test("ID de projeto inválido responde 404", async () => {
  for (const id of ["abc", "123", "6ac53dc9b97f33c7c5f9597"]) {
    const resposta = await fetch(`${base}/projetos/${id}`);
    assert.equal(resposta.status, 404, id);
  }
});

test("rota inexistente da API responde 404", async () => {
  const resposta = await fetch(`${base}/nao-existe`);
  assert.equal(resposta.status, 404);
});

test("envio sem imagem é recusado", async () => {
  const resposta = await fetch(`${base}/upload`, { method: "POST", headers: comToken() });
  assert.equal(resposta.status, 400);
});

test("imagem acima de 10 MB é recusada com mensagem clara", async () => {
  const resposta = await fetch(`${base}/upload`, {
    method: "POST",
    headers: comToken(),
    body: formulario("imagem", [{ tipo: "image/jpeg", bytes: 11 * 1024 * 1024 }]),
  });
  assert.equal(resposta.status, 413);
  assert.match(await resposta.text(), /limite é 10 MB/);
});

test("formato diferente de JPG ou PNG é recusado", async () => {
  const resposta = await fetch(`${base}/upload`, {
    method: "POST",
    headers: comToken(),
    body: formulario("imagem", [{ tipo: "image/heic", bytes: 100 }]),
  });
  assert.equal(resposta.status, 415);
});

test("só uma imagem por envio", async () => {
  const duas = [{ tipo: "image/jpeg", bytes: 100 }, { tipo: "image/jpeg", bytes: 100 }];
  const resposta = await fetch(`${base}/upload`, {
    method: "POST",
    headers: comToken(),
    body: formulario("imagem", duas),
  });
  assert.equal(resposta.status, 400);
});

test("assinatura de vídeo vale só para a pasta e os formatos de vídeo", async () => {
  const resposta = await fetch(`${base}/videos/assinatura`, { method: "POST", headers: comToken() });
  assert.equal(resposta.status, 200);
  const dados = await resposta.json();
  assert.equal(dados.folder, "videos");
  assert.match(dados.allowed_formats, /mp4/);
  assert.ok(dados.signature && dados.timestamp && dados.api_key && dados.cloud_name);
});

// Salvar um projeto: a validação das mídias acontece antes de qualquer acesso ao banco
const salvar = (corpo) =>
  fetch(`${base}/adicionar`, {
    method: "POST",
    headers: { ...comToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ titulo: "Teste", ...corpo }),
  });

test("projeto com mais de 20 imagens no passo a passo é recusado", async () => {
  const imagens = Array.from({ length: 21 }, (_, i) => `https://exemplo.com/${i}.jpg`);
  const resposta = await salvar({ imagensPassoAPasso: imagens });
  assert.equal(resposta.status, 400);
  assert.match(await resposta.text(), /até 20 imagens/);
});

test("projeto com mais de 5 vídeos é recusado", async () => {
  const videos = Array.from({ length: 6 }, () => "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const resposta = await salvar({ videos });
  assert.equal(resposta.status, 400);
  assert.match(await resposta.text(), /até 5 vídeos/);
});

test("só aceita vídeos do YouTube ou do Cloudinary desta conta", async () => {
  const recusados = [
    "https://site-qualquer.com/video.mp4",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&autoplay=1",
    "https://res.cloudinary.com/outra-conta/video/upload/v1/videos/x.mp4",
    "https://res.cloudinary.com/teste/image/upload/v1/projetos/x.jpg",
    "https://res.cloudinary.com/teste/video/upload/v1/outra-pasta/x.mp4",
  ];
  for (const video of recusados) {
    const resposta = await salvar({ videos: [video] });
    assert.equal(resposta.status, 400, video);
  }
});

// Por último: depois dele o IP de teste fica bloqueado por 15 minutos
test("login bloqueia após 5 senhas erradas, mesmo com a senha certa", async () => {
  for (let i = 0; i < 5; i++) {
    assert.equal((await login("errada")).status, 401);
  }
  assert.equal((await login("errada")).status, 429);
  assert.equal((await login(SENHA)).status, 429);
});
