# Ensine Música

Blog de educação musical com tutoriais de instrumentos e jogos musicais feitos com materiais alternativos, criados por estudantes para inspirar professores de música.

Site: [ensine-musica.vercel.app](https://ensine-musica.vercel.app)

## Funcionalidades

- Lista de projetos com busca e filtro por tipo (instrumento ou jogo)
- Página de cada projeto: materiais, passo a passo com até 20 fotos, vídeos (link do YouTube ou arquivo enviado), instruções de uso e aplicação didática
- Botão de compartilhar: menu nativo do celular (WhatsApp, Instagram etc.) ou, no computador, WhatsApp, Telegram, Facebook, e-mail e "copiar link"
- Área do professor, protegida por senha, para publicar, editar e apagar projetos e suas fotos
- Modo claro e escuro, layout para computador e celular
- Instalável como app (iPhone, iPad, Android, Mac e Windows): botão discreto no cabeçalho e no rodapé. No Chrome e no Edge abre a janela de instalação do sistema; no Safari e nos outros, mostra o passo a passo. Depois de instalado, abre sem internet o que já foi visto

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
| `ADMIN_PASSWORD` | sim | Senha da área do professor |
| `TOKEN_SECRET` | sim | Chave que assina os tokens de login |
| `CORS_ORIGIN` | não | Restringe quais sites podem chamar a API |
| `PORT` | não | Porta do servidor (padrão 4000) |

Sem `ADMIN_PASSWORD` e `TOKEN_SECRET`, o site continua mostrando os projetos, mas ninguém consegue publicar, editar ou apagar.

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

No Vercel, cada envio ao servidor tem limite de 4,5 MB. Por isso o site reduz as fotos para 2000 px no navegador antes de enviar, e os vídeos vão direto ao Cloudinary.

## Rotas da API

Todas começam com `/api`. As marcadas com 🔒 exigem o token de login no cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/login` | Recebe `{ senha }` e devolve `{ token, expiraEm }` (válido por 7 dias) |
| GET | `/projetos` | Lista os projetos |
| GET | `/projetos/:id` | Um projeto |
| POST | `/adicionar` 🔒 | Cria um projeto (até 20 imagens no passo a passo e 5 vídeos) |
| PUT | `/projetos/:id` 🔒 | Edita um projeto; imagens e vídeos retirados são apagados do Cloudinary |
| DELETE | `/projetos/:id` 🔒 | Apaga um projeto, suas imagens e seus vídeos |
| POST | `/upload` 🔒 | Envia uma imagem (JPG/PNG, até 10 MB); uma por requisição |
| POST | `/videos/assinatura` 🔒 | Autoriza o navegador a enviar um vídeo (até 100 MB) direto ao Cloudinary |
| POST | `/midias/remover` 🔒 | Apaga imagens e vídeos enviados que não ficaram em nenhum projeto |

Vídeos aceitos ao salvar: links do YouTube (`https://www.youtube.com/watch?v=...`) ou vídeos da pasta `videos/` desta conta do Cloudinary. Qualquer outro endereço é recusado.

## Créditos

Idealizado pelo professor Filipp Sena (Universidade do Estado do Amapá — UEAP). Desenvolvido por [João Sena](mailto:joaolsena129@gmail.com).
