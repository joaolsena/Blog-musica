// **Limites de tentativas** (login e envios do público)
// No Vercel o servidor roda em várias cópias ao mesmo tempo e reinicia com frequência:
// uma contagem só na memória recomeçaria do zero a cada cópia. Por isso a contagem fica
// no banco, numa coleção que o próprio MongoDB limpa quando a janela de tempo acaba.
// O banco não guarda o IP nem o e-mail de ninguém, só uma marca embaralhada deles.
// Sem banco (testes automáticos) ou se o banco falhar, conta na memória.
const crypto = require("crypto");
const mongoose = require("mongoose");

const Limite = mongoose.model(
  "Limite",
  new mongoose.Schema({
    chave: { type: String, required: true, unique: true },
    contagem: { type: Number, default: 0 },
    expiraEm: { type: Date, required: true, index: { expires: 0 } }, // o MongoDB apaga quando vence
  })
);

const memoria = new Map(); // chave -> { contagem, expiraEm }

setInterval(() => {
  const agora = Date.now();
  memoria.forEach((registro, chave) => registro.expiraEm <= agora && memoria.delete(chave));
}, 60 * 1000).unref();

const marca = (texto) =>
  crypto
    .createHmac("sha256", process.env.TOKEN_SECRET || "ensine-musica")
    .update(String(texto))
    .digest("base64url")
    .slice(0, 22);

const usarBanco = () => Boolean(process.env.MONGO_URI);

/**
 * Cria um limite de `maximo` ocorrências para cada pessoa (IP ou e-mail). A janela de
 * `janelaMs` começa na primeira ocorrência: quem chega ao máximo fica bloqueado até ela acabar.
 * - contar(quem): soma uma ocorrência e devolve o total da janela
 * - espera(quem): segundos até liberar, se já chegou ao máximo (0 se pode seguir)
 * - zerar(quem): recomeça a contagem (ex.: depois de um login certo)
 */
function criarLimite(nome, { maximo, janelaMs }) {
  const chaveDe = (quem) => `${nome}:${marca(quem)}`;
  const segundosAte = (expiraEm) => Math.max(1, Math.ceil((new Date(expiraEm).getTime() - Date.now()) / 1000));

  const naMemoria = {
    atual(chave) {
      const registro = memoria.get(chave);
      return registro && registro.expiraEm > Date.now() ? registro : null;
    },
    contar(chave) {
      const registro = naMemoria.atual(chave) || { contagem: 0, expiraEm: Date.now() + janelaMs };
      registro.contagem += 1;
      memoria.set(chave, registro);
      return registro;
    },
    zerar: (chave) => memoria.delete(chave),
  };

  const noBanco = {
    // O MongoDB apaga os vencidos sozinho, mas só confere a cada minuto: o filtro garante
    async atual(chave) {
      return Limite.findOne({ chave, expiraEm: { $gt: new Date() } }, { contagem: 1, expiraEm: 1 }).lean();
    },
    async contar(chave, tentativa = 1) {
      await Limite.deleteOne({ chave, expiraEm: { $lte: new Date() } });
      try {
        return await Limite.findOneAndUpdate(
          { chave },
          { $inc: { contagem: 1 }, $setOnInsert: { expiraEm: new Date(Date.now() + janelaMs) } },
          { upsert: true, new: true, lean: true }
        );
      } catch (error) {
        // Dois pedidos criando o mesmo registro ao mesmo tempo: o segundo tenta de novo
        if (error.code === 11000 && tentativa === 1) return noBanco.contar(chave, 2);
        throw error;
      }
    },
    zerar: (chave) => Limite.deleteOne({ chave }),
  };

  // Usa o banco; se ele falhar, segue contando na memória (melhor que ficar sem limite)
  const usar = async (operacao, chave) => {
    if (!usarBanco()) return naMemoria[operacao](chave);
    try {
      return await noBanco[operacao](chave);
    } catch (error) {
      console.error(`Limite "${nome}": banco indisponível, contando na memória.`, error.message);
      return naMemoria[operacao](chave);
    }
  };

  return {
    maximo,
    async contar(quem) {
      return (await usar("contar", chaveDe(quem))).contagem;
    },
    async espera(quem) {
      const registro = await usar("atual", chaveDe(quem));
      return registro && registro.contagem >= maximo ? segundosAte(registro.expiraEm) : 0;
    },
    async zerar(quem) {
      await usar("zerar", chaveDe(quem));
    },
  };
}

module.exports = { criarLimite };
