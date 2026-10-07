// Servidor sem a senha principal (ADMIN_PASSWORD apagada depois de criar as contas):
// só as contas individuais entram e tokens antigos da conta principal deixam de valer.
// Fica num arquivo separado porque o node --test roda cada arquivo num processo próprio.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const SEGREDO = "segredo-de-teste";
Object.assign(process.env, {
  MONGO_URI: "",
  ADMIN_PASSWORD: "",
  TOKEN_SECRET: SEGREDO,
  CLOUDINARY_CLOUD_NAME: "teste",
  CLOUDINARY_API_KEY: "teste",
  CLOUDINARY_API_SECRET: "teste",
});

const app = require("./server");

let servidor;
let base;

before(async () => {
  servidor = app.listen(0);
  await new Promise((resolve) => servidor.once("listening", resolve));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

test("sem a senha principal, login com e-mail em branco pede o e-mail", async () => {
  const resposta = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "", senha: "qualquer-coisa" }),
  });
  assert.equal(resposta.status, 400);
  assert.match(await resposta.text(), /e-mail/);
});

test("token da conta principal deixa de valer quando a senha principal é removida", async () => {
  const dados = Buffer.from(JSON.stringify({ exp: Date.now() + 60000, uid: null })).toString("base64url");
  const assinatura = crypto.createHmac("sha256", SEGREDO).update(dados).digest("base64url");
  const resposta = await fetch(`${base}/auth/eu`, { headers: { Authorization: `Bearer ${dados}.${assinatura}` } });
  assert.equal(resposta.status, 401);
});
