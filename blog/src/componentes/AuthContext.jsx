import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";

const AuthContext = createContext();

const CHAVE_SESSAO = "ensine-musica:sessao";

export const useAuth = () => {
  return useContext(AuthContext);
};

// Lê a sessão salva no navegador; ignora se estiver vencida ou se o armazenamento estiver bloqueado
function lerSessao() {
  try {
    const sessao = JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    if (sessao?.token && sessao.expiraEm > Date.now()) return sessao;
  } catch {
    // armazenamento indisponível (aba anônima, bloqueio de cookies)
  }
  return null;
}

// Token enviado em todas as requisições. Fica fora do React e é registrado já ao carregar
// o módulo: se dependesse de um useEffect do AuthProvider, as páginas (que são filhas e
// rodam seus efeitos antes) fariam a primeira requisição sem o token, e um link direto
// para /contas, por exemplo, seria recusado pelo servidor.
let tokenAtual = null;
axios.interceptors.request.use((config) => {
  if (tokenAtual) config.headers.Authorization = `Bearer ${tokenAtual}`;
  return config;
});

function salvarSessao(sessao) {
  tokenAtual = sessao?.token || null;
  try {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // sem armazenamento: a sessão dura só enquanto a página estiver aberta
  }
}

// Sessões de antes das contas individuais não tinham "usuario": eram da conta principal
const CONTA_PRINCIPAL = { id: null, nome: "Administrador", email: null, papel: "admin", principal: true };

export const AuthProvider = ({ children }) => {
  // A senha é conferida pelo servidor, que devolve um token com validade e os dados da conta
  const [sessao, setSessao] = useState(() => {
    const salva = lerSessao();
    tokenAtual = salva?.token || null;
    return salva;
  });
  const isAuthenticated = Boolean(sessao);
  const usuario = sessao ? sessao.usuario || CONTA_PRINCIPAL : null;
  const ehAdmin = usuario?.papel === "admin";

  const logout = useCallback(() => {
    salvarSessao(null);
    setSessao(null);
  }, []);

  // Sem e-mail, entra na conta principal. Retorna { resultado, usuario }, com resultado
  // "ok", "senha-incorreta", "email-obrigatorio", "bloqueado" ou "erro"
  const login = async (email, senha) => {
    try {
      const { data } = await axios.post("/auth/login", { email: email.trim(), senha });
      salvarSessao(data);
      setSessao(data);
      return { resultado: "ok", usuario: data.usuario };
    } catch (error) {
      const status = error.response?.status;
      if (status === 400) return { resultado: "email-obrigatorio" };
      if (status === 401) return { resultado: "senha-incorreta" };
      if (status === 429) return { resultado: "bloqueado" };
      return { resultado: "erro" };
    }
  };

  // Atualiza os dados da conta na sessão (ex.: depois de trocar a senha)
  const atualizarUsuario = useCallback((novo) => {
    setSessao((atual) => {
      if (!atual) return atual;
      const sessaoNova = { ...atual, usuario: { ...(atual.usuario || CONTA_PRINCIPAL), ...novo } };
      salvarSessao(sessaoNova);
      return sessaoNova;
    });
  }, []);

  // Administradores mexem em todos os projetos; autores, só nos que publicaram
  const podeEditar = useCallback(
    (projeto) => Boolean(usuario) && (usuario.papel === "admin" || (projeto?.criadoPor && projeto.criadoPor === usuario.id)),
    [usuario]
  );

  // Encerra a sessão se o servidor recusar o token (vencido, conta desativada)
  useEffect(() => {
    const resposta = axios.interceptors.response.use(undefined, (error) => {
      if (error.response?.status === 401 && sessao && !error.config?.url?.endsWith("/auth/login")) {
        logout();
        toast.error("Sua sessão expirou. Entre novamente.");
      }
      return Promise.reject(error);
    });
    return () => axios.interceptors.response.eject(resposta);
  }, [sessao, logout]);

  // Sai sozinho quando o token vence com a página aberta
  useEffect(() => {
    if (!sessao) return undefined;
    const id = window.setTimeout(logout, sessao.expiraEm - Date.now());
    return () => window.clearTimeout(id);
  }, [sessao, logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, usuario, ehAdmin, podeEditar, login, logout, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};
