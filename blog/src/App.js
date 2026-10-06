import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";
import ProjetoDetalhes from "./componentes/ProjetoDetalhes"; // Página de detalhes
import EnsineMusica from "./componentes/EnsineMusica"; // Página sobre o Ensine Música
import Navbar from "./componentes/Navbar"; // Cabeçalho e navegação principal
import Footer from "./componentes/Footer"; // Rodapé
import Projetos from "./componentes/Projetos"; // Página inicial
import AdicionarProjeto from "./componentes/AdicionarProjeto"; // Página de adicionar projeto
import EditProjeto from "./componentes/EditProjeto"; // Página de edição do projeto
import LoginPage from "./componentes/Login"; // Tela de login
import { AuthProvider } from "./componentes/AuthContext"; // Provedor do contexto de autenticação
import PrivateRoute from "./componentes/PrivateRoute"; // Componente para proteger rotas privadas

// Conteúdo das rotas. Fica separado do App porque precisa estar dentro do Router
// para usar useLocation.
function Paginas() {
  const location = useLocation();

  // Ao trocar de página, volta ao topo (o navegador não faz isso sozinho numa SPA)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    // A key faz a página remontar a cada navegação, disparando a transição de entrada
    <div className="page" key={location.pathname}>
      <Routes location={location}>
        {/* Página inicial com a lista de projetos */}
        <Route path="/" element={<Projetos />} />

        {/* Página de detalhes de um projeto */}
        <Route path="/projeto/:id" element={<ProjetoDetalhes />} />

        {/* Página sobre o Ensine Música */}
        <Route path="/Ensine-Musica" element={<EnsineMusica />} />

        {/* Página de login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Página protegida para adicionar um projeto */}
        <Route
          path="/adicionar-projeto"
          element={
            <PrivateRoute>
              <AdicionarProjeto />
            </PrivateRoute>
          }
        />

        {/* Página protegida para editar um projeto */}
        <Route
          path="/editar-projeto/:id"
          element={
            <PrivateRoute>
              <EditProjeto />
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    // Envolve toda a aplicação com o contexto de autenticação
    <AuthProvider>
      <Router>
        <div className="app">
          <a href="#conteudo-principal" className="skip-link">
            Pular para o conteúdo
          </a>

          <Navbar />

          <main id="conteudo-principal" className="app__main">
            <Paginas />
          </main>

          <Footer />

          <Toaster
            position="bottom-center"
            theme="system"
            toastOptions={{ className: "toast" }}
            offset={24}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
