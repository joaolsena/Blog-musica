import axios from "axios";

// Endereço do servidor (backend).
// - Em produção (Vercel): site e servidor ficam no mesmo endereço, então fica
//   vazio. Só defina VITE_API_URL se o servidor for para outro endereço; como o
//   valor é embutido no site durante o build, é preciso publicar de novo depois.
// - No computador: deixe vazio. As chamadas vão para /api e o servidor de
//   desenvolvimento repassa para http://localhost:4000 (proxy em vite.config.js).
const urlServidor = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

axios.defaults.baseURL = `${urlServidor}/api`;
