// Quantas mensagens esperam aprovação (aparece no menu da conta como um número).
// Fica fora do React para o menu, o menu do celular e a página de moderação
// mostrarem o mesmo número sem pedir ao servidor várias vezes.
import axios from "axios";
import { useSyncExternalStore } from "react";

const INTERVALO_MINIMO_MS = 30 * 1000;
let total = 0;
let ultimaBusca = 0;
const ouvintes = new Set();

export function definirContagem(valor) {
  total = Math.max(0, valor);
  ouvintes.forEach((avisar) => avisar());
}

export function atualizarContagem({ forcar = false } = {}) {
  if (!forcar && Date.now() - ultimaBusca < INTERVALO_MINIMO_MS) return;
  ultimaBusca = Date.now();
  axios
    .get("/moderacao/contagem")
    .then(({ data }) => definirContagem(data.total || 0))
    .catch(() => {});
}

export function zerarContagem() {
  ultimaBusca = 0;
  definirContagem(0);
}

const assinar = (avisar) => {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
};

export const useContagemModeracao = () => useSyncExternalStore(assinar, () => total);
