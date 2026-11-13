import { useRef, useState, type FormEvent } from "react";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { serviceCategories } from "../../data/services";

function emptyForm(professionalId: string) {
  return {
    professionalId,
    categoryId: serviceCategories[0].id,
    name: "",
    description: "",
    durationMin: 30,
    price: 0,
  };
}

export function AdminServices() {
  const services = useAppStore((s) => s.services);
  const professionals = useAppStore((s) => s.professionals);
  const currentProfessional = useAppStore((s) => s.currentProfessional);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const addService = useAppStore((s) => s.addService);
  const updateService = useAppStore((s) => s.updateService);
  const removeService = useAppStore((s) => s.removeService);

  const [scopeProfessionalId, setScopeProfessionalId] = useState(currentProfessional?.id ?? "");
  const [form, setForm] = useState(() => emptyForm(scopeProfessionalId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const scopedServices = services.filter((s) => s.professionalId === scopeProfessionalId);

  function changeScope(id: string) {
    setScopeProfessionalId(id);
    setEditingId(null);
    setForm(emptyForm(id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return;
    const result = editingId
      ? await updateService(editingId, form)
      : await addService({ ...form, professionalId: scopeProfessionalId, active: true });
    if (!result.ok) {
      setError("Não foi possível salvar o procedimento. Tente novamente.");
      return;
    }
    setEditingId(null);
    setForm(emptyForm(scopeProfessionalId));
  }

  function startEdit(id: string) {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setForm({
      professionalId: s.professionalId,
      categoryId: s.categoryId,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
    });
    setEditingId(id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(scopeProfessionalId));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-rose-900">Serviços</h1>
          <p className="text-sm text-ink-500 mt-1">Gerencie os procedimentos, duração e valores exibidos no site e no agendamento.</p>
        </div>
        {isAdmin && (
          <select
            value={scopeProfessionalId}
            onChange={(e) => changeScope(e.target.value)}
            className="rounded-lg border border-blush-300 px-3 py-2 text-sm"
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`bg-white rounded-2xl p-6 shadow-soft space-y-4 border transition-colors ${
          editingId ? "border-rose-400 ring-2 ring-rose-100" : "border-blush-200"
        }`}
      >
        <h2 className="font-display text-lg text-rose-800">{editingId ? "Editar procedimento" : "Novo procedimento"}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Categoria</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            >
              {serviceCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Nome</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-ink-500 mb-1">Descrição</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Duração (minutos)</label>
            <input
              type="number"
              min={5}
              step={5}
              required
              value={form.durationMin}
              onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Valor (R$)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              required
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
              className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            {editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Salvar alterações" : "Adicionar procedimento"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-rose-600"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="space-y-6">
        {serviceCategories.map((cat) => {
          const items = scopedServices.filter((s) => s.categoryId === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="font-display text-base text-rose-800 mb-3">{cat.name}</h3>
              <div className="bg-white rounded-2xl border border-blush-200 shadow-soft divide-y divide-blush-100">
                {items.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900 truncate">{s.name}</p>
                      <p className="text-xs text-ink-500 truncate">
                        {s.durationMin} min · R$ {s.price.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                        <input
                          type="checkbox"
                          checked={s.active}
                          onChange={(e) => updateService(s.id, { active: e.target.checked })}
                        />
                        Ativo
                      </label>
                      <button onClick={() => startEdit(s.id)} className="p-1.5 rounded-lg text-ink-500 hover:text-rose-600 hover:bg-blush-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Remover este procedimento?")) removeService(s.id);
                        }}
                        className="p-1.5 rounded-lg text-ink-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
