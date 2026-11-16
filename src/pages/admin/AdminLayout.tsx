import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Ban,
  Sparkles,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import { Monogram } from "../../components/decor/Icons";
import { useAppStore } from "../../store/useAppStore";

export function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const currentProfessional = useAppStore((s) => s.currentProfessional);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const mfaEnrolled = useAppStore((s) => s.mfaEnrolled);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: "/admin", label: "Painel", icon: LayoutDashboard, end: true },
    { to: "/admin/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/admin/bloqueios", label: "Bloqueios", icon: Ban },
    { to: "/admin/servicos", label: "Serviços", icon: Sparkles },
    { to: "/admin/horarios", label: "Horário de funcionamento", icon: Clock },
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ...(isAdmin
      ? [
          { to: "/admin/profissionais", label: "Profissionais", icon: Users },
          { to: "/admin/auditoria", label: "Auditoria", icon: ClipboardList },
        ]
      : []),
  ];

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-cream-100 flex">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-rose-900 text-blush-100 min-h-screen sticky top-0">
        <SidebarContent
          navItems={navItems}
          professionalName={currentProfessional?.name}
          onNavigate={() => {}}
          onLogout={handleLogout}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-rose-900 text-blush-100 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="self-end p-4 text-blush-100"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              navItems={navItems}
              professionalName={currentProfessional?.name}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-blush-200 px-5 h-16 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5 text-rose-800" />
          </button>
          <span className="font-display text-rose-800">Painel administrativo</span>
          <div className="w-5" />
        </header>
        <main className="p-5 sm:p-8 max-w-6xl mx-auto">
          {isAdmin && !mfaEnrolled && (
            <Link
              to="/admin/configuracoes"
              className="mb-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Sua conta ainda não tem verificação em duas etapas (2FA) ativada. Recomendamos ativar em Configurações.
            </Link>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

function SidebarContent({
  navItems,
  professionalName,
  onNavigate,
  onLogout,
}: {
  navItems: NavItem[];
  professionalName?: string;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <Link to="/" className="flex items-center gap-2 px-6 py-6">
        <Monogram variant="light" className="h-9 w-9" />
        <div>
          <p className="font-display text-base text-cream-50 leading-tight">{professionalName ?? "Studio Rosely"}</p>
          <p className="text-[11px] text-blush-200/70">Painel administrativo</p>
        </div>
      </Link>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-rose-700 text-white" : "text-blush-200/80 hover:bg-rose-800/60 hover:text-white"
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-6 pt-3 border-t border-rose-800/60 mt-3">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-blush-200/80 hover:bg-rose-800/60 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </>
  );
}
