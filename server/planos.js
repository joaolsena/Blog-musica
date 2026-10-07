// **Planos de aula**
// Escritos pelos professores com conta (administradores e autores); o público lê e comenta.
// Objetivos, materiais e desenvolvimento são listas com um item por linha.
const mongoose = require("mongoose");

const LIMITE_TITULO = 140;
const LIMITE_TEXTO = 8000;
const LIMITE_PROJETOS = 10;
const CAMPOS_TEXTO = ["resumo", "objetivos", "materiais", "desenvolvimento", "avaliacao", "dicas", "autor"];

const Plano = mongoose.model(
  "Plano",
  new mongoose.Schema(
    {
      titulo: String,
      resumo: String,
      faixasEtarias: [String], // mesmas faixas dos projetos
      duracao: String, // "1", "2" ou "3+" aulas
      objetivos: String,
      materiais: String,
      desenvolvimento: String, // etapas da aula
      avaliacao: String,
      dicas: String,
      projetos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Projeto" }], // projetos usados na aula
      autor: String,
      criadoPor: mongoose.Schema.Types.ObjectId, // conta que publicou (vazio: conta principal)
      publicadoPor: String,
      data: String,
    },
    { timestamps: true }
  )
);

// Campos dos projetos relacionados que aparecem no plano (lista e página)
const CAMPOS_PROJETO_LISTA = "titulo imagem tipoProjeto";
const CAMPOS_PROJETO_PAGINA = "titulo imagem tipoProjeto descricaoGeral autor data faixasEtarias nivel duracao";

// Confere e limpa os campos do plano antes de salvar
const validarPlano = (req, res, next) => {
  const corpo = req.body;
  corpo.titulo = typeof corpo.titulo === "string" ? corpo.titulo.trim() : "";
  if (corpo.titulo.length < 3) return res.status(400).send("Informe o título do plano.");
  if (corpo.titulo.length > LIMITE_TITULO) {
    return res.status(400).send(`O título pode ter até ${LIMITE_TITULO} caracteres.`);
  }
  for (const campo of CAMPOS_TEXTO) {
    if (corpo[campo] === undefined || corpo[campo] === null) continue;
    if (typeof corpo[campo] !== "string") return res.status(400).send("Campo de texto inválido.");
    if (corpo[campo].length > LIMITE_TEXTO) {
      return res.status(400).send(`Cada campo pode ter até ${LIMITE_TEXTO} caracteres.`);
    }
  }
  if (corpo.projetos !== undefined) {
    if (!Array.isArray(corpo.projetos) || !corpo.projetos.every((id) => /^[0-9a-f]{24}$/i.test(String(id)))) {
      return res.status(400).send("Lista de projetos relacionados inválida.");
    }
    corpo.projetos = [...new Set(corpo.projetos.map(String))];
    if (corpo.projetos.length > LIMITE_PROJETOS) {
      return res.status(400).send(`Relacione no máximo ${LIMITE_PROJETOS} projetos.`);
    }
  }
  delete corpo.nivel; // planos não têm nível
  next();
};

function registrarPlanos(api, { exigirLogin, limparCamposDoServidor, validarFicha, podeMexer, dataDeHoje, aoApagar }) {
  api.get("/planos", async (req, res) => {
    try {
      const planos = await Plano.find().sort({ createdAt: -1 }).populate("projetos", CAMPOS_PROJETO_LISTA).lean();
      res.json(planos);
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
      res.status(500).send("Erro ao buscar planos de aula");
    }
  });

  api.get("/planos/:id", async (req, res) => {
    try {
      const plano = await Plano.findById(req.params.id).populate("projetos", CAMPOS_PROJETO_PAGINA).lean();
      if (!plano) return res.status(404).send("Plano de aula não encontrado");
      res.json(plano);
    } catch (error) {
      console.error("Erro ao buscar plano:", error);
      res.status(500).send("Erro ao buscar plano de aula");
    }
  });

  api.post("/planos", exigirLogin, limparCamposDoServidor, validarFicha, validarPlano, async (req, res) => {
    try {
      const plano = await Plano.create({
        ...req.body,
        data: dataDeHoje(),
        criadoPor: req.usuario.id,
        publicadoPor: req.usuario.nome,
      });
      res.status(201).json(plano);
    } catch (error) {
      console.error("Erro ao criar plano:", error);
      res.status(500).send("Erro ao publicar o plano de aula");
    }
  });

  api.put("/planos/:id", exigirLogin, limparCamposDoServidor, validarFicha, validarPlano, async (req, res) => {
    try {
      const plano = await Plano.findById(req.params.id);
      if (!plano) return res.status(404).send("Plano de aula não encontrado");
      if (!podeMexer(req.usuario, plano)) {
        return res.status(403).send("Você só pode editar os planos que você publicou.");
      }
      delete req.body.data;
      const atualizado = await Plano.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(atualizado);
    } catch (error) {
      console.error("Erro ao editar plano:", error);
      res.status(500).send("Erro ao editar o plano de aula");
    }
  });

  api.delete("/planos/:id", exigirLogin, async (req, res) => {
    try {
      const plano = await Plano.findById(req.params.id);
      if (!plano) return res.status(404).send("Plano de aula não encontrado");
      if (!podeMexer(req.usuario, plano)) {
        return res.status(403).send("Você só pode apagar os planos que você publicou.");
      }
      await Plano.findByIdAndDelete(req.params.id);
      await aoApagar(req.params.id);
      res.send("Plano de aula excluído");
    } catch (error) {
      console.error("Erro ao apagar plano:", error);
      res.status(500).send("Erro ao apagar o plano de aula");
    }
  });
}

module.exports = { Plano, registrarPlanos };
