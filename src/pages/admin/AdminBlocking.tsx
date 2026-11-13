import { useMemo, useState, type FormEvent } from "react";
import { Ban, Clock3, Trash2, CalendarOff } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { formatDateBR, toDateInputValue } from "../../utils/slots";
import { BlockRangeCalendar } from "../../components/admin/BlockRangeCalendar";

export function AdminBlocking() {
  const blockedDates = useAppStore((s) => s.blockedDates);
  const blockedRanges = useAppStore((s) => s.blockedRanges);
  const professionals = useAppStore((s) => s.professionals);
  const currentProfessional = useAppStore((s) => s.currentProfessional);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const addBlockedDate = useAppStore((s) => s.addBlockedDate);
  const removeBlockedDate = useAppStore((s) => s.removeBlockedDate);
  const addBlockedRange = useAppStore((s) => s.addBlockedRange);
  const removeBlockedRange = useAppStore((s) => s.removeBlockedRange);

  const [scopeProfessionalId, setScopeProfessionalId] = useState(currentProfessional?.id ?? "");

  const today = toDateInputValue(new Date());

  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [dateReason, setDateReason] = useState("");
  const [dateError, setDateError] = useState("");
  const [blockingDays, setBlockingDays] = useState(false);

  const [rangeDate, setRangeDate] = useState(today);
  const [rangeStart, setRangeStart] = useState("12:00");
  const [rangeEnd, setRangeEnd] = useState("13:00");
  const [rangeReason, setRangeReason] = useState("");
  const [rangeError, setRangeError] = useState("");

  const scopedDates = blockedDates.filter((b) => b.professionalId === scopeProfessionalId);
  const scopedRanges = blockedRanges.filter((r) => r.professionalId === scopeProfessionalId);
  const scopedBlockedSet = useMemo(() => new Set(scopedDates.map((b) => b.date)), [scopedDates]);

  function toggleDay(date: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const sortedSelectedDays = useMemo(() => [...selectedDays].sort(), [selectedDays]);

  async function handleBlockDate(e: FormEvent) {
    e.preventDefault();
    setDateError("");
    const datesToBlock = sortedSelectedDays.filter((d) => !scopedDates.some((b) => b.date === d));
    if (datesToBlock.length === 0) {
      setDateError("Selecione ao menos um dia no calendário.");
      return;
    }
    setBlockingDays(true);
    for (const d of datesToBlock) {
      const result = await addBlockedDate(scopeProfessionalId, d, dateReason.trim() || undefined);
      if (!result.ok) {
        setDateError(`Não foi possível bloquear ${formatDateBR(d)}. Tente novamente.`);
        setBlockingDays(false);
        return;
      }
    }
    setBlockingDays(false);
    setDateReason("");
    setSelectedDays(new Set());
  }

  async function handleBlockRange(e: FormEvent) {
    e.preventDefault();
    setRangeError("");
    if (rangeStart >= rangeEnd) {
      setRangeError("O horário final deve ser depois do inicial.");
      return;
    }
    const result = await addBlockedRange({
      professionalId: scopeProfessionalId,
      date: rangeDate,
      startTime: rangeStart,
      endTime: rangeEnd,
      reason: rangeReason.trim() || undefined,
    });
    if (!result.ok) {
      setRangeError("Não foi possível bloquear o horário. Tente novamente.");
      return;
    }
    setRangeReason("");
  }

  const sortedDates = [...scopedDates].sort((a, b) => a.date.localeCompare(b.date));
  const sortedRanges = [...scopedRanges].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-rose-900">Bloqueio de horários</h1>
          <p className="text-sm text-ink-500 mt-1">
            Bloqueie dias inteiros (folgas, feriados) ou apenas um intervalo de horário específico (almoço, compromissos).
          </p>
        </div>
        {isAdmin && (
          <select
            value={scopeProfessionalId}
            onChange={(e) => setScopeProfessionalId(e.target.value)}
            className="rounded-lg border border-blush-300 px-3 py-2 text-sm"
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-blush-200 p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-full bg-blush-100 flex items-center justify-center text-rose-600">
              <CalendarOff className="h-4 w-4" />
            </div>
            <h2 className="font-display text-lg text-rose-800">Bloquear um dia inteiro</h2>
          </div>

          <form onSubmit={handleBlockDate} className="space-y-3">
            <p className="text-xs text-ink-500">
              Clique em quantos dias quiser (não precisam ser seguidos) e depois bloqueie todos de uma vez.
            </p>
            <BlockRangeCalendar
              blockedSet={scopedBlockedSet}
              selectedDays={selectedDays}
              onToggleDay={toggleDay}
            />
            {sortedSelectedDays.length > 0 && (
              <p className="text-sm text-ink-700">
                Vai bloquear {sortedSelectedDays.length === 1 ? "o dia" : `${sortedSelectedDays.length} dias`}:{" "}
                <strong>{sortedSelectedDays.map((d) => formatDateBR(d)).join(", ")}</strong>
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Motivo (opcional)</label>
              <input
                value={dateReason}
                onChange={(e) => setDateReason(e.target.value)}
                placeholder="Ex.: Folga, feriado, viagem"
                className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
              />
            </div>
            {dateError && <p className="text-xs text-red-600">{dateError}</p>}
            <button
              type="submit"
              disabled={blockingDays || sortedSelectedDays.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              <Ban className="h-4 w-4" />{" "}
              {blockingDays
                ? "Bloqueando..."
                : sortedSelectedDays.length > 1
                  ? `Bloquear ${sortedSelectedDays.length} dias`
                  : "Bloquear dia"}
            </button>
          </form>

          <div className="mt-6 space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {sortedDates.length === 0 && <p className="text-xs text-ink-500">Nenhuma data bloqueada.</p>}
            {sortedDates.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-blush-50 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink-900">{formatDateBR(b.date)}</p>
                  {b.reason && <p className="text-xs text-ink-500">{b.reason}</p>}
                </div>
                <button
                  onClick={() => removeBlockedDate(b.id)}
                  className="p-1.5 rounded-lg text-ink-500 hover:text-red-600 hover:bg-red-50"
                  aria-label="Remover bloqueio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-blush-200 p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-full bg-blush-100 flex items-center justify-center text-rose-600">
              <Clock3 className="h-4 w-4" />
            </div>
            <h2 className="font-display text-lg text-rose-800">Bloquear um horário específico</h2>
          </div>

          <form onSubmit={handleBlockRange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Data</label>
              <input
                type="date"
                required
                min={today}
                value={rangeDate}
                onChange={(e) => setRangeDate(e.target.value)}
                className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Das</label>
                <input
                  type="time"
                  required
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Até</label>
                <input
                  type="time"
                  required
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Motivo (opcional)</label>
              <input
                value={rangeReason}
                onChange={(e) => setRangeReason(e.target.value)}
                placeholder="Ex.: Almoço, consulta médica"
                className="w-full rounded-lg border border-blush-300 px-3 py-2 text-sm"
              />
            </div>
            {rangeError && <p className="text-xs text-red-600">{rangeError}</p>}
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              <Ban className="h-4 w-4" /> Bloquear horário
            </button>
          </form>

          <div className="mt-6 space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {sortedRanges.length === 0 && <p className="text-xs text-ink-500">Nenhum horário bloqueado.</p>}
            {sortedRanges.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-blush-50 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {formatDateBR(r.date)} · {r.startTime}–{r.endTime}
                  </p>
                  {r.reason && <p className="text-xs text-ink-500">{r.reason}</p>}
                </div>
                <button
                  onClick={() => removeBlockedRange(r.id)}
                  className="p-1.5 rounded-lg text-ink-500 hover:text-red-600 hover:bg-red-50"
                  aria-label="Remover bloqueio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
