const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

const app = express();

// **Middleware**
app.use(cors());
app.use(express.json());

// **Conexão com o MongoDB**
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  })
  .then(() => console.log("Conectado ao MongoDB"))
  .catch((error) => console.error("Erro ao conectar ao MongoDB:", error));

// **Configuração do Cloudinary**
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// **Configuração do Multer com Cloudinary**
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "projetos", // pasta para as imagens
    allowed_formats: ["jpg", "jpeg", "png"], // formatos permitidos
  },
});

const upload = multer({ storage });

// **Modelo do MongoDB**
const Projeto = mongoose.model("Projeto", {
  titulo: String,
  descricaoGeral: String,
  materiais: String,
  passoAPasso: String,
  comoTocar: String,
  comoJogar: String,
  sugestoesAtividades: String,
  habilidadesMusicais: String,
  autor: String,
  imagem: String, // URL da imagem principal
  imagensPassoAPasso: [String], // URLs das imagens do passo a passo
  referencias: String,
  data: String,
});

// **Rotas**
// Rota para obter todos os projetos
app.get("/projetos", async (req, res) => {
  try {
    const projetos = await Projeto.find();
    res.json(projetos);
  } catch (error) {
    console.error("Erro ao buscar projetos:", error);
    res.status(500).send("Erro ao buscar projetos");
  }
});

// Rota para obter um projeto pelo ID
app.get("/projetos/:id", async (req, res) => {
  try {
    const projeto = await Projeto.findById(req.params.id);
    if (!projeto) {
      return res.status(404).send("Projeto não encontrado");
    }
    res.json(projeto);
  } catch (error) {
    console.error("Erro ao buscar projeto:", error);
    res.status(500).send("Erro ao buscar projeto");
  }
});

// Rota para adicionar um novo projeto
app.post("/adicionar", upload.single("imagem"), async (req, res) => {
  try {
    // Criar o objeto de projeto a partir do corpo da requisição
    const projetoData = { ...req.body, data: req.body.data || new Date().toLocaleDateString("pt-BR") };

    // Verificar se a imagem foi enviada
    if (req.file) {
      projetoData.imagem = req.file.path;  // URL da imagem do Cloudinary
    }

    // Criar e salvar o novo projeto
    const novoProjeto = new Projeto(projetoData);
    await novoProjeto.save();

    res.status(201).json(novoProjeto);
  } catch (error) {
    console.error("Erro ao adicionar projeto:", error);
    res.status(500).send("Erro ao adicionar projeto");
  }
});

// Rota para editar um projeto existente
app.put("/projetos/:id", upload.single("imagem"), async (req, res) => {
  try {
    const projetoData = { ...req.body };

    // Se uma nova imagem for enviada, atualizar a URL da imagem principal
    if (req.file) {
      projetoData.imagem = req.file.path;  // URL da nova imagem
    }

    const projetoAtualizado = await Projeto.findByIdAndUpdate(req.params.id, projetoData, { new: true });

    if (!projetoAtualizado) {
      return res.status(404).send("Projeto não encontrado para editar");
    }

    res.status(200).json(projetoAtualizado);
  } catch (error) {
    console.error("Erro ao editar projeto:", error);
    res.status(500).send("Erro ao editar projeto");
  }
});

// Rota para excluir um projeto
app.delete("/projetos/:id", async (req, res) => {
  try {
    const projetoRemovido = await Projeto.findByIdAndDelete(req.params.id);

    if (!projetoRemovido) {
      return res.status(404).send("Projeto não encontrado para excluir");
    }

    res.status(200).send("Projeto excluído com sucesso");
  } catch (error) {
    console.error("Erro ao excluir projeto:", error);
    res.status(500).send("Erro ao excluir projeto");
  }
});

// Rota para upload de imagem principal
app.post("/upload", upload.single("imagem"), (req, res) => {
  try {
    const imagemUrl = req.file.path; // URL do Cloudinary
    res.status(200).json({ url: imagemUrl });
  } catch (error) {
    console.error("Erro ao fazer upload da imagem:", error);
    res.status(500).send("Erro ao fazer upload da imagem");
  }
});

// Rota para upload de imagens múltiplas (passo a passo)
app.post("/upload-multiplas", upload.array("imagensPassoAPasso", 4), async (req, res) => {
  try {
    // Verifique se os arquivos foram enviados
    const imagens = req.files ? req.files.map((file) => file.path) : [];

    if (imagens.length === 0) {
      return res.status(400).send("Nenhuma imagem foi enviada.");
    }

    const projetoId = req.body.projetoId;
    if (projetoId) {
      const projeto = await Projeto.findById(projetoId);
      if (!projeto) {
        return res.status(404).send("Projeto não encontrado.");
      }

      projeto.imagensPassoAPasso.push(...imagens);
      await projeto.save();
      res.status(200).json({ urls: imagens, mensagem: "Imagens salvas no projeto com sucesso" });
    } else {
      // Se não houver `projetoId`, enviar as URLs como resposta
      res.status(200).json({ urls: imagens });
    }
  } catch (error) {
    console.error("Erro ao fazer upload das imagens:", error);
    res.status(500).send("Erro ao fazer upload das imagens.");
  }
});

// **Servidor**
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
