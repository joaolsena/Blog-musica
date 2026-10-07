import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useContagemModeracao } from "./contagemModeracao";

// Iniciais para o círculo da conta: "Ana Beatriz Costa" → "AC"
export function iniciais(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export const ROTULO_PAPEL = { admin: "Administrador", autor: "Autor" };

// Menu da conta no cabeçalho (computador): iniciais + primeiro nome, abre as opções
function MenuConta() {
  const { usuario, ehAdmin, logout } = useAuth();
  const pendentes = useContagemModeracao();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const botao = useRef(null);
  const menuId = useId();
  const location = useLocation();

  // Fecha ao trocar de página, clicar fora ou apertar Esc (devolvendo o foco ao botão)
  useEffect(() => setAberto(false), [location.pathname]);
  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicar = (e) => !raiz.current?.contains(e.target) && setAberto(false);
    const aoTeclar = (e) => {
      if (e.key !== "Escape") return;
      setAberto(false);
      botao.current?.focus();
    };
    document.addEventListener("pointerdown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  if (!usuario) return null;
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <div className="conta" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="conta__botao"
        aria-expanded={aberto}
        aria-controls={menuId}
        aria-label={`Conta de ${usuario.nome}${pendentes > 0 ? `, ${pendentes} mensagens esperando aprovação` : ""}`}
        onClick={() => setAberto((a) => !a)}
      >
        <span className="conta__avatar" aria-hidden="true">
          {iniciais(usuario.nome)}
        </span>
        <span className="conta__nome">{primeiroNome}</span>
        {pendentes > 0 && (
          <span className="contagem-pendentes" aria-label={`${pendentes} esperando aprovação`}>
            {pendentes}
          </span>
        )}
        <svg className="conta__seta" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div id={menuId} className="conta__menu" data-aberto={aberto} inert={aberto ? undefined : ""}>
        <div className="conta__quem">
          <strong>{usuario.nome}</strong>
          <span>{usuario.email || ROTULO_PAPEL[usuario.papel]}</span>
        </div>
        <Link to="/novo-plano" className="conta__item">
          Novo plano de aula
        </Link>
        <Link to="/moderacao" className="conta__item">
          Moderação
          {pendentes > 0 && <span className="contagem-pendentes">{pendentes}</span>}
        </Link>
        <Link to="/minha-conta" className="conta__item">
          Minha conta
        </Link>
        {ehAdmin && (
          <>
            <Link to="/contas" className="conta__item">
              Contas
            </Link>
            <Link to="/backup" className="conta__item">
              Backup
            </Link>
          </>
        )}
        <button type="button" className="conta__item conta__item--sair" onClick={logout}>
          Sair
        </button>
      </div>
    </div>
  );
}

export default MenuConta;
