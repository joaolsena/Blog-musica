import axios from "axios";

// Endereço do servidor (backend).
// - Em produção: defina REACT_APP_API_URL no serviço onde o site é publicado
//   (ex.: https://ensine-musica-api.onrender.com). Como o valor é embutido no
//   site durante o build, é preciso publicar de novo depois de mudá-lo.
// - No computador: deixe vazio. As chamadas vão para /api e o servidor de
//   desenvolvimento repassa para http://localhost:4000 (campo "proxy" do package.json).
const urlServidor = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

axios.defaults.baseURL = `${urlServidor}/api`;
