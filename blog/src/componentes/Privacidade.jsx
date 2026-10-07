import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Pauta from "./Pauta";

// O que o site guarda, onde e por quê, em linguagem simples (LGPD).
// Ao mudar o que o site coleta, atualize este texto e a data.
function Privacidade() {
  useEffect(() => {
    document.title = "Privacidade — Ensine Música";
  }, []);

  return (
    <div className="container sobre privacidade">
      <header className="sobre__head">
        <p className="eyebrow">Ensine Música</p>
        <h1 className="sobre__title">Privacidade</h1>
        <Pauta className="sobre__pauta" />
        <p className="privacidade__data">Atualizado em 7 de outubro de 2026</p>
      </header>

      <div className="sobre__texto">
        <p className="sobre__lead">
          Para ler, comentar ou participar do fórum, ninguém precisa de cadastro. Não usamos anúncios nem ferramentas
          de rastreamento.
        </p>

        <section>
          <h2>Quem comenta ou abre um tópico</h2>
          <p>
            Guardamos o nome que você escreveu, a mensagem e a data. Não pedimos e-mail nem telefone, e não guardamos o
            seu endereço de internet (IP). Para barrar spam, o servidor usa por 10 minutos uma marca embaralhada desse
            endereço, que não permite descobrir qual é ele, e depois a apaga.
          </p>
          <p>
            Toda mensagem é lida por um professor antes de aparecer no site. Mensagens com ofensas, propaganda ou dados
            pessoais são recusadas e apagadas.
          </p>
        </section>

        <section className="privacidade__destaque">
          <h2>Alunos e menores de idade</h2>
          <p>
            Não escreva sobrenome, telefone, endereço, nome da escola ou da turma, nem informações sobre alunos. Para
            assinar, o primeiro nome basta.
          </p>
        </section>

        <section>
          <h2>Professores com conta</h2>
          <p>
            Guardamos o nome, o e-mail e a senha, que fica embaralhada: ninguém consegue lê-la, nem a equipe do site. Os
            projetos e planos de aula publicados mostram o nome que o autor escolher.
          </p>
        </section>

        <section>
          <h2>O que fica só no seu aparelho</h2>
          <p>
            Para o site abrir rápido e funcionar sem internet, o seu navegador guarda: a última versão das páginas que
            você viu, o tema claro ou escuro, os rascunhos de projetos e planos, o nome que você usou para comentar, as
            suas mensagens que ainda esperam aprovação e, para professores, o login. Nada disso é enviado a ninguém.
            Para apagar, limpe os dados do site nas configurações do navegador.
          </p>
        </section>

        <section>
          <h2>Vídeos do YouTube</h2>
          <p>
            Os vídeos tocam no modo de privacidade do YouTube, que só é carregado quando você aperta o play. A partir
            daí, vale a política de privacidade do próprio YouTube.
          </p>
        </section>

        <section>
          <h2>Onde os dados ficam</h2>
          <p>
            O site e o servidor ficam no Vercel; os textos, no banco de dados MongoDB Atlas; as fotos e os vídeos, no
            Cloudinary. Usamos os dados só para fazer o site funcionar: nada é vendido nem repassado.
          </p>
        </section>

        <section>
          <h2>Pedir para ver, corrigir ou apagar</h2>
          <p>
            Quer que um comentário seu saia do site, ou quer saber o que guardamos sobre você? Escreva para{" "}
            <a href="mailto:joaolsena129@gmail.com" className="link">
              a equipe do Ensine Música
            </a>
            . Respondemos o quanto antes.
          </p>
          <p>
            <Link to="/" className="link">
              Voltar aos projetos
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Privacidade;
