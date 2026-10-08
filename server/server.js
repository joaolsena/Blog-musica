const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const crypto = require("crypto");
require("dotenv").config();
const { criarLimite } = require("./limites");

const app = express();

// Em produção o servidor fica atrás de um proxy; isso faz req.ip ser o IP real do visitante
app.set("trust proxy", 1);

// Cabeçalhos de segurança (os mesmos do vercel.json, para valerem também fora do Vercel):
// ninguém exibe o site dentro de outro (golpe de clique escondido), o navegador não
// "adivinha" o tipo dos arquivos e outros sites não recebem o endereço completo das páginas.
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "frame-ancestors 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  });
  next();
});

// **Middleware**
// CORS_ORIGIN (opcional): endereços do site separados por vírgula, ex.:
// https://ensine-musica.vercel.app. Sem ela, qualquer origem é aceita — o que é
// seguro aqui, porque as rotas de escrita exigem o token no cabeçalho.
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) } : undefined));
app.use(express.json({ limit: "4mb" }));

// Todas as rotas da API ficam em /api, separadas das páginas do site
const api = express.Router();

// Um :id que não é um ID válido do MongoDB não pode existir: responde 404 direto
// (sem isso, o MongoDB lançaria um erro e a resposta seria um 500 genérico)
api.param("id", (req, res, next, id) => {
  if (/^[0-9a-f]{24}$/i.test(id)) return next();
  res.status(404).send("Não encontrado");
});

// Data de hoje no fuso do Amapá. O servidor costuma rodar em UTC, e sem o fuso
// um projeto cadastrado depois das 21h sairia com a data do dia seguinte.
const dataDeHoje = () => new Date().toLocaleDateString("pt-BR", { timeZone: "America/Belem" });

// **Autenticação do professor**
// Quem entra recebe um token assinado com TOKEN_SECRET, que precisa ser enviado no
// cabeçalho Authorization em toda rota que cria, edita ou apaga algo.
// Contas individuais entram com e-mail e senha. A senha principal (ADMIN_PASSWORD, com o
// e-mail em branco) é opcional: serve para o primeiro acesso e como chave reserva. Sem
// ela, só as contas individuais entram; para recuperar o acesso, basta recriá-la no Vercel.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TOKEN_SECRET = process.env.TOKEN_SECRET;
const DURACAO_TOKEN_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const autenticacaoConfigurada = Boolean(TOKEN_SECRET);
const senhaPrincipalAtiva = Boolean(ADMIN_PASSWORD);

if (!autenticacaoConfigurada) {
  console.error("TOKEN_SECRET não configurado: entrar, criar, editar e apagar projetos está desativado.");
} else if (!senhaPrincipalAtiva) {
  console.log("ADMIN_PASSWORD não configurada: só as contas individuais podem entrar.");
}

const assinar = (dados) => crypto.createHmac("sha256", TOKEN_SECRET).update(dados).digest("base64url");

// Compara textos em tempo constante (evita descobrir a senha medindo o tempo de resposta)
const iguais = (a, b) => {
  const hashA = crypto.createHash("sha256").update(String(a)).digest();
  const hashB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

// O token guarda a conta (uid) de quem entrou. Sem uid é a conta principal, que entra
// com ADMIN_PASSWORD (tokens antigos, de antes das contas, também caem aqui).
const criarToken = (uid = null) => {
  const expiraEm = Date.now() + DURACAO_TOKEN_MS;
  const dados = Buffer.from(JSON.stringify({ exp: expiraEm, uid })).toString("base64url");
  return { token: `${dados}.${assinar(dados)}`, expiraEm };
};

// Devolve o conteúdo do token ({ exp, uid }) ou null se for inválido ou vencido
const lerToken = (token) => {
  if (!autenticacaoConfigurada || typeof token !== "string") return null;
  const [dados, assinatura] = token.split(".");
  if (!dados || !assinatura || !iguais(assinatura, assinar(dados))) return null;
  try {
    const conteudo = JSON.parse(Buffer.from(dados, "base64url").toString());
    return typeof conteudo.exp === "number" && conteudo.exp > Date.now() ? conteudo : null;
  } catch {
    return null;
  }
};

const CONTA_PRINCIPAL = { id: null, nome: "Administrador", email: null, papel: "admin", principal: true };

// Descobre a conta do token enviado no pedido: { usuario } ou, se não der, { status, mensagem }.
// Uma conta desativada perde o acesso na hora, mesmo com um token ainda válido.
const contaDoPedido = async (req) => {
  if (!autenticacaoConfigurada) return { status: 503, mensagem: "Autenticação não configurada no servidor" };
  const conteudo = lerToken((req.get("Authorization") || "").replace(/^Bearer /, ""));
  if (!conteudo) return { status: 401, mensagem: "Acesso não autorizado" };
  if (!conteudo.uid) {
    if (!senhaPrincipalAtiva) return { status: 401, mensagem: "A senha principal foi desativada. Entre com a sua conta." };
    return { usuario: CONTA_PRINCIPAL };
  }
  const conta = await Usuario.findById(conteudo.uid).lean();
  if (!conta || !conta.ativo) return { status: 401, mensagem: "Conta desativada ou removida" };
  return { usuario: { id: String(conta._id), nome: conta.nome, email: conta.email, papel: conta.papel } };
};

// Protege as rotas de escrita. Fica antes do multer, para que um envio sem
// permissão seja recusado antes de qualquer imagem subir para o Cloudinary.
// Coloca em req.usuario quem está fazendo o pedido.
const exigirLogin = async (req, res, next) => {
  try {
    const { usuario, status, mensagem } = await contaDoPedido(req);
    if (!usuario) return res.status(status).send(mensagem);
    req.usuario = usuario;
    next();
  } catch (error) {
    console.error("Erro ao conferir a conta:", error);
    res.status(500).send("Erro ao conferir a conta");
  }
};

// Login opcional (comentários e fórum): quem está logado fica em req.usuario; visitantes, null
const identificar = async (req, res, next) => {
  try {
    req.usuario = (await contaDoPedido(req)).usuario || null;
  } catch {
    req.usuario = null;
  }
  next();
};

// Só administradores (backup e gerenciamento de contas)
const exigirAdmin = [
  exigirLogin,
  (req, res, next) =>
    req.usuario.papel === "admin" ? next() : res.status(403).send("Só administradores podem fazer isso."),
];

// Administradores mexem em tudo; autores, só nos projetos que publicaram
const podeMexerNoProjeto = (usuario, projeto) =>
  usuario.papel === "admin" || (projeto.criadoPor && String(projeto.criadoPor) === usuario.id);

// **Senhas das contas** (scrypt com sal aleatório; o servidor nunca guarda a senha em si)
const gerarHashSenha = (senha) => {
  const sal = crypto.randomBytes(16).toString("base64url");
  return `scrypt$${sal}$${crypto.scryptSync(senha, sal, 64).toString("base64url")}`;
};

const senhaConfere = (senha, hashSalvo) => {
  const [tipo, sal, hash] = String(hashSalvo || "").split("$");
  if (tipo !== "scrypt" || !sal || !hash) return false;
  const calculado = crypto.scryptSync(String(senha), sal, 64);
  const esperado = Buffer.from(hash, "base64url");
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
};

// Senha temporária fácil de ditar: sem letras e números que se confundem (0/O, 1/l)
const gerarSenhaTemporaria = () => {
  const letras = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  const texto = Array.from(bytes, (b) => letras[b % letras.length]).join("");
  return `${texto.slice(0, 5)}-${texto.slice(5)}`;
};

const TAMANHO_MINIMO_SENHA = 8;

// Limite de senhas erradas (guardado no banco, veja limites.js): 5 por IP a cada 15 minutos
// e 10 por conta, para quem tenta uma mesma conta trocando de IP. Bloqueado, nem a senha
// certa entra até a janela acabar.
const JANELA_TENTATIVAS_MS = 15 * 60 * 1000;
const limiteLoginPorIp = criarLimite("login-ip", { maximo: 5, janelaMs: JANELA_TENTATIVAS_MS });
const limiteLoginPorConta = criarLimite("login-conta", { maximo: 10, janelaMs: JANELA_TENTATIVAS_MS });

api.post("/auth/login", async (req, res) => {
  if (!autenticacaoConfigurada) {
    return res.status(503).send("Autenticação não configurada no servidor");
  }

  const senha = req.body?.senha;
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  const espera = Math.max(
    await limiteLoginPorIp.espera(req.ip),
    email ? await limiteLoginPorConta.espera(email) : 0
  );
  if (espera) {
    res.set("Retry-After", espera);
    return res.status(429).send("Muitas tentativas. Tente novamente mais tarde.");
  }

  const errou = async () => {
    await Promise.all([limiteLoginPorIp.contar(req.ip), email && limiteLoginPorConta.contar(email)]);
    res.status(401).send(email ? "E-mail ou senha incorretos" : "Senha incorreta");
  };
  if (typeof senha !== "string" || !senha) return errou();

  // Sem e-mail: conta principal (senha ADMIN_PASSWORD)
  if (!email) {
    if (!senhaPrincipalAtiva) return res.status(400).send("Informe o seu e-mail.");
    if (!iguais(senha, ADMIN_PASSWORD)) return errou();
    await limiteLoginPorIp.zerar(req.ip);
    return res.json({ ...criarToken(), usuario: CONTA_PRINCIPAL });
  }

  // Com e-mail: conta individual
  try {
    const conta = await Usuario.findOne({ email }).lean();
    if (!conta || !conta.ativo || !senhaConfere(senha, conta.senhaHash)) return errou();
    await Promise.all([limiteLoginPorIp.zerar(req.ip), limiteLoginPorConta.zerar(email)]);
    res.json({
      ...criarToken(String(conta._id)),
      usuario: { id: String(conta._id), nome: conta.nome, email: conta.email, papel: conta.papel, trocarSenha: conta.trocarSenha },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).send("Erro ao entrar");
  }
});

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

const LIMITE_LEGENDA = 160;

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
  // Legendas das fotos do passo a passo: uma por foto, na mesma ordem
  const { legendasPassoAPasso } = req.body;
  if (legendasPassoAPasso !== undefined) {
    if (!Array.isArray(legendasPassoAPasso) || !legendasPassoAPasso.every((l) => typeof l === "string")) {
      return res.status(400).send("Legendas inválidas.");
    }
    if (legendasPassoAPasso.some((l) => l.length > LIMITE_LEGENDA)) {
      return res.status(400).send(`Cada legenda pode ter até ${LIMITE_LEGENDA} caracteres.`);
    }
    // Mesmo tamanho da lista de fotos (sobra é cortada, falta vira legenda vazia)
    req.body.legendasPassoAPasso = imagensPassoAPasso.map((_, i) => (legendasPassoAPasso[i] || "").trim());
  }
  next();
};

// Ficha do projeto (opcional): para quem é, nível e duração. Usada nos filtros do site.
const FAIXAS_ETARIAS = ["infantil", "fundamental1", "fundamental2", "medio"];
const NIVEIS = ["facil", "medio", "desafiador"];
const DURACOES = ["1", "2", "3+"];

// Confere e normaliza a ficha: listas sem repetição, "" vira "não informado" (null)
const validarFicha = (req, res, next) => {
  const corpo = req.body;
  if (corpo.faixasEtarias !== undefined) {
    if (!Array.isArray(corpo.faixasEtarias) || !corpo.faixasEtarias.every((f) => FAIXAS_ETARIAS.includes(f))) {
      return res.status(400).send("Faixa etária inválida.");
    }
    corpo.faixasEtarias = FAIXAS_ETARIAS.filter((f) => corpo.faixasEtarias.includes(f));
  }
  for (const [campo, permitidos, nome] of [["nivel", NIVEIS, "Nível"], ["duracao", DURACOES, "Duração"]]) {
    if (corpo[campo] === undefined) continue;
    if (corpo[campo] === "" || corpo[campo] === null) corpo[campo] = null;
    else if (!permitidos.includes(corpo[campo])) return res.status(400).send(`${nome} inválido.`);
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
  legendasPassoAPasso: [String], // legenda de cada imagem do passo a passo (mesma ordem)
  videos: [String], // links do YouTube ou URLs de vídeos no Cloudinary
  referencias: String,
  tipoProjeto: { type: String, default: "instrumento" }, // "instrumento" ou "jogo"
  criadoPor: mongoose.Schema.Types.ObjectId, // conta que publicou (vazio: conta principal)
  publicadoPor: String, // nome de quem publicou
  faixasEtarias: [String], // FAIXAS_ETARIAS
  nivel: String, // NIVEIS
  duracao: String, // DURACOES (em aulas)
  data: String,
});

// Contas individuais de professores e alunos
const Usuario = mongoose.model(
  "Usuario",
  new mongoose.Schema(
    {
      nome: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      senhaHash: { type: String, required: true },
      papel: { type: String, enum: ["admin", "autor"], default: "autor" },
      ativo: { type: Boolean, default: true },
      trocarSenha: { type: Boolean, default: true }, // senha temporária: pede uma nova no primeiro acesso
    },
    { timestamps: true }
  )
);

const contaPublica = (conta) => ({
  id: String(conta._id),
  nome: conta.nome,
  email: conta.email,
  papel: conta.papel,
  ativo: conta.ativo,
  trocarSenha: conta.trocarSenha,
  criadaEm: conta.createdAt,
});

// Campos que só o servidor define (o formulário não pode trocar o dono do projeto)
const limparCamposDoServidor = (req, res, next) => {
  delete req.body._id;
  delete req.body.criadoPor;
  delete req.body.publicadoPor;
  next();
};

// **Planos de aula, comentários e fórum** (planos.js e comunidade.js)
const { Plano, registrarPlanos } = require("./planos");
const { Comentario, Topico, registrarComunidade, apagarComentariosDe } = require("./comunidade");
const { dadosEstruturados, scriptJsonLd } = require("./dadosEstruturados");

registrarPlanos(api, {
  exigirLogin,
  limparCamposDoServidor,
  validarFicha,
  podeMexer: podeMexerNoProjeto,
  dataDeHoje,
  aoApagar: (id) => apagarComentariosDe("plano", id),
});
registrarComunidade(api, { exigirLogin, identificar, modelos: { projeto: Projeto, plano: Plano } });

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
api.post("/adicionar", exigirLogin, limparCamposDoServidor, validarMidias, validarFicha, async (req, res) => {
  try {
    const novoProjeto = new Projeto({
      ...req.body,
      data: req.body.data || dataDeHoje(),
      criadoPor: req.usuario.id,
      publicadoPor: req.usuario.nome,
    });
    await novoProjeto.save();
    res.status(201).json(novoProjeto);
  } catch (error) {
    console.error("Erro ao adicionar projeto:", error);
    res.status(500).send("Erro ao adicionar projeto");
  }
});

// Rota para editar um projeto existente
api.put("/projetos/:id", exigirLogin, limparCamposDoServidor, validarMidias, validarFicha, async (req, res) => {
  try {
    const projetoAnterior = await Projeto.findById(req.params.id);

    if (!projetoAnterior) {
      return res.status(404).send("Projeto não encontrado para editar");
    }
    if (!podeMexerNoProjeto(req.usuario, projetoAnterior)) {
      return res.status(403).send("Você só pode editar os projetos que você publicou.");
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
api.delete("/projetos/:id", exigirLogin, async (req, res) => {
  try {
    const projeto = await Projeto.findById(req.params.id);
    if (!projeto) {
      return res.status(404).send("Projeto não encontrado para excluir");
    }
    if (!podeMexerNoProjeto(req.usuario, projeto)) {
      return res.status(403).send("Você só pode apagar os projetos que você publicou.");
    }

    const projetoRemovido = await Projeto.findByIdAndDelete(req.params.id);
    if (!projetoRemovido) {
      return res.status(404).send("Projeto não encontrado para excluir");
    }

    await apagarMidias(midiasDoProjeto(projetoRemovido));
    await apagarComentariosDe("projeto", projetoRemovido._id);

    res.status(200).send("Projeto excluído com sucesso");
  } catch (error) {
    console.error("Erro ao excluir projeto:", error);
    res.status(500).send("Erro ao excluir projeto");
  }
});

// Rota para enviar uma imagem (principal ou do passo a passo), uma por requisição
api.post("/upload", exigirLogin, upload.single("imagem"), subirParaCloudinary, (req, res) => {
  if (!req.file) {
    return res.status(400).send("Nenhuma imagem foi enviada.");
  }
  res.status(200).json({ url: req.file.path }); // URL do Cloudinary
});

// Rota que autoriza o navegador a enviar um vídeo direto ao Cloudinary
api.post("/videos/assinatura", exigirLogin, (req, res) => {
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
api.post("/midias/remover", exigirLogin, async (req, res) => {
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

// **Contas**
// Quem está logado (dados atualizados do banco)
api.get("/auth/eu", exigirLogin, async (req, res) => {
  if (req.usuario.principal) return res.json(CONTA_PRINCIPAL);
  const conta = await Usuario.findById(req.usuario.id).lean();
  res.json(contaPublica(conta));
});

// Trocar a própria senha (a conta principal troca a ADMIN_PASSWORD no Vercel)
api.post("/auth/senha", exigirLogin, async (req, res) => {
  if (req.usuario.principal) {
    return res.status(400).send("A senha principal é trocada nas configurações do servidor (ADMIN_PASSWORD).");
  }
  const { senhaAtual, novaSenha } = req.body || {};
  if (typeof novaSenha !== "string" || novaSenha.length < TAMANHO_MINIMO_SENHA) {
    return res.status(400).send(`A nova senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
  }
  try {
    const conta = await Usuario.findById(req.usuario.id);
    if (!senhaConfere(senhaAtual, conta.senhaHash)) return res.status(400).send("A senha atual está incorreta.");
    conta.senhaHash = gerarHashSenha(novaSenha);
    conta.trocarSenha = false;
    await conta.save();
    res.json(contaPublica(conta));
  } catch (error) {
    console.error("Erro ao trocar senha:", error);
    res.status(500).send("Erro ao trocar a senha");
  }
});

const ID_VALIDO = /^[0-9a-f]{24}$/i;
const PAPEIS = ["admin", "autor"];

api.get("/usuarios", exigirAdmin, async (req, res) => {
  try {
    const contas = await Usuario.find().sort({ nome: 1 }).lean();
    res.json(contas.map(contaPublica));
  } catch (error) {
    console.error("Erro ao listar contas:", error);
    res.status(500).send("Erro ao listar contas");
  }
});

// Cria uma conta e devolve uma senha temporária (mostrada uma única vez)
api.post("/usuarios", exigirAdmin, async (req, res) => {
  const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const papel = req.body?.papel || "autor";
  if (!nome) return res.status(400).send("Informe o nome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send("Informe um e-mail válido.");
  if (!PAPEIS.includes(papel)) return res.status(400).send("Papel inválido.");
  try {
    if (await Usuario.exists({ email })) return res.status(409).send("Já existe uma conta com esse e-mail.");
    const senhaTemporaria = gerarSenhaTemporaria();
    const conta = await Usuario.create({ nome, email, papel, senhaHash: gerarHashSenha(senhaTemporaria) });
    res.status(201).json({ usuario: contaPublica(conta), senhaTemporaria });
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    res.status(500).send("Erro ao criar conta");
  }
});

// Altera nome, papel ou ativa/desativa uma conta
api.patch("/usuarios/:uid", exigirAdmin, async (req, res) => {
  if (!ID_VALIDO.test(req.params.uid)) return res.status(404).send("Conta não encontrada");
  const mudancas = {};
  if (typeof req.body?.nome === "string" && req.body.nome.trim()) mudancas.nome = req.body.nome.trim();
  if (req.body?.papel !== undefined) {
    if (!PAPEIS.includes(req.body.papel)) return res.status(400).send("Papel inválido.");
    mudancas.papel = req.body.papel;
  }
  if (typeof req.body?.ativo === "boolean") mudancas.ativo = req.body.ativo;
  // Ninguém tira o próprio acesso de administrador por engano
  if (req.params.uid === req.usuario.id && (mudancas.ativo === false || mudancas.papel === "autor")) {
    return res.status(400).send("Você não pode desativar nem rebaixar a sua própria conta.");
  }
  try {
    const conta = await Usuario.findByIdAndUpdate(req.params.uid, mudancas, { new: true }).lean();
    if (!conta) return res.status(404).send("Conta não encontrada");
    res.json(contaPublica(conta));
  } catch (error) {
    console.error("Erro ao alterar conta:", error);
    res.status(500).send("Erro ao alterar conta");
  }
});

// Gera uma nova senha temporária (para quem esqueceu a sua)
api.post("/usuarios/:uid/nova-senha", exigirAdmin, async (req, res) => {
  if (!ID_VALIDO.test(req.params.uid)) return res.status(404).send("Conta não encontrada");
  try {
    const senhaTemporaria = gerarSenhaTemporaria();
    const conta = await Usuario.findByIdAndUpdate(
      req.params.uid,
      { senhaHash: gerarHashSenha(senhaTemporaria), trocarSenha: true },
      { new: true }
    ).lean();
    if (!conta) return res.status(404).send("Conta não encontrada");
    res.json({ usuario: contaPublica(conta), senhaTemporaria });
  } catch (error) {
    console.error("Erro ao gerar nova senha:", error);
    res.status(500).send("Erro ao gerar nova senha");
  }
});

// **Backup**
// Baixa tudo num arquivo JSON: projetos, planos de aula, tópicos do fórum e comentários.
// As fotos e vídeos continuam no Cloudinary; o backup guarda os endereços deles.
const COLECOES_BACKUP = [
  ["projetos", Projeto],
  ["planos", Plano],
  ["topicos", Topico],
  ["comentarios", Comentario],
];

api.get("/backup", exigirAdmin, async (req, res) => {
  try {
    const dados = {};
    for (const [nome, Modelo] of COLECOES_BACKUP) dados[nome] = await Modelo.find().lean();
    const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Belem" }); // AAAA-MM-DD
    res.setHeader("Content-Disposition", `attachment; filename="ensine-musica-backup-${hoje}.json"`);
    res.json({ site: "Ensine Música", geradoEm: new Date().toISOString(), total: dados.projetos.length, ...dados });
  } catch (error) {
    console.error("Erro ao gerar backup:", error);
    res.status(500).send("Erro ao gerar backup");
  }
});

// Recria, de uma lista do backup, só os itens que não existem mais (nunca sobrescreve)
async function restaurarColecao(Modelo, lista, ajustar = (item) => item) {
  const validos = lista.filter((item) => item && typeof item === "object" && /^[0-9a-f]{24}$/i.test(String(item._id)));
  const existentes = new Set(
    (await Modelo.find({ _id: { $in: validos.map((item) => item._id) } }, { _id: 1 }).lean()).map((item) => String(item._id))
  );
  const novos = validos.filter((item) => !existentes.has(String(item._id))).map(ajustar);
  if (novos.length > 0) await Modelo.insertMany(novos);
  return { restaurados: novos.length, jaExistiam: existentes.size, ignorados: lista.length - validos.length };
}

// Restaura um backup. Aceita também os backups antigos, que só tinham projetos.
api.post("/backup/restaurar", exigirAdmin, async (req, res) => {
  const corpo = Array.isArray(req.body) ? { projetos: req.body } : req.body || {};
  if (!Array.isArray(corpo.projetos)) {
    return res.status(400).send("Arquivo de backup inválido: não encontrei a lista de projetos.");
  }
  try {
    const projetos = await restaurarColecao(
      Projeto,
      corpo.projetos.filter((p) => typeof p?.titulo === "string"),
      (p) => ({ ...p, videos: (p.videos || []).filter(videoPermitido) })
    );
    projetos.ignorados += corpo.projetos.filter((p) => typeof p?.titulo !== "string").length;
    const outros = {};
    for (const [nome, Modelo] of COLECOES_BACKUP.slice(1)) {
      if (Array.isArray(corpo[nome])) outros[nome] = (await restaurarColecao(Modelo, corpo[nome])).restaurados;
    }
    res.json({ ...projetos, outros });
  } catch (error) {
    console.error("Erro ao restaurar backup:", error);
    res.status(500).send("Erro ao restaurar backup");
  }
});

app.use("/api", api);

// **Páginas com prévia (WhatsApp, redes sociais e Google)**
// O site é montado no navegador, mas quem gera a prévia de um link (WhatsApp, Facebook,
// Google) só lê o HTML. Por isso o endereço de cada projeto passa por aqui (veja
// vercel.json): devolvemos a mesma página do site com título, descrição e foto do projeto.
const escaparHtml = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const origemDoSite = (req) => process.env.SITE_URL || `${req.protocol}://${req.get("x-forwarded-host") || req.get("host")}`;

// HTML base do site: lido do build local ou, no Vercel, pedido ao próprio site
let htmlBase = null;
let htmlBaseEm = 0;
async function lerHtmlBase(req) {
  if (htmlBase && Date.now() - htmlBaseEm < 5 * 60 * 1000) return htmlBase;
  const arquivoLocal = require("path").join(__dirname, "../blog/dist/index.html");
  if (require("fs").existsSync(arquivoLocal)) {
    htmlBase = require("fs").readFileSync(arquivoLocal, "utf8");
  } else {
    const resposta = await fetch(`${origemDoSite(req)}/index.html`);
    if (!resposta.ok) throw new Error(`index.html respondeu ${resposta.status}`);
    htmlBase = await resposta.text();
  }
  htmlBaseEm = Date.now();
  return htmlBase;
}

// Troca o conteúdo de uma <meta> (ou a acrescenta, se não existir)
function trocarMeta(html, atributo, nome, valor) {
  const tag = `<meta ${atributo}="${nome}" content="${escaparHtml(valor)}" />`;
  const existente = new RegExp(`<meta ${atributo}="${nome.replace(/[:.]/g, "\\$&")}" content="[^"]*"\\s*/?>`);
  return existente.test(html) ? html.replace(existente, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

// Descrição curta, cortada numa palavra inteira
const resumir = (texto, limite = 160) => {
  const limpo = String(texto || "").replace(/\s+/g, " ").trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite).replace(/\s+\S*$/, "")}…`;
};

// Capa recortada no tamanho que o WhatsApp e as redes usam (1200×630)
const imagemDePrevia = (url) =>
  url && url.includes("res.cloudinary.com") && url.includes("/image/upload/")
    ? url.replace("/image/upload/", "/image/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/")
    : null;

// { titulo, descricao, imagem } da página: projeto, plano de aula ou tópico do fórum
function paginaComPrevia(html, { titulo, descricao, imagem, dados }, enderecoDaPagina) {
  let pagina = html.replace(/<title>[^<]*<\/title>/, `<title>${escaparHtml(`${titulo} — Ensine Música`)}</title>`);
  pagina = trocarMeta(pagina, "name", "description", descricao);
  pagina = trocarMeta(pagina, "property", "og:type", "article");
  pagina = trocarMeta(pagina, "property", "og:title", titulo);
  pagina = trocarMeta(pagina, "property", "og:description", descricao);
  pagina = trocarMeta(pagina, "property", "og:url", enderecoDaPagina);
  pagina = trocarMeta(pagina, "property", "og:image:alt", titulo);
  if (imagem) pagina = trocarMeta(pagina, "property", "og:image", imagem);
  const extras = [`<link rel="canonical" href="${escaparHtml(enderecoDaPagina)}" />`];
  if (dados) extras.push(scriptJsonLd(dados));
  return pagina.replace("</head>", `${extras.map((tag) => `    ${tag}\n`).join("")}  </head>`);
}

// Cada tipo de página: o caminho no site e como achar o título, a descrição e a foto,
// mais os dados estruturados para o Google (dadosEstruturados.js)
const PAGINAS_COM_PREVIA = {
  projeto: async (id, enderecos) => {
    const projeto = await Projeto.findById(id).lean();
    return (
      projeto && {
        titulo: projeto.titulo,
        descricao: resumir(projeto.descricaoGeral) || "Projeto de educação musical com materiais alternativos.",
        imagem: imagemDePrevia(projeto.imagem),
        dados: dadosEstruturados({ tipo: "projeto", item: projeto, ...enderecos }),
      }
    );
  },
  plano: async (id, enderecos) => {
    const plano = await Plano.findById(id).populate("projetos", "titulo imagem").lean();
    return (
      plano && {
        titulo: plano.titulo,
        descricao: resumir(plano.resumo) || "Plano de aula de música do Ensine Música.",
        imagem: imagemDePrevia(plano.projetos?.find((p) => p?.imagem)?.imagem),
        dados: dadosEstruturados({ tipo: "plano", item: plano, ...enderecos }),
      }
    );
  },
  forum: async (id, enderecos) => {
    const topico = await Topico.findOne({ _id: id, status: "aprovado" }).lean();
    if (!topico) return null;
    const respostas = await Comentario.find({ alvoTipo: "topico", alvoId: topico._id, status: "aprovado" })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();
    return {
      titulo: topico.titulo,
      descricao: resumir(topico.texto) || "Conversa no fórum do Ensine Música.",
      dados: dadosEstruturados({ tipo: "forum", item: topico, respostas, ...enderecos }),
    };
  },
};

app.get(["/projeto/:id", "/plano/:id", "/forum/:id"], async (req, res) => {
  const tipo = req.path.split("/")[1];
  let html;
  try {
    html = await lerHtmlBase(req);
  } catch (error) {
    console.error("Erro ao ler a página base:", error);
    return res.status(502).send("Página indisponível no momento. Tente de novo em instantes.");
  }
  res.type("html");
  // A CDN guarda por 5 minutos: uma edição aparece na prévia em até 5 minutos
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");

  if (!/^[0-9a-f]{24}$/i.test(req.params.id)) return res.status(404).send(html);
  try {
    const origem = origemDoSite(req);
    const endereco = `${origem}/${tipo}/${req.params.id}`;
    const previa = await PAGINAS_COM_PREVIA[tipo](req.params.id, { endereco, origem });
    if (!previa) return res.status(404).send(html);
    res.send(paginaComPrevia(html, previa, endereco));
  } catch (error) {
    console.error("Erro ao montar a prévia da página:", error);
    res.send(html); // sem a prévia, mas a página funciona normalmente
  }
});

// Regras para buscadores, com o endereço do sitemap no domínio em uso
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
  res.send(
    [
      "User-agent: *",
      "Disallow: /login",
      "Disallow: /adicionar-projeto",
      "Disallow: /editar-projeto/",
      "Disallow: /novo-plano",
      "Disallow: /editar-plano/",
      "Disallow: /moderacao",
      "Disallow: /backup",
      "Disallow: /contas",
      "Disallow: /minha-conta",
      "",
      `Sitemap: ${origemDoSite(req)}/sitemap.xml`,
      "",
    ].join("\n")
  );
});

// Lista de páginas para o Google encontrar todos os projetos
const dataISO = (dataBR) => {
  const [dia, mes, ano] = String(dataBR || "").split("/");
  return ano && mes && dia ? `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}` : null;
};

app.get("/sitemap.xml", async (req, res) => {
  try {
    const origem = origemDoSite(req);
    const [projetos, planos, topicos] = await Promise.all([
      Projeto.find({}, { _id: 1, data: 1 }).lean(),
      Plano.find({}, { _id: 1, updatedAt: 1 }).lean(),
      Topico.find({ status: "aprovado" }, { _id: 1, ultimaAtividade: 1 }).lean(),
    ]);
    const url = (caminho, data) => `<url><loc>${origem}${caminho}</loc>${data ? `<lastmod>${data}</lastmod>` : ""}</url>`;
    const dia = (data) => (data ? new Date(data).toISOString().slice(0, 10) : null);
    const urls = [
      url("/"),
      url("/planos"),
      url("/forum"),
      url("/Ensine-Musica"),
      url("/privacidade"),
      ...projetos.map((p) => url(`/projeto/${p._id}`, dataISO(p.data))),
      ...planos.map((p) => url(`/plano/${p._id}`, dia(p.updatedAt))),
      ...topicos.map((t) => url(`/forum/${t._id}`, dia(t.ultimaAtividade))),
    ];
    res.type("application/xml");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
  } catch (error) {
    console.error("Erro ao gerar o sitemap:", error);
    res.status(500).send("Erro ao gerar o sitemap");
  }
});

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
