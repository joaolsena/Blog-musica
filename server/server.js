const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// Em produção o servidor fica atrás de um proxy; isso faz req.ip ser o IP real do visitante
app.set("trust proxy", 1);

// **Middleware**
// CORS_ORIGIN (opcional): endereços do site separados por vírgula, ex.:
// https://ensinemusica.netlify.app. Sem ela, qualquer origem é aceita — o que é
// seguro aqui, porque as rotas de escrita exigem o token no cabeçalho.
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) } : undefined));
app.use(express.json());

// Todas as rotas da API ficam em /api, separadas das páginas do site
const api = express.Router();

// Um :id que não é um ID válido do MongoDB não pode existir: responde 404 direto
// (sem isso, o MongoDB lançaria um erro e a resposta seria um 500 genérico)
api.param("id", (req, res, next, id) => {
  if (/^[0-9a-f]{24}$/i.test(id)) return next();
  res.status(404).send("Projeto não encontrado");
});

// Data de hoje no fuso do Amapá. O servidor costuma rodar em UTC, e sem o fuso
// um projeto cadastrado depois das 21h sairia com a data do dia seguinte.
const dataDeHoje = () => new Date().toLocaleDateString("pt-BR", { timeZone: "America/Belem" });

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

api.post("/auth/login", (req, res) => {
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

// **Recebimento de imagens**
// O multer guarda o arquivo na memória; depois ele é enviado ao Cloudinary (ver subirParaCloudinary).
const TAMANHO_MAXIMO_IMAGEM = 10 * 1024 * 1024; // 10 MB, o limite do plano gratuito do Cloudinary
const FORMATOS_ACEITOS = ["image/jpeg", "image/png"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_IMAGEM, files: 5 },
  fileFilter: (req, arquivo, cb) => {
    if (FORMATOS_ACEITOS.includes(arquivo.mimetype)) return cb(null, true);
    const erro = new Error("Formato de imagem não aceito. Use JPG ou PNG.");
    erro.status = 415;
    cb(erro);
  },
});

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

// Envia uma imagem ao Cloudinary já reduzida: no máximo 2000px no maior lado e
// qualidade automática. Fotos de celular de vários MB ficam com algumas centenas de KB.
const enviarParaCloudinary = (arquivo) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "projetos",
          allowed_formats: ["jpg", "jpeg", "png"],
          transformation: [{ width: 2000, height: 2000, crop: "limit", quality: "auto:good" }],
        },
        (erro, resultado) => (erro ? reject(erro) : resolve(resultado.secure_url))
      )
      .end(arquivo.buffer);
  });

// Depois do multer: sobe os arquivos recebidos e coloca a URL em arquivo.path.
// Se algum envio falhar, apaga os que já subiram, para não deixar imagens soltas.
const subirParaCloudinary = async (req, res, next) => {
  const arquivos = [req.file, ...(req.files || [])].filter(Boolean);
  const enviados = [];
  try {
    await Promise.all(
      arquivos.map(async (arquivo) => {
        arquivo.path = await enviarParaCloudinary(arquivo);
        enviados.push(arquivo.path);
      })
    );
    next();
  } catch (erro) {
    await apagarImagens(enviados);
    next(erro);
  }
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
api.get("/projetos", async (req, res) => {
  try {
    const projetos = await Projeto.find();
    res.json(projetos);
  } catch (error) {
    console.error("Erro ao buscar projetos:", error);
    res.status(500).send("Erro ao buscar projetos");
  }
});

// Rota para obter um projeto pelo ID
api.get("/projetos/:id", async (req, res) => {
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
api.post("/adicionar", exigirAdmin, upload.single("imagem"), subirParaCloudinary, async (req, res) => {
  try {
    // Criar o objeto de projeto a partir do corpo da requisição
    const projetoData = { ...req.body, data: req.body.data || dataDeHoje() };

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
api.put("/projetos/:id", exigirAdmin, upload.single("imagem"), subirParaCloudinary, async (req, res) => {
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
api.delete("/projetos/:id", exigirAdmin, async (req, res) => {
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
api.post("/upload", exigirAdmin, upload.single("imagem"), subirParaCloudinary, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("Nenhuma imagem foi enviada.");
    }
    const imagemUrl = req.file.path; // URL do Cloudinary
    res.status(200).json({ url: imagemUrl });
  } catch (error) {
    console.error("Erro ao fazer upload da imagem:", error);
    res.status(500).send("Erro ao fazer upload da imagem");
  }
});

// Rota para upload de imagens múltiplas (passo a passo)
api.post("/upload-multiplas", exigirAdmin, upload.array("imagensPassoAPasso", 4), subirParaCloudinary, async (req, res) => {
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
api.post("/imagens/remover", exigirAdmin, async (req, res) => {
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

app.use("/api", api);

// Erros de envio de imagem viram respostas claras em vez de um erro 500 genérico.
// O Express só reconhece um tratador de erros com 4 parâmetros, por isso o "next" fica mesmo sem uso.
app.use((erro, req, res, next) => {
  if (erro instanceof multer.MulterError) {
    const mensagens = {
      LIMIT_FILE_SIZE: "Imagem muito grande. O limite é 10 MB por imagem.",
      LIMIT_FILE_COUNT: "Imagens demais. Envie no máximo 4 imagens do passo a passo.",
      LIMIT_UNEXPECTED_FILE: "Imagens demais. Envie no máximo 4 imagens do passo a passo.",
    };
    const status = erro.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).send(mensagens[erro.code] || "Envio de imagem inválido.");
  }
  if (erro.status === 415) {
    return res.status(415).send(erro.message);
  }
  console.error("Erro inesperado:", erro);
  res.status(500).send("Erro interno no servidor");
});

// **Servidor**
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
