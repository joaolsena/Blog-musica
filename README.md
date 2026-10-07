# Ensine Música

Blog de educação musical com tutoriais de instrumentos e jogos musicais feitos com materiais alternativos, criados por estudantes para inspirar professores de música.

Site: [ensine-musica.vercel.app](https://ensine-musica.vercel.app)

## Funcionalidades

- Lista de projetos com busca e filtro por tipo (instrumento ou jogo)
- Página de cada projeto: materiais, passo a passo com até 20 fotos, vídeos (link do YouTube ou arquivo enviado), instruções de uso e aplicação didática
- Ficha de cada projeto (para quem é, nível e duração) e filtros por turma, nível e duração na página inicial
- Botão "Baixar PDF" em cada projeto: arquivo pronto para imprimir, com capa, ficha, materiais em lista para marcar, fotos do passo a passo com legendas e links dos vídeos. Os textos longos saem justificados; as referências, alinhadas à esquerda. O PDF é gerado no próprio navegador, com as fontes do site (`blog/src/assets/fontes`, licença OFL)
- Prévia própria de cada projeto ao compartilhar o link (título, descrição e foto no WhatsApp, Facebook etc.) e sitemap para o Google
- Rascunho automático ao cadastrar um projeto: textos, fotos e vídeos voltam se a página recarregar
- Backup: botão para baixar e restaurar (área do professor) e cópia automática toda segunda-feira no GitHub (branch `backups`)
- Botão de compartilhar: menu nativo do celular (WhatsApp, Instagram etc.) ou, no computador, WhatsApp, Telegram, Facebook, e-mail e "copiar link"
- Contas individuais: **administradores** (tudo, inclusive contas e backup) e **autores** (publicam e editam só os próprios projetos). Conta nova recebe senha temporária e cria a própria no primeiro acesso. A senha principal (`ADMIN_PASSWORD`, com o e-mail em branco no login) continua valendo como chave reserva
- Legenda em cada foto do passo a passo (aparece embaixo da foto, na tela cheia e para leitores de tela)
- Modo claro e escuro, layout para computador e celular
- Instalável como app (iPhone, iPad, Android, Mac e Windows): botão discreto no cabeçalho e no rodapé. No Chrome e no Edge abre a janela de instalação do sistema; no Safari e nos outros, mostra o passo a passo. Depois de instalado, abre sem internet o que já foi visto
- Projetos guardados no aparelho: a última versão vista aparece na hora, com o aviso "Sincronizando…" enquanto o servidor responde (e "Sem conexão" com o horário da versão mostrada, se não houver internet)

## Tecnologias

| Parte | Tecnologias |
| --- | --- |
| Site (`blog/`) | React 18, Vite 7, React Router, Axios, Sonner (avisos) |
| Servidor (`server/`) | Node.js 22, Express, Mongoose, Multer |
| Banco de dados | MongoDB Atlas |
| Imagens e vídeos | Cloudinary |
| Publicação | Vercel (site e servidor no mesmo endereço) |

## Estrutura

```
blog/                  site em React (Vite)
  index.html           página base, metadados e prévia de links
  public/              ícones, prévia de links, manifest.webmanifest e sw.js (app instalável)
  public/app/          ícones do app e capturas de tela mostradas na instalação
  src/
    api.js             endereço do servidor
    componentes/       páginas e componentes
  vite.config.js       porta, proxy para o servidor e testes
  .env.production      endereço público do site (prévia de links)
server/
  server.js            API (rotas em /api)
  server.test.js       testes da API
  .env.example         modelo das variáveis de ambiente
api/index.js           entrada do servidor no Vercel (usa server/server.js)
vercel.json            como o Vercel compila o site e encaminha /api ao servidor
```

## Como rodar no computador

Requisitos: Node.js 22.12 ou mais novo (exigência do Vite 7) e npm.

**1. Servidor**

```bash
cd server
npm install
cp .env.example .env   # e preencha os valores (veja a tabela abaixo)
npm start              # http://localhost:4000
```

**2. Site** (em outro terminal)

```bash
cd blog
npm install
npm run dev            # http://localhost:3000
```

No computador, o site repassa as chamadas de `/api` para o servidor na porta 4000 (`proxy` em `blog/vite.config.js`), então não é preciso configurar o endereço do servidor.

Outros comandos do site:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Compila o site para publicação (pasta `dist`) |
| `npm run preview` | Abre o site compilado em http://localhost:3000, para conferir antes de publicar |
| `npm run lint` | Verifica o código (variáveis sem uso, erros de JSX, uso dos hooks do React) |

## Variáveis de ambiente

**Servidor** (`server/.env` no computador; painel do serviço de hospedagem em produção):

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `MONGO_URI` | sim | Conexão com o MongoDB Atlas |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | sim | Envio e remoção de imagens e vídeos |
| `ADMIN_PASSWORD` | não | Senha principal: entra como administrador com o e-mail em branco. Use no primeiro acesso para criar as contas; depois pode apagar (só as contas entram). Para recuperar o acesso, recrie-a |
| `TOKEN_SECRET` | sim | Chave que assina os tokens de login |
| `CORS_ORIGIN` | não | Restringe quais sites podem chamar a API |
| `SITE_URL` | não | Endereço oficial do site (ex.: `https://ensinemusica.com.br`), usado nos links canônicos, no sitemap e no robots.txt. Sem ela, vale o endereço acessado |
| `PORT` | não | Porta do servidor (padrão 4000) |

Sem `TOKEN_SECRET`, o site continua mostrando os projetos, mas ninguém consegue entrar, publicar, editar ou apagar.

**Site:**

| Variável | Para que serve |
| --- | --- |
| `VITE_SITE_URL` | Endereço do site, usado na prévia de links do WhatsApp. Já definido em `blog/.env.production` |
| `VITE_API_URL` | Só se o servidor ficar em outro endereço. No Vercel, site e servidor ficam juntos e ela fica vazia |

As variáveis `VITE_*` são embutidas no site durante a compilação: depois de mudar uma delas, publique o site de novo. Nunca coloque senhas nelas — elas ficam visíveis no código do site.

## Testes

```bash
cd blog && npm test       # site: componentes, filtros, busca, 404, login
cd server && npm test     # servidor: login, permissões, limites de envio de imagens
```

Os testes não acessam o banco de dados nem o Cloudinary.

## Publicação

Site e servidor ficam no mesmo projeto do Vercel (`ensine-musica`). O `vercel.json` compila a pasta `blog` com o Vite e manda as rotas `/api/*` para o servidor, que roda como função em São Paulo (`gru1`), perto do banco.

1. Cadastre as variáveis da tabela do servidor no painel do Vercel (Settings → Environment Variables, ambiente Production).
2. No MongoDB Atlas, em Network Access, libere o acesso de qualquer IP (`0.0.0.0/0`): o Vercel não tem IP fixo.
3. Publique com `vercel deploy --prod` na raiz do repositório (ou conecte o repositório do GitHub ao projeto para publicar a cada push).

**Backup automático:** `.github/workflows/backup.yml` roda toda segunda-feira às 6h (horário de Belém), baixa os projetos de `/api/projetos` e guarda uma cópia datada na branch `backups`. Para rodar na hora: aba Actions do GitHub > Backup dos projetos > Run workflow. Para restaurar, entre no site como professor > Backup > Restaurar. Com domínio próprio, crie a variável `SITE_URL` do repositório (veja abaixo).

**Domínio próprio** (ex.: `ensinemusica.com.br`, comprado no [Registro.br](https://registro.br)):
1. No Vercel: projeto `ensine-musica` > Settings > Domains > Add, e digite o domínio. O Vercel mostra os registros de DNS.
2. No Registro.br: no domínio, em DNS, use os servidores do Vercel (`ns1.vercel-dns.com` e `ns2.vercel-dns.com`) ou crie os registros que o Vercel mostrou.
3. No Vercel, em Environment Variables, crie `SITE_URL` com o endereço novo e publique de novo. A prévia de links passa a usar o domínio sozinha (o build lê o domínio principal do projeto).
4. No GitHub: Settings > Secrets and variables > Actions > Variables, crie `SITE_URL` com o endereço novo (usado pelo backup semanal).
5. Opcional: no Vercel, em Domains, faça `ensine-musica.vercel.app` redirecionar para o domínio novo.

No Vercel, cada envio ao servidor tem limite de 4,5 MB. Por isso o site reduz as fotos para 2000 px no navegador antes de enviar, e os vídeos vão direto ao Cloudinary.

## Rotas da API

Todas começam com `/api`. As marcadas com 🔒 exigem o token de login no cabeçalho `Authorization: Bearer <token>`; as marcadas com 👑, uma conta de administrador. Autores só editam e apagam os projetos que publicaram.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/login` | Recebe `{ email, senha }` (e-mail em branco: senha principal) e devolve `{ token, expiraEm, usuario }` (válido por 7 dias) |
| GET | `/auth/eu` 🔒 | Dados da conta logada |
| POST | `/auth/senha` 🔒 | Troca a própria senha (`{ senhaAtual, novaSenha }`) |
| GET | `/usuarios` 👑 | Lista as contas |
| POST | `/usuarios` 👑 | Cria uma conta (`{ nome, email, papel }`) e devolve a senha temporária |
| PATCH | `/usuarios/:id` 👑 | Muda nome, papel (`admin`/`autor`) ou ativa/desativa |
| POST | `/usuarios/:id/nova-senha` 👑 | Gera uma nova senha temporária |
| GET | `/projetos` | Lista os projetos |
| GET | `/projetos/:id` | Um projeto |
| POST | `/adicionar` 🔒 | Cria um projeto (até 20 imagens no passo a passo e 5 vídeos) |
| PUT | `/projetos/:id` 🔒 | Edita um projeto; imagens e vídeos retirados são apagados do Cloudinary |
| DELETE | `/projetos/:id` 🔒 | Apaga um projeto, suas imagens e seus vídeos |
| POST | `/upload` 🔒 | Envia uma imagem (JPG/PNG, até 10 MB); uma por requisição |
| POST | `/videos/assinatura` 🔒 | Autoriza o navegador a enviar um vídeo (até 100 MB) direto ao Cloudinary |
| POST | `/midias/remover` 🔒 | Apaga imagens e vídeos enviados que não ficaram em nenhum projeto |
| GET | `/backup` 👑 | Baixa todos os projetos num arquivo JSON |
| POST | `/backup/restaurar` 👑 | Recria, a partir de um backup, os projetos que não existem mais (nunca sobrescreve) |

Fora da API, o servidor também responde `/projeto/:id` (a página do site com título, descrição e foto do projeto para a prévia de links), `/sitemap.xml` e `/robots.txt`. No Vercel, essas rotas são encaminhadas ao servidor pelo `vercel.json`.

Vídeos aceitos ao salvar: links do YouTube (`https://www.youtube.com/watch?v=...`) ou vídeos da pasta `videos/` desta conta do Cloudinary. Qualquer outro endereço é recusado.

## Créditos

Idealizado pelo professor Filipp Sena (Universidade do Estado do Amapá — UEAP). Desenvolvido por [João Sena](mailto:joaolsena129@gmail.com).
