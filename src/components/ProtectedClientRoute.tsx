import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useClientAuthStore } from "../store/useClientAuthStore";

export function ProtectedClientRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useClientAuthStore((s) => s.isAuthenticated);
  const needsProfile = useClientAuthStore((s) => s.needsProfile);

  if (!isAuthenticated) {
    return <Navigate to={`/conta/entrar?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (needsProfile) {
    return <Navigate to={`/conta/completar-perfil?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}
