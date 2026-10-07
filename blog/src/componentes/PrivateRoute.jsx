import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// apenasAdmin: páginas de administração (contas, backup); autores voltam para o início
const PrivateRoute = ({ children, apenasAdmin = false }) => {
  const { isAuthenticated, ehAdmin } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (apenasAdmin && !ehAdmin) return <Navigate to="/" />;
  return children;
};

export default PrivateRoute;
