import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { supabase } from "../../lib/supabaseClient";

export function AdminSettings() {
  const changePassword = useAppStore((s) => s.changePassword);
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (next.length < 6) {
      setMessage({ type: "error", text: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (next !== confirmNext) {
      setMessage({ type: "error", text: "A confirmação não coincide com a nova senha." });
      return;
    }
    setLoading(true);
    const result = await changePassword(next);
    setLoading(false);
    if (result.ok) {
      setMessage({ type: "success", text: "Senha alterada com sucesso!" });
      setNext("");
      setConfirmNext("");
    } else {
      setMessage({ type: "error", text: result.error ?? "Não foi possível alterar a senha." });
    }
  }

  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-rose-900">Configurações</h1>
        <p className="text-sm text-ink-500 mt-1">Altere a senha e a verificação em duas etapas do seu acesso.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-blush-200 p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-9 w-9 rounded-full bg-blush-100 flex items-center justify-center text-rose-600">
            <KeyRound className="h-4 w-4" />
          </div>
          <h2 className="font-display text-lg text-rose-800">Trocar senha</h2>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Nova senha</label>
          <input
            type="password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Confirmar nova senha</label>
          <input
            type="password"
            required
            value={confirmNext}
            onChange={(e) => setConfirmNext(e.target.value)}
            className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
          />
        </div>

        {message && (
          <p className={`text-xs ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>{message.text}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>

      <TwoFactorSection />
    </div>
  );
}

function TwoFactorSection() {
  const mfaEnrolled = useAppStore((s) => s.mfaEnrolled);
  const refreshMfaStatus = useAppStore((s) => s.refreshMfaStatus);
  const startMfaEnrollment = useAppStore((s) => s.startMfaEnrollment);
  const confirmMfaEnrollment = useAppStore((s) => s.confirmMfaEnrollment);
  const unenrollMfa = useAppStore((s) => s.unenrollMfa);

  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    refreshMfaStatus();
  }, [refreshMfaStatus]);

  async function handleStart() {
    setMessage(null);
    setLoading(true);
    const result = await startMfaEnrollment();
    setLoading(false);
    if (!result.ok || !result.qrCode || !result.factorId) {
      setMessage({ type: "error", text: result.error ?? "Não foi possível iniciar o cadastro do 2FA." });
      return;
    }
    setQrCode(result.qrCode);
    setSecret(result.secret ?? null);
    setFactorId(result.factorId);
    setEnrolling(true);
  }

  async function handleCancelEnroll() {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
    setMessage(null);
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setMessage(null);
    setLoading(true);
    const result = await confirmMfaEnrollment(factorId, code.trim());
    setLoading(false);
    if (result.ok) {
      setEnrolling(false);
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setCode("");
      setMessage({ type: "success", text: "Verificação em duas etapas ativada com sucesso!" });
    } else {
      setMessage({ type: "error", text: result.error ?? "Código inválido." });
      setCode("");
    }
  }

  async function handleDisable() {
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.find((f) => f.status === "verified");
    if (!factor) return;
    setMessage(null);
    setLoading(true);
    const result = await unenrollMfa(factor.id);
    setLoading(false);
    setMessage(
      result.ok
        ? { type: "success", text: "Verificação em duas etapas desativada." }
        : { type: "error", text: result.error ?? "Não foi possível desativar." }
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-blush-200 p-6 shadow-soft space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-9 w-9 rounded-full bg-blush-100 flex items-center justify-center text-rose-600">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h2 className="font-display text-lg text-rose-800">Verificação em duas etapas (2FA)</h2>
      </div>

      <p className="text-xs text-ink-500">
        Adiciona uma segunda camada de segurança: além da senha, um código de 6 dígitos gerado por um
        aplicativo autenticador (Google Authenticator, Authy, etc.) é exigido a cada login.
      </p>

      {!enrolling && (
        <>
          {message && (
            <p className={`text-xs ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>
              {message.text}
            </p>
          )}
          {mfaEnrolled ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm text-green-700 font-medium">2FA está ativado nesta conta.</p>
              <button
                onClick={handleDisable}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60 text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                <ShieldOff className="h-3.5 w-3.5" /> Desativar
              </button>
            </div>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              <Smartphone className="h-4 w-4" /> {loading ? "Preparando..." : "Ativar 2FA"}
            </button>
          )}
        </>
      )}

      {enrolling && qrCode && (
        <form onSubmit={handleConfirm} className="space-y-4">
          <p className="text-sm text-ink-700">
            Escaneie o QR code com seu aplicativo autenticador e digite o código gerado para confirmar.
          </p>
          <div className="flex justify-center">
            <img src={qrCode} alt="QR code para configurar o 2FA" className="h-44 w-44 rounded-lg border border-blush-200" />
          </div>
          {secret && (
            <p className="text-xs text-ink-500 text-center break-all">
              Não conseguiu escanear? Digite manualmente esta chave: <span className="font-mono">{secret}</span>
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            autoFocus
            required
            className="w-full rounded-xl border border-blush-300 px-4 py-2.5 text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
          {message && (
            <p className={`text-xs ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>
              {message.text}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
            >
              {loading ? "Confirmando..." : "Confirmar e ativar"}
            </button>
            <button
              type="button"
              onClick={handleCancelEnroll}
              disabled={loading}
              className="rounded-full border border-blush-300 text-ink-700 text-sm font-medium px-5 py-2.5 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
