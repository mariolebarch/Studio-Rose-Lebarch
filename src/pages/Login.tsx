import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { TurnstileWidget } from "../components/TurnstileWidget";

export function Login() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const verifyMfaLogin = useAppStore((s) => s.verifyMfaLogin);
  const cancelMfaLogin = useAppStore((s) => s.cancelMfaLogin);
  const mfaPending = useAppStore((s) => s.mfaPending);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [mfaCode, setMfaCode] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!captchaToken) {
      setError("Confirme a verificação de segurança antes de continuar.");
      return;
    }
    setError("");
    setLoading(true);
    const result = await login(email.trim(), password, captchaToken);
    setLoading(false);
    setCaptchaToken(null);
    setTurnstileResetKey((k) => k + 1);
    if (result.ok && result.mfaRequired) {
      return;
    }
    if (result.ok) {
      navigate("/admin");
    } else if (result.error && !result.error.toLowerCase().includes("invalid login credentials")) {
      setError(result.error);
    } else {
      setError("E-mail ou senha incorretos. Tente novamente.");
    }
  }

  async function handleVerifyMfa(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await verifyMfaLogin(mfaCode.trim());
    setLoading(false);
    if (result.ok) {
      navigate("/admin");
    } else {
      setError(result.error ?? "Código inválido. Tente novamente.");
      setMfaCode("");
    }
  }

  async function handleCancelMfa() {
    setLoading(true);
    await cancelMfaLogin();
    setLoading(false);
    setMfaCode("");
    setError("");
  }

  if (mfaPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blush-100 via-cream-100 to-blush-200 px-6 py-16 relative">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft border border-blush-200 p-8">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-blush-100 flex items-center justify-center text-rose-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-2xl text-rose-900">Verificação em duas etapas</h1>
            <p className="mt-1 text-sm text-ink-500">
              Digite o código de 6 dígitos do seu aplicativo autenticador.
            </p>
          </div>

          <form onSubmit={handleVerifyMfa} className="mt-8 space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              autoFocus
              required
              className="w-full rounded-xl border border-blush-300 px-4 py-2.5 text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
            />

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
            >
              {loading ? "Verificando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={handleCancelMfa}
              disabled={loading}
              className="w-full text-center text-xs text-ink-500 hover:text-rose-600 transition-colors"
            >
              Cancelar e voltar ao login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blush-100 via-cream-100 to-blush-200 px-6 py-16 relative">
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-rose-600 transition-colors"
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
          <h1 className="mt-4 font-display text-2xl text-rose-900">Área da profissional</h1>
          <p className="mt-1 text-sm text-ink-500">Entre para gerenciar sua agenda e horários.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Senha de acesso</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500/60" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-blush-300 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
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
          </div>

          <TurnstileWidget onToken={setCaptchaToken} resetKey={turnstileResetKey} />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || !email || !captchaToken}
            className="w-full rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
