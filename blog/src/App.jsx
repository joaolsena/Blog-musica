import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";
import ProjetoDetalhes from "./componentes/ProjetoDetalhes"; // Página de detalhes
import EnsineMusica from "./componentes/EnsineMusica"; // Página sobre o Ensine Música
import Navbar from "./componentes/Navbar"; // Cabeçalho e navegação principal
import Footer from "./componentes/Footer"; // Rodapé
import Projetos from "./componentes/Projetos"; // Página inicial
import AdicionarProjeto from "./componentes/AdicionarProjeto"; // Página de adicionar projeto
import EditProjeto from "./componentes/EditProjeto"; // Página de edição do projeto
import Backup from "./componentes/Backup"; // Backup dos projetos (área do professor)
import Contas from "./componentes/Contas"; // Contas de professores e alunos (administradores)
import MinhaConta from "./componentes/MinhaConta"; // Dados e senha da própria conta
import Planos from "./componentes/Planos"; // Lista de planos de aula
import PlanoDetalhes from "./componentes/PlanoDetalhes"; // Página de um plano de aula
import FormPlano from "./componentes/FormPlano"; // Escrever ou editar um plano de aula
import Forum from "./componentes/Forum"; // Fórum: lista de tópicos
import TopicoForum from "./componentes/TopicoForum"; // Um tópico do fórum com as respostas
import Moderacao from "./componentes/Moderacao"; // Aprovar comentários e tópicos de visitantes
import Privacidade from "./componentes/Privacidade"; // O que o site guarda e por quê
import LoginPage from "./componentes/Login"; // Tela de login
import { AuthProvider } from "./componentes/AuthContext"; // Provedor do contexto de autenticação
import PrivateRoute from "./componentes/PrivateRoute"; // Componente para proteger rotas privadas
import { TemaProvider, useTema } from "./componentes/Tema"; // Tema claro/escuro
import NaoEncontrado from "./componentes/NaoEncontrado"; // Página 404

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

        {/* Planos de aula */}
        <Route path="/planos" element={<Planos />} />
        <Route path="/plano/:id" element={<PlanoDetalhes />} />
        <Route
          path="/novo-plano"
          element={
            <PrivateRoute>
              <FormPlano />
            </PrivateRoute>
          }
        />
        <Route
          path="/editar-plano/:id"
          element={
            <PrivateRoute>
              <FormPlano />
            </PrivateRoute>
          }
        />

        {/* Fórum */}
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/:id" element={<TopicoForum />} />

        {/* Moderação dos comentários e tópicos de visitantes (qualquer conta) */}
        <Route
          path="/moderacao"
          element={
            <PrivateRoute>
              <Moderacao />
            </PrivateRoute>
          }
        />

        {/* Privacidade (LGPD) */}
        <Route path="/privacidade" element={<Privacidade />} />

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

        {/* Página protegida de backup dos projetos */}
        <Route
          path="/backup"
          element={
            <PrivateRoute apenasAdmin>
              <Backup />
            </PrivateRoute>
          }
        />

        {/* Contas: a própria (todos) e o gerenciamento (administradores) */}
        <Route
          path="/minha-conta"
          element={
            <PrivateRoute>
              <MinhaConta />
            </PrivateRoute>
          }
        />
        <Route
          path="/contas"
          element={
            <PrivateRoute apenasAdmin>
              <Contas />
            </PrivateRoute>
          }
        />

        {/* Qualquer outro endereço */}
        <Route path="*" element={<NaoEncontrado />} />
      </Routes>
    </div>
  );
}

// Avisos (Sonner) seguindo o tema escolhido no site
function Avisos() {
  const { tema } = useTema();
  return (
    <Toaster
      position="bottom-center"
      theme={tema}
      toastOptions={{ className: "toast" }}
      offset={24}
    />
  );
}

function App() {
  return (
    // Envolve toda a aplicação com o contexto de autenticação
    <TemaProvider>
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

            <Avisos />
          </div>
        </Router>
      </AuthProvider>
    </TemaProvider>
  );
}

export default App;
