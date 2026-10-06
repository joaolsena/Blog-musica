# Ensine Música

Blog de educação musical com tutoriais de instrumentos e jogos musicais feitos com materiais alternativos, criados por estudantes para inspirar professores de música.

Site: [ensinemusica.netlify.app](https://ensinemusica.netlify.app)

## Funcionalidades

- Lista de projetos com busca e filtro por tipo (instrumento ou jogo)
- Página de cada projeto: materiais, passo a passo com fotos, instruções de uso e aplicação didática
- Área do professor, protegida por senha, para publicar, editar e apagar projetos e suas fotos
- Modo claro e escuro, layout para computador e celular

## Tecnologias

| Parte | Tecnologias |
| --- | --- |
| Site (`blog/`) | React 18, React Router, Axios, Sonner (avisos) |
| Servidor (`server/`) | Node.js 22, Express, Mongoose, Multer |
| Banco de dados | MongoDB Atlas |
| Imagens | Cloudinary |
| Publicação | Netlify (site) e um serviço Node para o servidor (ex.: Render) |

## Estrutura

```
blog/                  site em React
  public/              index.html, ícones e imagem de prévia de links
  src/
    api.js             endereço do servidor
    componentes/       páginas e componentes
  .env.production      endereço público do site (prévia de links)
server/
  server.js            API (rotas em /api)
  server.test.js       testes da API
  .env.example         modelo das variáveis de ambiente
netlify.toml           como o Netlify compila o site
```

## Como rodar no computador

Requisitos: Node.js 22 e npm.

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
npm start              # abre http://localhost:3000
```

No computador, o site repassa as chamadas de `/api` para o servidor na porta 4000 (campo `proxy` do `blog/package.json`), então não é preciso configurar o endereço do servidor.

## Variáveis de ambiente

**Servidor** (`server/.env` no computador; painel do serviço de hospedagem em produção):

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `MONGO_URI` | sim | Conexão com o MongoDB Atlas |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | sim | Envio e remoção de imagens |
| `ADMIN_PASSWORD` | sim | Senha da área do professor |
| `TOKEN_SECRET` | sim | Chave que assina os tokens de login |
| `CORS_ORIGIN` | não | Restringe quais sites podem chamar a API |
| `PORT` | não | Porta do servidor (padrão 4000) |

Sem `ADMIN_PASSWORD` e `TOKEN_SECRET`, o site continua mostrando os projetos, mas ninguém consegue publicar, editar ou apagar.

**Site** (painel do Netlify):

| Variável | Para que serve |
| --- | --- |
| `REACT_APP_API_URL` | Endereço do servidor em produção, ex.: `https://ensine-musica-api.onrender.com` |
| `REACT_APP_SITE_URL` | Endereço do site, usado na prévia de links do WhatsApp. Já definido em `blog/.env.production` |

As variáveis `REACT_APP_*` são embutidas no site durante a compilação: depois de mudar uma delas, publique o site de novo. Nunca coloque senhas nelas — elas ficam visíveis no código do site.

## Testes

```bash
cd blog && npm test       # site: componentes, filtros, busca, 404, login
cd server && npm test     # servidor: login, permissões, limites de envio de imagens
```

Os testes não acessam o banco de dados nem o Cloudinary.

## Publicação

**Site (Netlify):** o `netlify.toml` já diz ao Netlify para compilar a pasta `blog`. Basta definir `REACT_APP_API_URL` no painel (Site configuration → Environment variables) e publicar.

**Servidor:** em um serviço que rode Node.js (ex.: Render), use a pasta `server` como raiz, `npm install` como comando de instalação e `npm start` como comando de início, e cadastre as variáveis da tabela do servidor.

## Rotas da API

Todas começam com `/api`. As marcadas com 🔒 exigem o token de login no cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/login` | Recebe `{ senha }` e devolve `{ token, expiraEm }` (válido por 7 dias) |
| GET | `/projetos` | Lista os projetos |
| GET | `/projetos/:id` | Um projeto |
| POST | `/adicionar` 🔒 | Cria um projeto |
| PUT | `/projetos/:id` 🔒 | Edita um projeto; imagens retiradas são apagadas do Cloudinary |
| DELETE | `/projetos/:id` 🔒 | Apaga um projeto e suas imagens |
| POST | `/upload` 🔒 | Envia a imagem principal (JPG/PNG, até 10 MB) |
| POST | `/upload-multiplas` 🔒 | Envia até 4 imagens do passo a passo |
| POST | `/imagens/remover` 🔒 | Apaga imagens enviadas que não ficaram em nenhum projeto |

## Créditos

Idealizado pelo professor Filipp Sena (Universidade do Estado do Amapá — UEAP). Desenvolvido por [João Sena](mailto:joaolsena129@gmail.com).
