import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail, LogOut, Trash2 } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { useClientAuthStore } from "../../store/useClientAuthStore";

export function MyProfile() {
  const navigate = useNavigate();
  const profile = useClientAuthStore((s) => s.profile);
  const authEmail = useClientAuthStore((s) => s.authEmail);
  const updateProfile = useClientAuthStore((s) => s.updateProfile);
  const requestAccountDeletion = useClientAuthStore((s) => s.requestAccountDeletion);
  const signOut = useClientAuthStore((s) => s.signOut);

  const [name, setName] = useState(profile?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    const result = await updateProfile({ name, whatsapp });
    setSaving(false);
    if (!result.ok) {
      setError(result.error || "Não foi possível salvar. Tente novamente.");
      return;
    }
    setSaved(true);
  }

  async function handleDeleteRequest() {
    if (
      !window.confirm(
        "Tem certeza que deseja solicitar a exclusão da sua conta? A administradora vai analisar o pedido."
      )
    )
      return;
    setError("");
    setDeleting(true);
    const result = await requestAccountDeletion();
    setDeleting(false);
    if (!result.ok) setError(result.error || "Não foi possível enviar o pedido agora.");
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-cream-100 pt-28 pb-20">
        <div className="mx-auto max-w-md px-6 sm:px-8">
          <div className="mb-8">
            <span className="text-xs font-semibold tracking-widest uppercase text-rose-600">Minha conta</span>
            <h1 className="mt-2 font-display text-3xl text-rose-900">Meu perfil</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-soft border border-blush-200 p-6 sm:p-8">
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500/60" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-blush-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
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
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full rounded-xl border border-blush-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500/60" />
                  <input
                    value={authEmail ?? ""}
                    disabled
                    className="w-full rounded-xl border border-blush-200 bg-blush-50 pl-10 pr-4 py-2.5 text-sm text-ink-500"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}
              {saved && <p className="text-xs text-green-700">Dados salvos.</p>}

              <button
                type="submit"
                disabled={saving || name.trim().length < 2 || whatsapp.trim().length < 8}
                className="w-full rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </form>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-blush-300 hover:border-rose-400 text-ink-700 font-medium py-2.5 text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>

            {profile?.deletionRequestedAt ? (
              <p className="text-center text-xs text-ink-500">
                Pedido de exclusão enviado em {new Date(profile.deletionRequestedAt).toLocaleDateString("pt-BR")}.
                A administradora vai concluir o processo.
              </p>
            ) : (
              <button
                onClick={handleDeleteRequest}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 hover:border-red-400 text-red-600 font-medium py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> {deleting ? "Enviando..." : "Solicitar exclusão da conta"}
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
