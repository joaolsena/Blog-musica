import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; // Importando Router
import "./App.css";
import ProjetoDetalhes from "./componentes/ProjetoDetalhes"; // Página de detalhes
import EnsineMusica from "./componentes/EnsineMusica"; // Página sobre o Ensine Música
import Navbar from "./componentes/Navbar"; // Navbar principal
import Header from "./componentes/Header"; // Cabeçalho principal
import Projetos from "./componentes/Projetos"; // Página inicial
import AdicionarProjeto from "./componentes/AdicionarProjeto"; // Página de adicionar projeto
import EditProjeto from "./componentes/EditProjeto"; // Página de edição do projeto
import LoginPage from "./componentes/Login"; // Tela de login
import { AuthProvider } from "./componentes/AuthContext"; // Provedor do contexto de autenticação
import PrivateRoute from "./componentes/PrivateRoute"; // Componente para proteger rotas privadas

function App() {
  return (
    // Envolve toda a aplicação com o contexto de autenticação
    <AuthProvider>
      {/* Configuração do Router para habilitar o sistema de navegação */}
      <Router>
        <div className="App">
          {/* Componentes fixos na página, como o cabeçalho e a barra de navegação */}
          <Header />
          <Navbar />

          {/* Configuração das rotas */}
          <Routes>
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

          {/* Rodapé da página */}
          <footer>
            <p>&copy; 2025 Ensine Música. Todos os direitos reservados. Desenvolvido por <a href="mailto:joaolsena129@gmail.com" className="criador">João Sena</a>
            </p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
