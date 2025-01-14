# Blog de Música

Bem-vindo ao **Blog de Música**, um projeto desenvolvido para que alunos possam compartilhar e visualizar seus trabalhos musicais. Este blog oferece uma interface amigável para envio de projetos, exploração de conteúdo e aprendizado colaborativo.

Acesse o projeto em: [ensinemusica.netlify.app](https://ensinemusica.netlify.app)

## Tecnologias Utilizadas

- **Frontend**: React.js
- **Backend**: Node.js com Express
- **Gerenciamento de Pacotes**: npm
- **Estilização**: CSS
- **Banco de Dados**: MongoDB

## Funcionalidades Principais

- Cadastro de novos trabalhos musicais por alunos.
- Listagem e visualização dos trabalhos enviados.
- Interface intuitiva e responsiva.

## Como Rodar o Projeto

### Requisitos:

- Node.js (v16 ou superior)
- npm (v7 ou superior)
- MongoDB

### Passos para Executar:

1. Clone o repositório:

   ```bash
   git clone <URL_DO_REPOSITORIO>
   ```

2. Navegue até o diretório do frontend:

   ```bash
   cd blog-musica/blog-alunos
   ```

3. Instale as dependências do projeto:

   ```bash
   npm install
   ```

4. Inicie o servidor de desenvolvimento do frontend:

   ```bash
   npm start
   ```

5. Navegue até o diretório do backend:

   ```bash
   cd ../server
   ```

6. Instale as dependências do backend:

   ```bash
   npm install
   ```

7. Configure o banco de dados MongoDB (variáveis de ambiente no arquivo `.env`):

   ```env
   MONGO_URI=mongodb://localhost:27017/blogMusica
   PORT=5000
   ```

8. Inicie o servidor backend:

   ```bash
   node server.js
   ```

9. Acesse o projeto no navegador em `http://localhost:3000`.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

