import React from "react";
import ReactDOM from "react-dom/client";
import "./api"; // configura o endereço do servidor antes de qualquer requisição
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker: permite instalar o site como app e abrir sem internet o que já foi
// visto (veja public/sw.js). Só em produção, para não guardar arquivos do modo dev.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((erro) => console.error("Service worker:", erro));
  });
}
