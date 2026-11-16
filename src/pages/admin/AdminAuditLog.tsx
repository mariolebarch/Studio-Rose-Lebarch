import { useEffect, useMemo, useState } from "react";
import { ClipboardList, UserCog, CalendarClock } from "lucide-react";
import { useAppStore, type AuditLogEntry } from "../../store/useAppStore";

const actionLabels: Record<AuditLogEntry["action"], string> = {
  insert: "Criou",
  update: "Alterou",
  delete: "Excluiu",
};

const entityLabels: Record<string, string> = {
  appointments: "agendamento",
  professionals: "profissional",
};

const fieldLabels: Record<string, string> = {
  status: "Status",
  professional_id: "Profissional",
  service_ids: "Procedimentos",
  date: "Data",
  start_time: "Horário de início",
  end_time: "Horário de fim",
  client_name: "Nome da cliente",
  client_phone: "WhatsApp da cliente",
  client_id: "Cliente",
  notes: "Observações",
  name: "Nome",
  email: "E-mail",
  role: "Papel",
  active: "Ativa",
  whatsapp: "WhatsApp",
  infinite_tag: "InfiniteTag",
};

function fieldLabel(key: string) {
  return fieldLabels[key] ?? key;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return String(value);
}

function summarize(entry: AuditLogEntry) {
  if (entry.action === "update" && entry.changes) {
    return Object.entries(entry.changes)
      .filter(([key]) => key !== "created_at")
      .map(([key, diff]) => {
        const d = diff as { de?: unknown; para?: unknown };
        return `${fieldLabel(key)}: ${formatValue(d?.de)} → ${formatValue(d?.para)}`;
      });
  }
  if (entry.changes) {
    const changes = entry.changes as Record<string, unknown>;
    const name = changes.client_name ?? changes.name;
    return name ? [`${String(name)}`] : [];
  }
  return [];
}

export function AdminAuditLog() {
  const auditLog = useAppStore((s) => s.auditLog);
  const fetchAuditLog = useAppStore((s) => s.fetchAuditLog);
  const [filter, setFilter] = useState<"all" | "appointments" | "professionals">("all");

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const filtered = useMemo(
    () => (filter === "all" ? auditLog : auditLog.filter((e) => e.entityType === filter)),
    [auditLog, filter]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-rose-900">Registro de auditoria</h1>
          <p className="text-sm text-ink-500 mt-1">
            Quem alterou o quê e quando, em agendamentos e profissionais.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-lg border border-blush-300 px-3 py-2 text-sm"
        >
          <option value="all">Tudo</option>
          <option value="appointments">Só agendamentos</option>
          <option value="professionals">Só profissionais</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-blush-200 shadow-soft divide-y divide-blush-100">
        {filtered.length === 0 && (
          <p className="text-sm text-ink-500 p-8 text-center">Nenhum registro encontrado.</p>
        )}
        {filtered.map((entry) => {
          const lines = summarize(entry);
          const Icon = entry.entityType === "professionals" ? UserCog : CalendarClock;
          return (
            <div key={entry.id} className="flex items-start gap-3 px-5 py-4">
              <div className="h-9 w-9 rounded-full bg-blush-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-900">
                  <span className="font-semibold">{entry.actorEmail ?? "Sistema"}</span>{" "}
                  {actionLabels[entry.action]} {entityLabels[entry.entityType] ?? entry.entityType}
                </p>
                {lines.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {lines.map((line, i) => (
                      <li key={i} className="text-xs text-ink-500">{line}</li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="text-xs text-ink-500 shrink-0 whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-500 flex items-center gap-1.5">
        <ClipboardList className="h-3.5 w-3.5" /> Mostrando os 200 registros mais recentes.
      </p>
    </div>
  );
}
