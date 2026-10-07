// Testes com um MongoDB de verdade, criado na memória só para os testes (mongodb-memory-server).
// Cobrem o que depende do banco: contas, planos de aula, comentários, fórum, moderação,
// limites de tentativas e backup. Na primeira vez, baixa o MongoDB (uns 80 MB).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { MongoMemoryServer } = require("mongodb-memory-server-core");

const SENHA = "senha-principal-de-teste";
let mongod;
let servidor;
let base;
let mongoose;

// Cada "visitante" usa um IP diferente, para os limites de envio não se misturarem entre testes
let proximoIp = 1;
const novoIp = () => `10.0.0.${proximoIp++}`;

const pedir = async (metodo, caminho, { corpo, token, ip = "10.0.9.9" } = {}) => {
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": ip,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let dados = texto;
  try {
    dados = JSON.parse(texto);
  } catch {
    // resposta em texto
  }
  return { status: resposta.status, dados };
};

let admin; // token da conta principal
const contas = {}; // { ana: { token, id }, beto: ... }
let projeto; // um projeto publicado pela conta principal

// Cria uma conta de autor e entra com ela
async function criarAutor(nome, email) {
  const { dados } = await pedir("POST", "/usuarios", { token: admin, corpo: { nome, email, papel: "autor" } });
  const login = await pedir("POST", "/auth/login", { corpo: { email, senha: dados.senhaTemporaria }, ip: novoIp() });
  return { token: login.dados.token, id: login.dados.usuario.id };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  Object.assign(process.env, {
    MONGO_URI: mongod.getUri("ensine_teste"),
    ADMIN_PASSWORD: SENHA,
    TOKEN_SECRET: "segredo-de-teste",
    CLOUDINARY_CLOUD_NAME: "teste",
    CLOUDINARY_API_KEY: "teste",
    CLOUDINARY_API_SECRET: "teste",
  });
  mongoose = require("mongoose");
  const app = require("./server");
  servidor = app.listen(0);
  await new Promise((resolve) => servidor.once("listening", resolve));
  base = `http://127.0.0.1:${servidor.address().port}/api`;

  admin = (await pedir("POST", "/auth/login", { corpo: { senha: SENHA }, ip: novoIp() })).dados.token;
  contas.ana = await criarAutor("Ana Costa", "ana@escola.br");
  contas.beto = await criarAutor("Beto Lima", "beto@escola.br");
  projeto = (
    await pedir("POST", "/adicionar", {
      token: admin,
      corpo: { titulo: "Chocalho de garrafa", descricaoGeral: "Um chocalho.", materiais: "Garrafa; arroz", autor: "Ana" },
    })
  ).dados;
});

after(async () => {
  servidor?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

test("comentário de visitante só aparece depois de aprovado", async () => {
  const ip = novoIp();
  const enviado = await pedir("POST", "/comentarios", {
    ip,
    corpo: { tipo: "projeto", alvo: projeto._id, nome: "Paula", texto: "Fiz com a turma, adoraram!" },
  });
  assert.equal(enviado.status, 202);
  assert.equal(enviado.dados.status, "pendente");

  const publicos = await pedir("GET", `/comentarios?tipo=projeto&alvo=${projeto._id}`);
  assert.equal(publicos.dados.length, 0, "pendente não aparece para o público");

  const moderacao = await pedir("GET", "/moderacao", { token: contas.ana.token });
  const item = moderacao.dados.comentarios.find((c) => c._id === enviado.dados._id);
  assert.equal(item.alvo.titulo, "Chocalho de garrafa", "moderação mostra onde foi escrito");

  const contagemAntes = (await pedir("GET", "/moderacao/contagem", { token: admin })).dados.total;
  assert.equal((await pedir("POST", `/moderacao/comentarios/${item._id}/aprovar`, { token: contas.ana.token })).status, 200);
  assert.equal((await pedir("GET", "/moderacao/contagem", { token: admin })).dados.total, contagemAntes - 1);

  const depois = await pedir("GET", `/comentarios?tipo=projeto&alvo=${projeto._id}`);
  assert.deepEqual(depois.dados.map((c) => c.texto), ["Fiz com a turma, adoraram!"]);
});

test("professor logado comenta na hora, com o nome da conta", async () => {
  const enviado = await pedir("POST", "/comentarios", {
    token: contas.beto.token,
    corpo: { tipo: "projeto", alvo: projeto._id, nome: "Outro nome", texto: "Dica: use grãos diferentes." },
  });
  assert.equal(enviado.status, 201);
  assert.equal(enviado.dados.nome, "Beto Lima");
  assert.equal(enviado.dados.professor, true);
});

test("comentário em lugar que não existe é recusado", async () => {
  const resposta = await pedir("POST", "/comentarios", {
    ip: novoIp(),
    corpo: { tipo: "plano", alvo: "6ac53dc9b97f33c7c5f9597f", nome: "Paula", texto: "Olá!" },
  });
  assert.equal(resposta.status, 404);
});

test("fórum: tópico aprovado, respostas contadas e apagar leva as respostas junto", async () => {
  const ip = novoIp();
  const topico = await pedir("POST", "/forum", {
    ip,
    corpo: { nome: "Marcos", categoria: "duvidas", titulo: "Como afinar sem afinador?", texto: "Alguém tem uma dica de afinação?" },
  });
  assert.equal(topico.status, 202);
  assert.equal((await pedir("GET", `/forum/${topico.dados._id}`)).status, 404, "pendente não abre");
  assert.equal((await pedir("GET", "/forum")).dados.length, 0);

  await pedir("POST", `/moderacao/topicos/${topico.dados._id}/aprovar`, { token: admin });
  assert.equal((await pedir("GET", "/forum?categoria=duvidas")).dados.length, 1);
  assert.equal((await pedir("GET", "/forum?categoria=relatos")).dados.length, 0);
  assert.equal((await pedir("GET", "/forum?busca=afinar")).dados.length, 1);
  assert.equal((await pedir("GET", "/forum?busca=(")).status, 200, "busca com caractere especial não quebra");

  const resposta = await pedir("POST", "/comentarios", {
    token: contas.ana.token,
    corpo: { tipo: "topico", alvo: topico.dados._id, texto: "Use um diapasão." },
  });
  assert.equal((await pedir("GET", `/forum/${topico.dados._id}`)).dados.respostas, 1);
  await pedir("DELETE", `/comentarios/${resposta.dados._id}`, { token: admin });
  assert.equal((await pedir("GET", `/forum/${topico.dados._id}`)).dados.respostas, 0);

  await pedir("POST", "/comentarios", { token: contas.ana.token, corpo: { tipo: "topico", alvo: topico.dados._id, texto: "Outra dica." } });
  assert.equal((await pedir("DELETE", `/forum/${topico.dados._id}`, { token: contas.beto.token })).status, 200);
  assert.equal((await pedir("GET", `/comentarios?tipo=topico&alvo=${topico.dados._id}`)).dados.length, 0);
});

test("planos de aula: autor edita só os seus; administrador mexe em todos", async () => {
  const criado = await pedir("POST", "/planos", {
    token: contas.ana.token,
    corpo: {
      titulo: "Pulsação com chocalhos",
      resumo: "Uma aula sobre pulsação.",
      faixasEtarias: ["infantil", "infantil"],
      duracao: "2",
      objetivos: "Perceber a pulsação",
      projetos: [projeto._id, projeto._id],
      autor: "Ana Costa",
      nivel: "facil",
    },
  });
  assert.equal(criado.status, 201);
  assert.deepEqual(criado.dados.faixasEtarias, ["infantil"], "turmas sem repetição");
  assert.equal(criado.dados.projetos.length, 1, "projetos sem repetição");
  assert.equal(criado.dados.nivel, undefined, "plano não tem nível");
  assert.equal(criado.dados.publicadoPor, "Ana Costa");

  const pagina = await pedir("GET", `/planos/${criado.dados._id}`);
  assert.equal(pagina.dados.projetos[0].titulo, "Chocalho de garrafa", "traz os dados do projeto usado");

  const doBeto = await pedir("PUT", `/planos/${criado.dados._id}`, { token: contas.beto.token, corpo: { titulo: "Outro" } });
  assert.equal(doBeto.status, 403);
  const daAna = await pedir("PUT", `/planos/${criado.dados._id}`, { token: contas.ana.token, corpo: { titulo: "Pulsação e ritmo" } });
  assert.equal(daAna.dados.titulo, "Pulsação e ritmo");

  await pedir("POST", "/comentarios", { token: contas.beto.token, corpo: { tipo: "plano", alvo: criado.dados._id, texto: "Muito bom!" } });
  assert.equal((await pedir("DELETE", `/planos/${criado.dados._id}`, { token: contas.beto.token })).status, 403);
  assert.equal((await pedir("DELETE", `/planos/${criado.dados._id}`, { token: admin })).status, 200);
  assert.equal((await pedir("GET", `/comentarios?tipo=plano&alvo=${criado.dados._id}`)).dados.length, 0, "comentários vão junto");
});

test("visitante pode enviar 5 mensagens a cada 10 minutos (contadas no banco)", async () => {
  const ip = novoIp();
  const enviar = () =>
    pedir("POST", "/comentarios", { ip, corpo: { tipo: "projeto", alvo: projeto._id, nome: "Rafa", texto: "Olá de novo" } });
  for (let i = 0; i < 5; i++) assert.equal((await enviar()).status, 202);
  const bloqueado = await enviar();
  assert.equal(bloqueado.status, 429);

  const registros = await mongoose.connection.collection("limites").find().toArray();
  assert.ok(registros.length > 0, "a contagem fica no banco");
  assert.ok(registros.every((r) => !r.chave.includes(ip)), "o banco não guarda o IP");
});

test("login: 5 senhas erradas bloqueiam o aparelho, e a contagem fica no banco", async () => {
  const ip = novoIp();
  for (let i = 0; i < 5; i++) {
    assert.equal((await pedir("POST", "/auth/login", { ip, corpo: { email: "ana@escola.br", senha: "errada" } })).status, 401);
  }
  const bloqueado = await pedir("POST", "/auth/login", { ip, corpo: { senha: SENHA } });
  assert.equal(bloqueado.status, 429, "nem a senha certa entra");
  const deOutroIp = await pedir("POST", "/auth/login", { ip: novoIp(), corpo: { senha: SENHA } });
  assert.equal(deOutroIp.status, 200);
});

test("login: 10 senhas erradas na mesma conta, de IPs diferentes, bloqueiam a conta", async () => {
  await criarAutor("Carla Dias", "carla@escola.br");
  for (let i = 0; i < 10; i++) {
    const tentativa = await pedir("POST", "/auth/login", { ip: novoIp(), corpo: { email: "carla@escola.br", senha: "errada" } });
    assert.equal(tentativa.status, 401);
  }
  const bloqueado = await pedir("POST", "/auth/login", { ip: novoIp(), corpo: { email: "carla@escola.br", senha: "errada" } });
  assert.equal(bloqueado.status, 429);
});

test("backup leva tudo e a restauração recria o que foi apagado", async () => {
  const plano = await pedir("POST", "/planos", { token: admin, corpo: { titulo: "Plano do backup", objetivos: "Testar" } });
  await pedir("POST", "/comentarios", { token: admin, corpo: { tipo: "plano", alvo: plano.dados._id, texto: "Comentário do backup" } });

  const backup = (await pedir("GET", "/backup", { token: admin })).dados;
  assert.ok(backup.projetos.length >= 1 && backup.planos.length >= 1 && backup.comentarios.length >= 1);

  await pedir("DELETE", `/planos/${plano.dados._id}`, { token: admin });
  const restaurado = await pedir("POST", "/backup/restaurar", { token: admin, corpo: backup });
  assert.equal(restaurado.dados.outros.planos, 1);
  assert.ok(restaurado.dados.outros.comentarios >= 1);
  assert.equal((await pedir("GET", `/planos/${plano.dados._id}`)).dados.titulo, "Plano do backup");

  const deNovo = await pedir("POST", "/backup/restaurar", { token: admin, corpo: backup });
  assert.equal(deNovo.dados.restaurados + deNovo.dados.outros.planos, 0, "nunca duplica");
});

test("apagar um projeto apaga os comentários dele", async () => {
  const outro = (await pedir("POST", "/adicionar", { token: admin, corpo: { titulo: "Tambor de lata" } })).dados;
  await pedir("POST", "/comentarios", { token: admin, corpo: { tipo: "projeto", alvo: outro._id, texto: "Legal!" } });
  assert.equal((await pedir("DELETE", `/projetos/${outro._id}`, { token: admin })).status, 200);
  const restantes = await mongoose.connection.collection("comentarios").countDocuments({ alvoId: new mongoose.Types.ObjectId(outro._id) });
  assert.equal(restantes, 0);
});
