import React, { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";
import ProjetoDetalhes from "./componentes/ProjetoDetalhes"; // Página de detalhes
import Navbar from "./componentes/Navbar"; // Cabeçalho e navegação principal
import Footer from "./componentes/Footer"; // Rodapé
import Projetos from "./componentes/Projetos"; // Página inicial
import NaoEncontrado from "./componentes/NaoEncontrado"; // Página 404 (a de projeto também usa)
import { AuthProvider } from "./componentes/AuthContext"; // Provedor do contexto de autenticação
import PrivateRoute from "./componentes/PrivateRoute"; // Componente para proteger rotas privadas
import { TemaProvider, useTema } from "./componentes/Tema"; // Tema claro/escuro
import { CarregandoPagina, LimiteDeErro } from "./componentes/LimiteDeErro"; // Tela de erro

// As outras páginas vêm em arquivos à parte, baixados só quando alguém abre a página.
// A inicial e a de um projeto (a que mais chega por links compartilhados) já vêm junto.
// O service worker guarda todos esses arquivos na primeira visita, para abrir sem internet.
const EnsineMusica = lazy(() => import("./componentes/EnsineMusica")); // Página sobre o Ensine Música
const AdicionarProjeto = lazy(() => import("./componentes/AdicionarProjeto")); // Adicionar projeto
const EditProjeto = lazy(() => import("./componentes/EditProjeto")); // Editar projeto
const Backup = lazy(() => import("./componentes/Backup")); // Backup (administradores)
const Contas = lazy(() => import("./componentes/Contas")); // Contas de professores e alunos (administradores)
const MinhaConta = lazy(() => import("./componentes/MinhaConta")); // Dados e senha da própria conta
const Planos = lazy(() => import("./componentes/Planos")); // Lista de planos de aula
const PlanoDetalhes = lazy(() => import("./componentes/PlanoDetalhes")); // Página de um plano de aula
const FormPlano = lazy(() => import("./componentes/FormPlano")); // Escrever ou editar um plano de aula
const Forum = lazy(() => import("./componentes/Forum")); // Fórum: lista de tópicos
const TopicoForum = lazy(() => import("./componentes/TopicoForum")); // Um tópico do fórum com as respostas
const Moderacao = lazy(() => import("./componentes/Moderacao")); // Aprovar comentários e tópicos de visitantes
const Privacidade = lazy(() => import("./componentes/Privacidade")); // O que o site guarda e por quê
const LoginPage = lazy(() => import("./componentes/Login")); // Tela de login

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
    // O limite de erro também é por página: ao navegar, um erro numa página não segue para a próxima
    <div className="page" key={location.pathname}>
      <LimiteDeErro>
      <Suspense fallback={<CarregandoPagina />}>
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
      </Suspense>
      </LimiteDeErro>
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
