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
// (nos testes automáticos MONGO_URI fica vazia e o servidor não se conecta ao banco)
const mongoURI = process.env.MONGO_URI;
const ESPERA_RECONEXAO_MS = 5000;

// Se a primeira conexão falhar (rede instável, banco demorando a responder), o
// Mongoose não tenta de novo sozinho: sem isto, o servidor ficaria no ar sem banco
// até alguém reiniciá-lo. Depois de conectado, o próprio Mongoose cuida das reconexões.
const conectarAoBanco = () =>
  mongoose
    .connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    })
    .then(() => console.log("Conectado ao MongoDB"))
    .catch((error) => {
      console.error(`Erro ao conectar ao MongoDB (nova tentativa em ${ESPERA_RECONEXAO_MS / 1000}s):`, error.message);
      setTimeout(conectarAoBanco, ESPERA_RECONEXAO_MS);
    });

if (mongoURI) {
  conectarAoBanco();
} else {
  console.error("MONGO_URI não configurada: o servidor não vai se conectar ao banco.");
}

// **Configuração do Cloudinary**
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// **Limites de mídia por projeto**
// Também conferidos no site (src/componentes/envioImagens.js); os dois devem bater.
const LIMITE_IMAGENS_PASSO = 20;
const LIMITE_VIDEOS = 5;

// **Recebimento de imagens**
// Cada imagem vem numa requisição própria (uma por vez), o que mantém baixo o uso
// de memória do servidor. O multer guarda o arquivo na memória; depois ele é
// enviado ao Cloudinary (ver subirParaCloudinary).
const TAMANHO_MAXIMO_IMAGEM = 10 * 1024 * 1024; // 10 MB, o limite do plano gratuito do Cloudinary
const FORMATOS_ACEITOS = ["image/jpeg", "image/png"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_IMAGEM, files: 1 },
  fileFilter: (req, arquivo, cb) => {
    if (FORMATOS_ACEITOS.includes(arquivo.mimetype)) return cb(null, true);
    const erro = new Error("Formato de imagem não aceito. Use JPG ou PNG.");
    erro.status = 415;
    cb(erro);
  },
});

// **Remoção de mídias do Cloudinary**
// Extrai o tipo e o public_id de uma URL do Cloudinary, ex.:
// .../image/upload/v1712345/projetos/abc.jpg -> { tipo: "image", publicId: "projetos/abc" }
// .../video/upload/v1712345/videos/xyz.mp4   -> { tipo: "video", publicId: "videos/xyz" }
// URLs de outros lugares (ex.: YouTube) devolvem null e nunca são apagadas.
const extrairMidia = (url) => {
  if (typeof url !== "string") return null;
  const match = url.match(/\/(image|video)\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?((?:projetos|videos)\/[^.]+)\.\w+$/);
  return match ? { tipo: match[1], publicId: match[2] } : null;
};

// Lista todas as URLs de mídia de um projeto (imagens e vídeos)
const midiasDoProjeto = (projeto) =>
  [projeto.imagem, ...(projeto.imagensPassoAPasso || []), ...(projeto.videos || [])].filter(Boolean);

// Apaga as mídias no Cloudinary; falhas são registradas mas não interrompem a requisição
const apagarMidias = async (urls) => {
  const midias = new Map();
  urls.map(extrairMidia).filter(Boolean).forEach((midia) => midias.set(midia.publicId, midia));
  await Promise.all(
    [...midias.values()].map(({ tipo, publicId }) =>
      cloudinary.uploader
        .destroy(publicId, { resource_type: tipo })
        .catch((error) => console.error(`Erro ao apagar ${tipo} ${publicId}:`, error))
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

// Depois do multer: sobe o arquivo recebido e coloca a URL em arquivo.path
const subirParaCloudinary = async (req, res, next) => {
  try {
    if (req.file) req.file.path = await enviarParaCloudinary(req.file);
    next();
  } catch (erro) {
    next(erro);
  }
};

// **Vídeos**
// Vídeos são grandes demais para passar pelo servidor: o navegador envia direto ao
// Cloudinary, com uma assinatura gerada aqui. A assinatura só vale para a pasta
// "videos" e para formatos de vídeo, e só professores logados conseguem uma.
const FORMATOS_VIDEO = "mp4,mov,m4v,webm,3gp";

// Vídeos aceitos ao salvar um projeto: links do YouTube (no formato que o site gera)
// ou vídeos enviados ao Cloudinary desta conta. Qualquer outro endereço é recusado,
// para ninguém conseguir embutir um site qualquer na página do projeto.
const videoPermitido = (url) =>
  typeof url === "string" &&
  (/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(url) ||
    (url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/`) &&
      extrairMidia(url)?.publicId.startsWith("videos/")));

// Confere as listas de mídia antes de salvar um projeto
const validarMidias = (req, res, next) => {
  const { imagensPassoAPasso = [], videos = [] } = req.body;
  if (!Array.isArray(imagensPassoAPasso) || !Array.isArray(videos)) {
    return res.status(400).send("Lista de imagens ou vídeos inválida.");
  }
  if (imagensPassoAPasso.length > LIMITE_IMAGENS_PASSO) {
    return res.status(400).send(`Imagens demais. O passo a passo aceita até ${LIMITE_IMAGENS_PASSO} imagens.`);
  }
  if (videos.length > LIMITE_VIDEOS) {
    return res.status(400).send(`Vídeos demais. Cada projeto aceita até ${LIMITE_VIDEOS} vídeos.`);
  }
  if (!videos.every(videoPermitido)) {
    return res.status(400).send("Vídeo inválido. Use um link do YouTube ou envie o arquivo do vídeo.");
  }
  next();
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
  videos: [String], // links do YouTube ou URLs de vídeos no Cloudinary
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

// Rota para adicionar um novo projeto (as mídias já chegam como URLs)
api.post("/adicionar", exigirAdmin, validarMidias, async (req, res) => {
  try {
    const novoProjeto = new Projeto({ ...req.body, data: req.body.data || dataDeHoje() });
    await novoProjeto.save();
    res.status(201).json(novoProjeto);
  } catch (error) {
    console.error("Erro ao adicionar projeto:", error);
    res.status(500).send("Erro ao adicionar projeto");
  }
});

// Rota para editar um projeto existente
api.put("/projetos/:id", exigirAdmin, validarMidias, async (req, res) => {
  try {
    const projetoAnterior = await Projeto.findById(req.params.id);

    if (!projetoAnterior) {
      return res.status(404).send("Projeto não encontrado para editar");
    }

    const projetoAtualizado = await Projeto.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Apagar do Cloudinary as imagens e vídeos que deixaram de fazer parte do projeto
    const midiasAtuais = new Set(midiasDoProjeto(projetoAtualizado));
    await apagarMidias(midiasDoProjeto(projetoAnterior).filter((url) => !midiasAtuais.has(url)));

    res.status(200).json(projetoAtualizado);
  } catch (error) {
    console.error("Erro ao editar projeto:", error);
    res.status(500).send("Erro ao editar projeto");
  }
});

// Rota para excluir um projeto (e todas as suas imagens e vídeos)
api.delete("/projetos/:id", exigirAdmin, async (req, res) => {
  try {
    const projetoRemovido = await Projeto.findByIdAndDelete(req.params.id);

    if (!projetoRemovido) {
      return res.status(404).send("Projeto não encontrado para excluir");
    }

    await apagarMidias(midiasDoProjeto(projetoRemovido));

    res.status(200).send("Projeto excluído com sucesso");
  } catch (error) {
    console.error("Erro ao excluir projeto:", error);
    res.status(500).send("Erro ao excluir projeto");
  }
});

// Rota para enviar uma imagem (principal ou do passo a passo), uma por requisição
api.post("/upload", exigirAdmin, upload.single("imagem"), subirParaCloudinary, (req, res) => {
  if (!req.file) {
    return res.status(400).send("Nenhuma imagem foi enviada.");
  }
  res.status(200).json({ url: req.file.path }); // URL do Cloudinary
});

// Rota que autoriza o navegador a enviar um vídeo direto ao Cloudinary
api.post("/videos/assinatura", exigirAdmin, (req, res) => {
  const parametros = {
    timestamp: Math.round(Date.now() / 1000),
    folder: "videos",
    allowed_formats: FORMATOS_VIDEO,
  };
  const assinatura = cloudinary.utils.api_sign_request(parametros, process.env.CLOUDINARY_API_SECRET);
  res.json({
    ...parametros,
    signature: assinatura,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

// Rota para remover mídias enviadas cujo projeto não chegou a ser salvo
api.post("/midias/remover", exigirAdmin, async (req, res) => {
  try {
    const urls = Array.isArray(req.body.urls) ? req.body.urls.filter((url) => typeof url === "string") : [];

    // Nunca apagar mídias que estejam em uso por algum projeto
    const emUso = await Projeto.find(
      { $or: [{ imagem: { $in: urls } }, { imagensPassoAPasso: { $in: urls } }, { videos: { $in: urls } }] },
      { imagem: 1, imagensPassoAPasso: 1, videos: 1 }
    );
    const urlsEmUso = new Set(emUso.flatMap(midiasDoProjeto));

    await apagarMidias(urls.filter((url) => !urlsEmUso.has(url)));
    res.status(200).send("Mídias removidas");
  } catch (error) {
    console.error("Erro ao remover mídias:", error);
    res.status(500).send("Erro ao remover mídias");
  }
});

app.use("/api", api);

// Erros de envio de imagem viram respostas claras em vez de um erro 500 genérico.
// O Express só reconhece um tratador de erros com 4 parâmetros, por isso o "next" fica mesmo sem uso.
app.use((erro, req, res, next) => {
  if (erro instanceof multer.MulterError) {
    const mensagens = {
      LIMIT_FILE_SIZE: "Imagem muito grande. O limite é 10 MB por imagem.",
      LIMIT_FILE_COUNT: "Envie uma imagem por vez.",
      LIMIT_UNEXPECTED_FILE: "Envie uma imagem por vez.",
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
// Só abre a porta quando executado diretamente (node server.js). Os testes
// importam o app e sobem o servidor numa porta livre por conta própria.
if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}

module.exports = app;
