import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Booking } from "./pages/Booking";
import { Login } from "./pages/Login";
import { ProtectedRoute, AdminOnlyRoute } from "./components/ProtectedRoute";
import { ProtectedClientRoute } from "./components/ProtectedClientRoute";
import { ClientLogin } from "./pages/conta/ClientLogin";
import { CompleteProfile } from "./pages/conta/CompleteProfile";
import { MyAppointments } from "./pages/conta/MyAppointments";
import { MyProfile } from "./pages/conta/MyProfile";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminAgenda } from "./pages/admin/AdminAgenda";
import { AdminBlocking } from "./pages/admin/AdminBlocking";
import { AdminServices } from "./pages/admin/AdminServices";
import { AdminHours } from "./pages/admin/AdminHours";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminProfessionals } from "./pages/admin/AdminProfessionals";
import { useAppStore } from "./store/useAppStore";
import { useClientAuthStore } from "./store/useClientAuthStore";
import { Monogram } from "./components/decor/Icons";

function App() {
  const ready = useAppStore((s) => s.ready);
  const clientReady = useClientAuthStore((s) => s.ready);

  useEffect(() => {
    useAppStore.getState().init();
    useClientAuthStore.getState().init();
  }, []);

  if (!ready || !clientReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <Monogram className="h-12 w-12 animate-pulse" />
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/agendar"
          element={
            <ProtectedClientRoute>
              <Booking />
            </ProtectedClientRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/conta/entrar" element={<ClientLogin />} />
        <Route path="/conta/completar-perfil" element={<CompleteProfile />} />
        <Route
          path="/conta/agendamentos"
          element={
            <ProtectedClientRoute>
              <MyAppointments />
            </ProtectedClientRoute>
          }
        />
        <Route
          path="/conta/perfil"
          element={
            <ProtectedClientRoute>
              <MyProfile />
            </ProtectedClientRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="agenda" element={<AdminAgenda />} />
          <Route path="bloqueios" element={<AdminBlocking />} />
          <Route path="servicos" element={<AdminServices />} />
          <Route path="horarios" element={<AdminHours />} />
          <Route path="configuracoes" element={<AdminSettings />} />
          <Route
            path="profissionais"
            element={
              <AdminOnlyRoute>
                <AdminProfessionals />
              </AdminOnlyRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
