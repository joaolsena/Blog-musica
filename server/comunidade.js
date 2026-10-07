// **Comunidade: comentários e fórum**
// Qualquer pessoa participa só com o nome, sem cadastro. O que um visitante escreve fica
// "pendente" e só aparece no site depois que alguém com conta aprova (página Moderação).
// Professores logados publicam na hora, com o selo "Professor".
// O servidor não guarda e-mail nem IP de quem comenta.
const mongoose = require("mongoose");
const { criarLimite } = require("./limites");

const CATEGORIAS = ["duvidas", "ideias", "relatos", "materiais"];
const TIPOS_ALVO = ["projeto", "plano", "topico"];

const LIMITES = {
  nome: [2, 60],
  comentario: [2, 2000],
  tituloTopico: [5, 140],
  textoTopico: [10, 5000],
};

const Comentario = mongoose.model(
  "Comentario",
  new mongoose.Schema(
    {
      alvoTipo: { type: String, enum: TIPOS_ALVO }, // onde foi escrito
      alvoId: mongoose.Schema.Types.ObjectId,
      nome: String,
      texto: String,
      status: { type: String, enum: ["pendente", "aprovado"], default: "pendente" },
      professor: { type: Boolean, default: false }, // escrito por alguém logado
      criadoPor: mongoose.Schema.Types.ObjectId,
    },
    { timestamps: true }
  ).index({ alvoTipo: 1, alvoId: 1, status: 1, createdAt: 1 })
);

const Topico = mongoose.model(
  "Topico",
  new mongoose.Schema(
    {
      titulo: String,
      texto: String,
      categoria: { type: String, enum: CATEGORIAS },
      nome: String,
      status: { type: String, enum: ["pendente", "aprovado"], default: "pendente" },
      professor: { type: Boolean, default: false },
      criadoPor: mongoose.Schema.Types.ObjectId,
      respostas: { type: Number, default: 0 }, // respostas aprovadas
      ultimaAtividade: { type: Date, default: Date.now },
    },
    { timestamps: true }
  ).index({ status: 1, ultimaAtividade: -1 })
);

// Texto digitado: sem caracteres de controle, no máximo uma linha em branco seguida
const limparTexto = (valor) =>
  typeof valor === "string"
    ? valor
        .replace(/\r\n?/g, "\n")
        .replace(/[^\S\n]+\n/g, "\n")
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : "";

const conferirTamanho = (texto, [minimo, maximo], nome) => {
  if (texto.length < minimo) return `${nome} está muito curto.`;
  if (texto.length > maximo) return `${nome} pode ter até ${maximo} caracteres.`;
  return null;
};

// O que o site mostra de um comentário ou tópico (sem a conta de quem escreveu)
const comentarioPublico = (c) => ({
  _id: c._id,
  nome: c.nome,
  texto: c.texto,
  professor: c.professor,
  status: c.status,
  criadoEm: c.createdAt,
});

const topicoPublico = (t, { completo = true } = {}) => ({
  _id: t._id,
  titulo: t.titulo,
  texto: completo ? t.texto : t.texto.slice(0, 240),
  categoria: t.categoria,
  nome: t.nome,
  professor: t.professor,
  status: t.status,
  respostas: t.respostas,
  criadoEm: t.createdAt,
  ultimaAtividade: t.ultimaAtividade,
});

// Contra spam de visitantes: campo escondido que só robôs preenchem e no máximo 5 envios
// a cada 10 minutos por IP (contados no banco, veja limites.js; o IP não é guardado).
const limiteEnvios = criarLimite("envio-publico", { maximo: 5, janelaMs: 10 * 60 * 1000 });

// Devolve true se o envio pode seguir; senão, já respondeu
async function liberarEnvio(req, res) {
  if (req.usuario) return true;
  if (req.body?.site) {
    // Robô: finge que deu certo, mas não salva nada
    res.status(202).json({ status: "pendente" });
    return false;
  }
  if ((await limiteEnvios.contar(req.ip)) > limiteEnvios.maximo) {
    res.set("Retry-After", await limiteEnvios.espera(req.ip));
    res.status(429).send("Você enviou muitas mensagens seguidas. Espere alguns minutos e tente de novo.");
    return false;
  }
  return true;
}

const ID_VALIDO = /^[0-9a-f]{24}$/i;
const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Apaga os comentários de um projeto, plano ou tópico (quando ele é apagado)
const apagarComentariosDe = (alvoTipo, alvoId) => Comentario.deleteMany({ alvoTipo, alvoId });

function registrarComunidade(api, { exigirLogin, identificar, modelos }) {
  // Onde se pode comentar: projeto, plano de aula ou tópico aprovado do fórum
  const alvoExiste = async (tipo, id) => {
    if (!TIPOS_ALVO.includes(tipo) || !ID_VALIDO.test(String(id))) return false;
    if (tipo === "topico") return Boolean(await Topico.exists({ _id: id, status: "aprovado" }));
    return Boolean(await modelos[tipo].exists({ _id: id }));
  };

  // Uma resposta aprovada no fórum sobe o tópico na lista
  const contarResposta = (comentario, mudanca) =>
    comentario.alvoTipo === "topico"
      ? Topico.updateOne(
          { _id: comentario.alvoId },
          mudanca > 0 ? { $inc: { respostas: 1 }, ultimaAtividade: new Date() } : { $inc: { respostas: -1 } }
        )
      : null;

  // **Comentários**
  api.get("/comentarios", async (req, res) => {
    const { tipo, alvo } = req.query;
    if (!TIPOS_ALVO.includes(tipo) || !ID_VALIDO.test(String(alvo))) {
      return res.status(400).send("Informe onde estão os comentários.");
    }
    try {
      const comentarios = await Comentario.find({ alvoTipo: tipo, alvoId: alvo, status: "aprovado" })
        .sort({ createdAt: 1 })
        .limit(500)
        .lean();
      res.json(comentarios.map(comentarioPublico));
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
      res.status(500).send("Erro ao buscar comentários");
    }
  });

  api.post("/comentarios", identificar, async (req, res) => {
    const { tipo, alvo } = req.body || {};
    const nome = req.usuario ? req.usuario.nome : limparTexto(req.body?.nome).replace(/\s+/g, " ");
    const texto = limparTexto(req.body?.texto);
    const erro =
      (!req.usuario && conferirTamanho(nome, LIMITES.nome, "O nome")) || conferirTamanho(texto, LIMITES.comentario, "O comentário");
    if (erro) return res.status(400).send(erro);
    if (!(await liberarEnvio(req, res))) return;
    try {
      if (!(await alvoExiste(tipo, alvo))) return res.status(404).send("Não encontramos onde publicar este comentário.");
      const comentario = await Comentario.create({
        alvoTipo: tipo,
        alvoId: alvo,
        nome,
        texto,
        status: req.usuario ? "aprovado" : "pendente",
        professor: Boolean(req.usuario),
        criadoPor: req.usuario?.id || undefined,
      });
      if (comentario.status === "aprovado") await contarResposta(comentario, +1);
      res.status(comentario.status === "aprovado" ? 201 : 202).json(comentarioPublico(comentario));
    } catch (error) {
      console.error("Erro ao salvar comentário:", error);
      res.status(500).send("Erro ao enviar o comentário");
    }
  });

  api.delete("/comentarios/:mid", exigirLogin, async (req, res) => {
    if (!ID_VALIDO.test(req.params.mid)) return res.status(404).send("Comentário não encontrado");
    try {
      const comentario = await Comentario.findByIdAndDelete(req.params.mid).lean();
      if (!comentario) return res.status(404).send("Comentário não encontrado");
      if (comentario.status === "aprovado") await contarResposta(comentario, -1);
      res.send("Comentário apagado");
    } catch (error) {
      console.error("Erro ao apagar comentário:", error);
      res.status(500).send("Erro ao apagar o comentário");
    }
  });

  // **Fórum**
  api.get("/forum", async (req, res) => {
    const filtro = { status: "aprovado" };
    if (CATEGORIAS.includes(req.query.categoria)) filtro.categoria = req.query.categoria;
    const busca = typeof req.query.busca === "string" ? req.query.busca.trim().slice(0, 80) : "";
    if (busca) {
      const termo = new RegExp(escaparRegex(busca), "i");
      filtro.$or = [{ titulo: termo }, { texto: termo }];
    }
    try {
      const topicos = await Topico.find(filtro).sort({ ultimaAtividade: -1 }).limit(200).lean();
      res.json(topicos.map((t) => topicoPublico(t, { completo: false })));
    } catch (error) {
      console.error("Erro ao buscar tópicos:", error);
      res.status(500).send("Erro ao buscar o fórum");
    }
  });

  api.get("/forum/:id", async (req, res) => {
    try {
      const topico = await Topico.findOne({ _id: req.params.id, status: "aprovado" }).lean();
      if (!topico) return res.status(404).send("Tópico não encontrado");
      res.json(topicoPublico(topico));
    } catch (error) {
      console.error("Erro ao buscar tópico:", error);
      res.status(500).send("Erro ao buscar o tópico");
    }
  });

  api.post("/forum", identificar, async (req, res) => {
    const nome = req.usuario ? req.usuario.nome : limparTexto(req.body?.nome).replace(/\s+/g, " ");
    const titulo = limparTexto(req.body?.titulo).replace(/\s+/g, " ");
    const texto = limparTexto(req.body?.texto);
    const categoria = req.body?.categoria;
    const erro =
      (!req.usuario && conferirTamanho(nome, LIMITES.nome, "O nome")) ||
      conferirTamanho(titulo, LIMITES.tituloTopico, "O título") ||
      conferirTamanho(texto, LIMITES.textoTopico, "O texto") ||
      (!CATEGORIAS.includes(categoria) && "Escolha uma categoria.");
    if (erro) return res.status(400).send(erro);
    if (!(await liberarEnvio(req, res))) return;
    try {
      const topico = await Topico.create({
        titulo,
        texto,
        categoria,
        nome,
        status: req.usuario ? "aprovado" : "pendente",
        professor: Boolean(req.usuario),
        criadoPor: req.usuario?.id || undefined,
      });
      res.status(topico.status === "aprovado" ? 201 : 202).json(topicoPublico(topico));
    } catch (error) {
      console.error("Erro ao criar tópico:", error);
      res.status(500).send("Erro ao publicar o tópico");
    }
  });

  api.delete("/forum/:id", exigirLogin, async (req, res) => {
    try {
      const topico = await Topico.findByIdAndDelete(req.params.id).lean();
      if (!topico) return res.status(404).send("Tópico não encontrado");
      await apagarComentariosDe("topico", topico._id);
      res.send("Tópico apagado");
    } catch (error) {
      console.error("Erro ao apagar tópico:", error);
      res.status(500).send("Erro ao apagar o tópico");
    }
  });

  // **Moderação** (qualquer conta): aprovar ou recusar o que os visitantes enviaram
  api.get("/moderacao/contagem", exigirLogin, async (req, res) => {
    try {
      const [comentarios, topicos] = await Promise.all([
        Comentario.countDocuments({ status: "pendente" }),
        Topico.countDocuments({ status: "pendente" }),
      ]);
      res.json({ total: comentarios + topicos });
    } catch (error) {
      console.error("Erro ao contar pendentes:", error);
      res.status(500).send("Erro ao contar mensagens pendentes");
    }
  });

  api.get("/moderacao", exigirLogin, async (req, res) => {
    try {
      const [comentarios, topicos] = await Promise.all([
        Comentario.find({ status: "pendente" }).sort({ createdAt: 1 }).limit(300).lean(),
        Topico.find({ status: "pendente" }).sort({ createdAt: 1 }).limit(300).lean(),
      ]);

      // Título de onde cada comentário foi escrito, para quem modera saber o contexto
      const titulos = new Map();
      await Promise.all(
        TIPOS_ALVO.map(async (tipo) => {
          const ids = comentarios.filter((c) => c.alvoTipo === tipo).map((c) => c.alvoId);
          if (ids.length === 0) return;
          const Modelo = tipo === "topico" ? Topico : modelos[tipo];
          const docs = await Modelo.find({ _id: { $in: ids } }, { titulo: 1 }).lean();
          docs.forEach((d) => titulos.set(`${tipo}:${d._id}`, d.titulo));
        })
      );

      res.json({
        comentarios: comentarios.map((c) => ({
          ...comentarioPublico(c),
          alvo: { tipo: c.alvoTipo, id: c.alvoId, titulo: titulos.get(`${c.alvoTipo}:${c.alvoId}`) || null },
        })),
        topicos: topicos.map((t) => topicoPublico(t)),
      });
    } catch (error) {
      console.error("Erro ao listar pendentes:", error);
      res.status(500).send("Erro ao carregar a moderação");
    }
  });

  api.post("/moderacao/comentarios/:mid/aprovar", exigirLogin, async (req, res) => {
    if (!ID_VALIDO.test(req.params.mid)) return res.status(404).send("Comentário não encontrado");
    try {
      const comentario = await Comentario.findOneAndUpdate(
        { _id: req.params.mid, status: "pendente" },
        { status: "aprovado" },
        { new: true }
      ).lean();
      if (!comentario) return res.status(404).send("Comentário não encontrado ou já aprovado");
      await contarResposta(comentario, +1);
      res.json(comentarioPublico(comentario));
    } catch (error) {
      console.error("Erro ao aprovar comentário:", error);
      res.status(500).send("Erro ao aprovar o comentário");
    }
  });

  api.post("/moderacao/topicos/:mid/aprovar", exigirLogin, async (req, res) => {
    if (!ID_VALIDO.test(req.params.mid)) return res.status(404).send("Tópico não encontrado");
    try {
      const topico = await Topico.findOneAndUpdate(
        { _id: req.params.mid, status: "pendente" },
        { status: "aprovado", ultimaAtividade: new Date() },
        { new: true }
      ).lean();
      if (!topico) return res.status(404).send("Tópico não encontrado ou já aprovado");
      res.json(topicoPublico(topico));
    } catch (error) {
      console.error("Erro ao aprovar tópico:", error);
      res.status(500).send("Erro ao aprovar o tópico");
    }
  });
}

module.exports = { Comentario, Topico, CATEGORIAS, registrarComunidade, apagarComentariosDe };
