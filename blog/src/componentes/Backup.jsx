import React, { useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

// Backup dos projetos (só para quem entrou como professor).
// - Baixar: um arquivo .json com todos os projetos, para guardar no computador ou no Drive.
// - Automático: toda semana o GitHub guarda uma cópia (veja .github/workflows/backup.yml).
// - Restaurar: recria, a partir de um arquivo, os projetos que não existem mais no site.
// As fotos e vídeos ficam no Cloudinary; o backup guarda os endereços deles.

const BACKUPS_NO_GITHUB = "https://github.com/joaolsena/Blog-musica/tree/backups/backups";

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function Backup() {
  const [baixando, setBaixando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const arquivoRef = useRef(null);

  const baixar = async () => {
    setBaixando(true);
    try {
      const { data, headers } = await axios.get("/backup", { responseType: "blob" });
      const nome =
        /filename="([^"]+)"/.exec(headers["content-disposition"] || "")?.[1] || "ensine-musica-backup.json";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(data);
      link.download = nome;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      const { total } = JSON.parse(await data.text());
      toast.success(`Backup baixado: ${plural(total, "projeto", "projetos")}.`);
    } catch (error) {
      console.error("Erro ao baixar backup:", error);
      toast.error("Não foi possível gerar o backup agora. Tente de novo.");
    } finally {
      setBaixando(false);
    }
  };

  const restaurar = async (e) => {
    const arquivo = e.target.files[0];
    e.target.value = "";
    if (!arquivo) return;

    let conteudo;
    try {
      conteudo = JSON.parse(await arquivo.text());
    } catch {
      toast.error("Esse arquivo não é um backup do Ensine Música (.json).");
      return;
    }
    const projetos = Array.isArray(conteudo) ? conteudo : conteudo?.projetos;
    if (!Array.isArray(projetos)) {
      toast.error("Não encontrei a lista de projetos nesse arquivo.");
      return;
    }
    const ok = window.confirm(
      `Restaurar a partir de "${arquivo.name}" (${plural(projetos.length, "projeto", "projetos")})?\n\n` +
        "Só os projetos que não existem mais no site serão recriados. Nada é apagado ou sobrescrito."
    );
    if (!ok) return;

    setRestaurando(true);
    try {
      const { data } = await axios.post("/backup/restaurar", { projetos });
      const partes = [
        `${plural(data.restaurados, "projeto restaurado", "projetos restaurados")}`,
        data.jaExistiam > 0 && `${data.jaExistiam} já ${data.jaExistiam === 1 ? "existia" : "existiam"}`,
        data.ignorados > 0 && `${data.ignorados} ${data.ignorados === 1 ? "inválido ignorado" : "inválidos ignorados"}`,
      ].filter(Boolean);
      toast.success(partes.join(" · "));
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      const mensagem = typeof error.response?.data === "string" ? error.response.data : null;
      toast.error(mensagem || "Não foi possível restaurar o backup. Tente de novo.");
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <div className="container form-page">
      <header className="form-page__head">
        <p className="eyebrow">Área do professor</p>
        <h1>Backup</h1>
        <p>
          Uma cópia de todos os projetos, para nada se perder se o banco de dados for apagado por engano.
        </p>
      </header>

      <div className="form">
        <section className="form__section backup">
          <div className="form__section-head">
            <span className="form__num">I</span>
            <h2>Baixar agora</h2>
          </div>
          <p className="backup__texto">
            Gera um arquivo com os textos de todos os projetos e os endereços das fotos e vídeos. Guarde no
            computador ou no Google Drive.
          </p>
          <div>
            <button type="button" className="btn btn--primary" onClick={baixar} disabled={baixando}>
              {baixando ? "Gerando…" : "Baixar backup"}
            </button>
          </div>
        </section>

        <section className="form__section backup">
          <div className="form__section-head">
            <span className="form__num">II</span>
            <h2>Backup automático</h2>
          </div>
          <p className="backup__texto">
            Toda segunda-feira, às 6h, o GitHub guarda sozinho uma cópia datada dos projetos. Se algo der errado, o
            GitHub avisa por e-mail.
          </p>
          <div>
            <a className="btn btn--ghost" href={BACKUPS_NO_GITHUB} target="_blank" rel="noreferrer">
              Ver backups no GitHub
            </a>
          </div>
        </section>

        <section className="form__section backup">
          <div className="form__section-head">
            <span className="form__num">III</span>
            <h2>Restaurar</h2>
          </div>
          <p className="backup__texto">
            Escolha um arquivo de backup para recriar os projetos que não existem mais no site. Os projetos que já
            existem não são alterados.
          </p>
          <div>
            <input
              ref={arquivoRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              id="arquivo-backup"
              onChange={restaurar}
            />
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => arquivoRef.current?.click()}
              disabled={restaurando}
            >
              {restaurando ? "Restaurando…" : "Escolher arquivo de backup"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Backup;
