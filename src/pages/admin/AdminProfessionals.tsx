import { useState, type FormEvent } from "react";
import { UserPlus, ShieldCheck, User, Info, Pencil, X, Check, Copy, Trash2 } from "lucide-react";
import { useAppStore, type Professional } from "../../store/useAppStore";
import { formatPhoneBR, isValidPhoneBR } from "../../utils/phone";

const emptyForm = { name: "", email: "", whatsapp: "", infiniteTag: "", role: "staff" as "admin" | "staff" };

export function AdminProfessionals() {
  const professionals = useAppStore((s) => s.professionals);
  const addProfessional = useAppStore((s) => s.addProfessional);
  const updateProfessional = useAppStore((s) => s.updateProfessional);
  const removeProfessional = useAppStore((s) => s.removeProfessional);

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<{ name: string; password: string } | null>(null);
  const [loginWarning, setLoginWarning] = useState("");
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", whatsapp: "", infiniteTag: "", role: "staff" as "admin" | "staff" });
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setGeneratedPassword(null);
    setLoginWarning("");
    if (form.name.trim().length < 2) {
      setError("Informe o nome da profissional.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!isValidPhoneBR(form.whatsapp)) {
      setError("Informe um WhatsApp válido, com DDD.");
      return;
    }
    setSubmitting(true);
    const result = await addProfessional({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      whatsapp: form.whatsapp,
      infiniteTag: form.infiniteTag,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível adicionar a profissional.");
      return;
    }
    if (result.temporaryPassword) {
      setGeneratedPassword({ name: form.name.trim(), password: result.temporaryPassword });
    } else if (result.loginWarning) {
      setLoginWarning(result.loginWarning);
    }
    setForm(emptyForm);
  }

  function startEdit(p: Professional) {
    setEditingId(p.id);
    setEditForm({ name: p.name, whatsapp: formatPhoneBR(p.whatsapp), infiniteTag: p.infiniteTag ?? "", role: p.role });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function handleSaveEdit(id: string) {
    setEditError("");
    if (editForm.name.trim().length < 2) {
      setEditError("Informe o nome da profissional.");
      return;
    }
    if (!isValidPhoneBR(editForm.whatsapp)) {
      setEditError("Informe um WhatsApp válido, com DDD.");
      return;
    }
    setEditSubmitting(true);
    const result = await updateProfessional(id, {
      name: editForm.name.trim(),
      whatsapp: editForm.whatsapp,
      infiniteTag: editForm.infiniteTag,
      role: editForm.role,
    });
    setEditSubmitting(false);
    if (!result.ok) {
      setEditError(result.error ?? "Não foi possível salvar as alterações.");
      return;
    }
    setEditingId(null);
  }

  async function handleDelete(p: Professional) {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir ${p.name}? Os serviços, horários e bloqueios dela também serão apagados. Isso não pode ser desfeito.`
      )
    )
      return;
    setDeleteError("");
    setDeletingId(p.id);
    const result = await removeProfessional(p.id);
    setDeletingId(null);
    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir a profissional.");
    }
  }

  function copyPassword() {
    if (!generatedPassword) return;
    navigator.clipboard?.writeText(generatedPassword.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-rose-900">Profissionais</h1>
        <p className="text-sm text-ink-500 mt-1">
          Gerencie quem atende no studio e quem tem acesso de administradora.
        </p>
      </div>

      {generatedPassword && (
        <div className="bg-blush-50 border border-rose-300 rounded-2xl p-5">
          <p className="font-semibold text-rose-800 mb-1">
            {generatedPassword.name} foi cadastrada e o login já foi criado!
          </p>
          <p className="text-sm text-ink-700 mb-3">
            Envie esta senha temporária para ela por WhatsApp. Ela poderá entrar em <strong>/login</strong>{" "}
            com o e-mail cadastrado e essa senha, e trocá-la depois se quiser.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white rounded-lg border border-blush-300 px-3 py-2 text-sm font-mono text-ink-900">
              {generatedPassword.password}
            </code>
            <button
              type="button"
              onClick={copyPassword}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blush-300 hover:border-rose-400 px-3 py-2 text-xs font-medium text-ink-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {loginWarning && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-sm text-amber-800">
          <p className="font-semibold mb-1">Profissional cadastrada, mas o login não foi criado automaticamente</p>
          <p>{loginWarning}</p>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">{deleteError}</div>
      )}

      <div className="bg-white rounded-2xl border border-blush-200 shadow-soft divide-y divide-blush-100">
        {professionals.map((p) => (
          <div key={p.id} className="px-5 py-3.5">
            {editingId === p.id ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">Nome</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">WhatsApp</label>
                    <input
                      value={editForm.whatsapp}
                      onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: formatPhoneBR(e.target.value) }))}
                      placeholder="(31) 99509-3346"
                      inputMode="numeric"
                      className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">InfiniteTag</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">$</span>
                      <input
                        value={editForm.infiniteTag}
                        onChange={(e) => setEditForm((f) => ({ ...f, infiniteTag: e.target.value }))}
                        placeholder="usuario-infinitepay"
                        className="w-full rounded-lg border border-blush-300 pl-6 pr-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">Papel</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as "admin" | "staff" }))}
                      className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
                    >
                      <option value="staff">Profissional</option>
                      <option value="admin">Administradora</option>
                    </select>
                  </div>
                </div>
                {editError && <p className="text-xs text-red-600">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(p.id)}
                    disabled={editSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" /> {editSubmitting ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blush-300 text-ink-700 text-xs font-medium px-4 py-2 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-blush-100 flex items-center justify-center text-rose-600 shrink-0">
                    {p.role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                    <p className="text-xs text-ink-500 truncate">{p.email}</p>
                    {(p.whatsapp || p.infiniteTag) && (
                      <p className="text-xs text-ink-500 truncate">
                        {p.whatsapp && formatPhoneBR(p.whatsapp)}
                        {p.whatsapp && p.infiniteTag && " · "}
                        {p.infiniteTag && `$${p.infiniteTag}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      p.role === "admin" ? "bg-gold-300/30 text-gold-600" : "bg-blush-100 text-rose-700"
                    }`}
                  >
                    {p.role === "admin" ? "Administradora" : "Profissional"}
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                    <input
                      type="checkbox"
                      checked={p.active}
                      onChange={(e) => updateProfessional(p.id, { active: e.target.checked })}
                    />
                    Ativa
                  </label>
                  <button
                    onClick={() => startEdit(p)}
                    className="p-1.5 rounded-lg text-ink-500 hover:text-rose-600 hover:bg-blush-50"
                    aria-label="Editar profissional"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    disabled={deletingId === p.id}
                    className="p-1.5 rounded-lg text-ink-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Excluir profissional"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-blush-200 p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-9 w-9 rounded-full bg-blush-100 flex items-center justify-center text-rose-600">
            <UserPlus className="h-4 w-4" />
          </div>
          <h2 className="font-display text-lg text-rose-800">Adicionar profissional</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">E-mail de login</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="nome@email.com"
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">WhatsApp</label>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: formatPhoneBR(e.target.value) }))}
              placeholder="(31) 99509-3346"
              inputMode="numeric"
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Papel</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "admin" | "staff" }))}
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            >
              <option value="staff">Profissional</option>
              <option value="admin">Administradora</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-ink-500 mb-1">InfiniteTag (opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">$</span>
              <input
                value={form.infiniteTag}
                onChange={(e) => setForm((f) => ({ ...f, infiniteTag: e.target.value }))}
                placeholder="usuario-infinitepay"
                className="w-full rounded-lg border border-blush-300 pl-6 pr-3 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-ink-500">
              É o nome de usuário da profissional no app InfinitePay, sem o $. A profissional precisa ter o
              Checkout ativado no app.
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          <UserPlus className="h-4 w-4" /> {submitting ? "Adicionando..." : "Adicionar profissional"}
        </button>
      </form>

      <div className="bg-blush-50 border border-blush-200 rounded-2xl p-5 flex gap-3">
        <Info className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-sm text-ink-700 leading-relaxed">
          <p className="font-semibold text-rose-800 mb-1">O login é criado automaticamente</p>
          <p>
            Ao adicionar uma profissional, o sistema já cria o login dela e mostra uma senha temporária na
            tela — é só copiar e enviar por WhatsApp. Se por algum motivo isso falhar, você pode criar o
            login manualmente no{" "}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-rose-600 underline font-medium"
            >
              Supabase Studio
            </a>{" "}
            em <strong>Authentication → Users → Add user</strong>, usando o mesmo e-mail cadastrado acima.
          </p>
        </div>
      </div>
    </div>
  );
}
