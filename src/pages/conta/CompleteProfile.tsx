import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { User, Phone } from "lucide-react";
import { useClientAuthStore } from "../../store/useClientAuthStore";
import { formatPhoneBR, isValidPhoneBR } from "../../utils/phone";

export function CompleteProfile() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/conta/agendamentos";
  const isAuthenticated = useClientAuthStore((s) => s.isAuthenticated);
  const needsProfile = useClientAuthStore((s) => s.needsProfile);
  const completeProfile = useClientAuthStore((s) => s.completeProfile);
  const authEmail = useClientAuthStore((s) => s.authEmail);

  useEffect(() => {
    if (isAuthenticated && !needsProfile) navigate(next, { replace: true });
  }, [isAuthenticated, needsProfile, navigate, next]);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await completeProfile(name, whatsapp);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Não foi possível salvar. Tente novamente.");
      return;
    }
    navigate(next);
  }

  if (!isAuthenticated) {
    return <Navigate to={`/conta/entrar?next=${encodeURIComponent(next)}`} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-600 px-6 py-16">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft border border-blush-200 p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl text-rose-900">Complete seu cadastro</h1>
          <p className="mt-1 text-sm text-ink-500">
            Só mais um passo{authEmail ? ` para ${authEmail}` : ""}. Precisamos do seu nome e WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500/60" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-xl border border-blush-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                autoFocus
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500/60" />
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
                placeholder="(31) 99509-3346"
                inputMode="numeric"
                className="w-full rounded-xl border border-blush-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || name.trim().length < 2 || !isValidPhoneBR(whatsapp)}
            className="w-full rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {loading ? "Salvando..." : "Concluir cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}
