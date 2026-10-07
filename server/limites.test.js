// Testes do limite de tentativas (sem banco: conta na memória, como nos testes do servidor)
const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.MONGO_URI = "";
const { criarLimite } = require("./limites");

test("conta por pessoa e bloqueia ao chegar no máximo", async () => {
  const limite = criarLimite("teste-a", { maximo: 3, janelaMs: 60_000 });
  for (let i = 1; i <= 3; i++) assert.equal(await limite.contar("1.2.3.4"), i);
  const espera = await limite.espera("1.2.3.4");
  assert.ok(espera > 0 && espera <= 60, `espera ${espera}`);
  assert.equal(await limite.espera("5.6.7.8"), 0, "outra pessoa não é afetada");
});

test("zerar libera de novo", async () => {
  const limite = criarLimite("teste-b", { maximo: 2, janelaMs: 60_000 });
  await limite.contar("ana@escola.br");
  await limite.contar("ana@escola.br");
  assert.ok((await limite.espera("ana@escola.br")) > 0);
  await limite.zerar("ana@escola.br");
  assert.equal(await limite.espera("ana@escola.br"), 0);
});

test("limites com nomes diferentes não se misturam", async () => {
  const login = criarLimite("teste-c", { maximo: 1, janelaMs: 60_000 });
  const envios = criarLimite("teste-d", { maximo: 1, janelaMs: 60_000 });
  await login.contar("9.9.9.9");
  assert.ok((await login.espera("9.9.9.9")) > 0);
  assert.equal(await envios.espera("9.9.9.9"), 0);
});
