const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// Em produção o servidor fica atrás de um proxy; isso faz req.ip ser o IP real do visitante
app.set("trust proxy", 1);

// **Middleware**
app.use(cors());
app.use(express.json());

// **Autenticação do professor**
// A senha fica só no servidor (variável ADMIN_PASSWORD). Quem acerta a senha recebe um
// token assinado com TOKEN_SECRET, que precisa ser enviado no cabeçalho Authorization
// em toda rota que cria, edita ou apaga algo.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TOKEN_SECRET = process.env.TOKEN_SECRET;
const DURACAO_TOKEN_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const autenticacaoConfigurada = Boolean(ADMIN_PASSWORD && TOKEN_SECRET);

if (!autenticacaoConfigurada) {
  console.error("ADMIN_PASSWORD e TOKEN_SECRET não configurados: criar, editar e apagar projetos está desativado.");
}

const assinar = (dados) => crypto.createHmac("sha256", TOKEN_SECRET).update(dados).digest("base64url");

// Compara textos em tempo constante (evita descobrir a senha medindo o tempo de resposta)
const iguais = (a, b) => {
  const hashA = crypto.createHash("sha256").update(String(a)).digest();
  const hashB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

const criarToken = () => {
  const expiraEm = Date.now() + DURACAO_TOKEN_MS;
  const dados = Buffer.from(JSON.stringify({ exp: expiraEm })).toString("base64url");
  return { token: `${dados}.${assinar(dados)}`, expiraEm };
};

const tokenValido = (token) => {
  if (!autenticacaoConfigurada || typeof token !== "string") return false;
  const [dados, assinatura] = token.split(".");
  if (!dados || !assinatura || !iguais(assinatura, assinar(dados))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(dados, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
};

// Protege as rotas de escrita. Fica antes do multer, para que um envio sem
// permissão seja recusado antes de qualquer imagem subir para o Cloudinary.
const exigirAdmin = (req, res, next) => {
  if (!autenticacaoConfigurada) {
    return res.status(503).send("Autenticação não configurada no servidor");
  }
  const token = (req.get("Authorization") || "").replace(/^Bearer /, "");
  if (!tokenValido(token)) {
    return res.status(401).send("Acesso não autorizado");
  }
  next();
};

// Limite de tentativas de login por IP: 5 erros a cada 15 minutos
const LIMITE_TENTATIVAS = 5;
const JANELA_TENTATIVAS_MS = 15 * 60 * 1000;
const tentativasPorIp = new Map();

app.post("/auth/login", (req, res) => {
  if (!autenticacaoConfigurada) {
    return res.status(503).send("Autenticação não configurada no servidor");
  }

  const agora = Date.now();
  const registro = tentativasPorIp.get(req.ip);
  if (registro && registro.reiniciaEm > agora && registro.erros >= LIMITE_TENTATIVAS) {
    res.set("Retry-After", Math.ceil((registro.reiniciaEm - agora) / 1000));
    return res.status(429).send("Muitas tentativas. Tente novamente mais tarde.");
  }

  const senha = req.body?.senha;
  if (typeof senha === "string" && iguais(senha, ADMIN_PASSWORD)) {
    tentativasPorIp.delete(req.ip);
    return res.json(criarToken());
  }

  const atual = registro && registro.reiniciaEm > agora ? registro : { erros: 0, reiniciaEm: agora + JANELA_TENTATIVAS_MS };
  atual.erros += 1;
  tentativasPorIp.set(req.ip, atual);
  res.status(401).send("Senha incorreta");
});

// Limpa registros de tentativas vencidos, para o mapa não crescer para sempre
setInterval(() => {
  const agora = Date.now();
  tentativasPorIp.forEach((registro, ip) => registro.reiniciaEm <= agora && tentativasPorIp.delete(ip));
}, JANELA_TENTATIVAS_MS).unref();

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

// **Remoção de imagens do Cloudinary**
// Extrai o public_id de uma URL do Cloudinary, ex.:
// https://res.cloudinary.com/<cloud>/image/upload/v1712345/projetos/abc.jpg -> projetos/abc
const extrairPublicId = (url) => {
  if (typeof url !== "string") return null;
  const match = url.match(/\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(projetos\/[^.]+)\.\w+$/);
  return match ? match[1] : null;
};

// Lista todas as URLs de imagem de um projeto
const imagensDoProjeto = (projeto) =>
  [projeto.imagem, ...(projeto.imagensPassoAPasso || [])].filter(Boolean);

// Apaga as imagens no Cloudinary; falhas são registradas mas não interrompem a requisição
const apagarImagens = async (urls) => {
  const publicIds = [...new Set(urls.map(extrairPublicId).filter(Boolean))];
  await Promise.all(
    publicIds.map((publicId) =>
      cloudinary.uploader
        .destroy(publicId)
        .catch((error) => console.error(`Erro ao apagar imagem ${publicId}:`, error))
    )
  );
};

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
  tipoProjeto: { type: String, default: "instrumento" }, // "instrumento" ou "jogo"
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
app.post("/adicionar", exigirAdmin, upload.single("imagem"), async (req, res) => {
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
app.put("/projetos/:id", exigirAdmin, upload.single("imagem"), async (req, res) => {
  try {
    const projetoData = { ...req.body };

    // Se uma nova imagem for enviada, atualizar a URL da imagem principal
    if (req.file) {
      projetoData.imagem = req.file.path;  // URL da nova imagem
    }

    const projetoAnterior = await Projeto.findById(req.params.id);

    if (!projetoAnterior) {
      return res.status(404).send("Projeto não encontrado para editar");
    }

    const projetoAtualizado = await Projeto.findByIdAndUpdate(req.params.id, projetoData, { new: true });

    // Apagar do Cloudinary as imagens que deixaram de fazer parte do projeto
    const imagensAtuais = new Set(imagensDoProjeto(projetoAtualizado));
    await apagarImagens(imagensDoProjeto(projetoAnterior).filter((url) => !imagensAtuais.has(url)));

    res.status(200).json(projetoAtualizado);
  } catch (error) {
    console.error("Erro ao editar projeto:", error);
    res.status(500).send("Erro ao editar projeto");
  }
});

// Rota para excluir um projeto
app.delete("/projetos/:id", exigirAdmin, async (req, res) => {
  try {
    const projetoRemovido = await Projeto.findByIdAndDelete(req.params.id);

    if (!projetoRemovido) {
      return res.status(404).send("Projeto não encontrado para excluir");
    }

    await apagarImagens(imagensDoProjeto(projetoRemovido));

    res.status(200).send("Projeto excluído com sucesso");
  } catch (error) {
    console.error("Erro ao excluir projeto:", error);
    res.status(500).send("Erro ao excluir projeto");
  }
});

// Rota para upload de imagem principal
app.post("/upload", exigirAdmin, upload.single("imagem"), (req, res) => {
  try {
    const imagemUrl = req.file.path; // URL do Cloudinary
    res.status(200).json({ url: imagemUrl });
  } catch (error) {
    console.error("Erro ao fazer upload da imagem:", error);
    res.status(500).send("Erro ao fazer upload da imagem");
  }
});

// Rota para upload de imagens múltiplas (passo a passo)
app.post("/upload-multiplas", exigirAdmin, upload.array("imagensPassoAPasso", 4), async (req, res) => {
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

// Rota para remover imagens enviadas cujo projeto não chegou a ser salvo
app.post("/imagens/remover", exigirAdmin, async (req, res) => {
  try {
    const urls = Array.isArray(req.body.urls) ? req.body.urls.filter((url) => typeof url === "string") : [];

    // Nunca apagar imagens que estejam em uso por algum projeto
    const emUso = await Projeto.find(
      { $or: [{ imagem: { $in: urls } }, { imagensPassoAPasso: { $in: urls } }] },
      { imagem: 1, imagensPassoAPasso: 1 }
    );
    const urlsEmUso = new Set(emUso.flatMap(imagensDoProjeto));

    await apagarImagens(urls.filter((url) => !urlsEmUso.has(url)));
    res.status(200).send("Imagens removidas");
  } catch (error) {
    console.error("Erro ao remover imagens:", error);
    res.status(500).send("Erro ao remover imagens");
  }
});

// **Servidor**
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
