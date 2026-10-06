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

function salvarSessao(sessao) {
  try {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // sem armazenamento: a sessão dura só enquanto a página estiver aberta
  }
}

export const AuthProvider = ({ children }) => {
  // A senha é conferida pelo servidor, que devolve um token com validade
  const [sessao, setSessao] = useState(lerSessao);
  const isAuthenticated = Boolean(sessao);

  const logout = useCallback(() => {
    salvarSessao(null);
    setSessao(null);
  }, []);

  // Retorna "ok", "senha-incorreta", "bloqueado" ou "erro"
  const login = async (password) => {
    try {
      const { data } = await axios.post("/auth/login", { senha: password });
      salvarSessao(data);
      setSessao(data);
      return "ok";
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) return "senha-incorreta";
      if (status === 429) return "bloqueado";
      return "erro";
    }
  };

  // Envia o token em todas as requisições e encerra a sessão se o servidor recusá-lo
  useEffect(() => {
    const envio = axios.interceptors.request.use((config) => {
      if (sessao?.token) config.headers.Authorization = `Bearer ${sessao.token}`;
      return config;
    });
    const resposta = axios.interceptors.response.use(undefined, (error) => {
      if (error.response?.status === 401 && sessao && !error.config?.url?.endsWith("/auth/login")) {
        logout();
        toast.error("Sua sessão expirou. Entre novamente.");
      }
      return Promise.reject(error);
    });
    return () => {
      axios.interceptors.request.eject(envio);
      axios.interceptors.response.eject(resposta);
    };
  }, [sessao, logout]);

  // Sai sozinho quando o token vence com a página aberta
  useEffect(() => {
    if (!sessao) return undefined;
    const id = window.setTimeout(logout, sessao.expiraEm - Date.now());
    return () => window.clearTimeout(id);
  }, [sessao, logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
