import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Globe } from "lucide-react";
import { useClientAuthStore } from "../../store/useClientAuthStore";

export function ClientLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/conta/agendamentos";

  const isAuthenticated = useClientAuthStore((s) => s.isAuthenticated);
  const needsProfile = useClientAuthStore((s) => s.needsProfile);
  const signInWithGoogle = useClientAuthStore((s) => s.signInWithGoogle);
  const signInWithEmail = useClientAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useClientAuthStore((s) => s.signUpWithEmail);

  // Cobre tanto quem já está logada e abriu esta página quanto a volta do
  // redirecionamento do Google (a sessão aparece de forma assíncrona).
  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(needsProfile ? `/conta/completar-perfil?next=${encodeURIComponent(next)}` : next, { replace: true });
  }, [isAuthenticated, needsProfile, navigate, next]);

  const [mode, setMode] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function switchMode(m: "entrar" | "cadastrar") {
    setMode(m);
    setError("");
    setInfo("");
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.ok) setError(result.error ?? "Não foi possível entrar com o Google.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const result =
      mode === "entrar" ? await signInWithEmail(email, password) : await signUpWithEmail(email, password);
    setLoading(false);
    if (!result.ok) {
      const msg = result.error ?? "";
      if (mode === "entrar" && msg.toLowerCase().includes("invalid login credentials")) {
        setError("E-mail ou senha incorretos. Tente novamente.");
      } else if (msg.toLowerCase().includes("user already registered")) {
        setError("Este e-mail já tem uma conta. Tente entrar em vez de cadastrar.");
      } else {
        setError(msg || "Não foi possível concluir. Tente novamente.");
      }
      return;
    }
    if (mode === "cadastrar") {
      setInfo("Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.");
      return;
    }
    navigate(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-600 px-6 py-16 relative">
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm font-medium text-cream-50 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao site
      </Link>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft border border-blush-200 p-8">
        <div className="flex flex-col items-center text-center">
          <img
            src={`${import.meta.env.BASE_URL}images/logo-full.png`}
            alt="Rose Lebarch Nails"
            className="h-20 w-auto object-contain"
          />
          <h1 className="mt-4 font-display text-2xl text-rose-900">Minha conta</h1>
          <p className="mt-1 text-sm text-ink-500">
            {mode === "entrar" ? "Entre para agendar e ver seus horários." : "Crie sua conta para agendar."}
          </p>
        </div>

        <div className="mt-6 flex rounded-full bg-blush-50 p-1 text-sm font-medium">
          <button
            onClick={() => switchMode("entrar")}
            className={`flex-1 rounded-full py-2 transition-colors ${mode === "entrar" ? "bg-white text-rose-700 shadow-soft" : "text-ink-500"}`}
          >
            Entrar
          </button>
          <button
            onClick={() => switchMode("cadastrar")}
            className={`flex-1 rounded-full py-2 transition-colors ${mode === "cadastrar" ? "bg-white text-rose-700 shadow-soft" : "text-ink-500"}`}
          >
            Cadastrar
          </button>
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blush-300 hover:border-rose-400 disabled:opacity-60 text-ink-700 font-medium py-2.5 text-sm transition-colors"
        >
          <Globe className="h-4 w-4" /> {googleLoading ? "Abrindo o Google..." : "Continuar com o Google"}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-blush-200" />
          <span className="text-xs text-ink-500">ou com e-mail</span>
          <div className="h-px flex-1 bg-blush-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-blush-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500/60" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-blush-300 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                autoComplete={mode === "entrar" ? "current-password" : "new-password"}
                minLength={mode === "cadastrar" ? 6 : undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500/60 hover:text-rose-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "cadastrar" && <p className="mt-1.5 text-xs text-ink-500">Mínimo de 6 caracteres.</p>}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {info && <p className="text-xs text-green-700">{info}</p>}

          <button
            type="submit"
            disabled={loading || !password || !email}
            className="w-full rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {loading ? "Aguarde..." : mode === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
