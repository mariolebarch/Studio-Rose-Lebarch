import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX, Clock, User as UserIcon } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { useAppStore, type Appointment } from "../../store/useAppStore";
import { useClientAuthStore } from "../../store/useClientAuthStore";
import { formatDateBR } from "../../utils/slots";

function AppointmentCard({
  serviceLabel,
  professionalLabel,
  appointment,
  canCancel,
  canceling,
  onCancel,
}: {
  serviceLabel: string;
  professionalLabel: string;
  appointment: Appointment;
  canCancel: boolean;
  canceling: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-blush-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
      <div>
        <p className="font-semibold text-ink-900">{serviceLabel}</p>
        <p className="text-sm text-ink-500 mt-1 flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5" /> {professionalLabel}
        </p>
        <p className="text-sm text-ink-500 mt-1 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {formatDateBR(appointment.date)} às {appointment.startTime}
        </p>
        {appointment.status === "cancelado" && (
          <span className="inline-block mt-2 text-xs font-semibold text-red-600 bg-red-50 rounded-full px-2.5 py-1">
            Cancelado
          </span>
        )}
      </div>
      {canCancel && appointment.status === "confirmado" && (
        <button
          onClick={onCancel}
          disabled={canceling}
          className="shrink-0 rounded-full border border-blush-300 hover:border-red-400 hover:text-red-600 text-ink-700 font-medium px-5 py-2 text-sm transition-colors disabled:opacity-50"
        >
          {canceling ? "Cancelando..." : "Cancelar"}
        </button>
      )}
    </div>
  );
}

export function MyAppointments() {
  const appointments = useClientAuthStore((s) => s.appointments);
  const fetchMyAppointments = useClientAuthStore((s) => s.fetchMyAppointments);
  const cancelMyAppointment = useClientAuthStore((s) => s.cancelMyAppointment);
  const professionals = useAppStore((s) => s.professionals);
  const services = useAppStore((s) => s.services);

  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyAppointments();
  }, [fetchMyAppointments]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "confirmado" && a.date >= todayStr)
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    [appointments, todayStr]
  );
  const past = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "confirmado" || a.date < todayStr)
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)),
    [appointments, todayStr]
  );

  function serviceLabel(ids: string[]) {
    return ids.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join(" + ") || "Procedimento";
  }
  function professionalLabel(id: string) {
    return professionals.find((p) => p.id === id)?.name ?? "Profissional";
  }

  async function handleCancel(id: string) {
    if (!window.confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setError("");
    setCancelingId(id);
    const result = await cancelMyAppointment(id);
    setCancelingId(null);
    if (!result.ok) setError(result.error || "Não foi possível cancelar agora. Tente novamente.");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-cream-100 pt-28 pb-20">
        <div className="mx-auto max-w-3xl px-6 sm:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold tracking-widest uppercase text-rose-600">Minha conta</span>
              <h1 className="mt-2 font-display text-3xl text-rose-900">Meus agendamentos</h1>
            </div>
            <Link
              to="/agendar"
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              Novo agendamento
            </Link>
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <section>
            <h2 className="font-display text-lg text-rose-800 mb-3">Próximos</h2>
            {upcoming.length === 0 ? (
              <div className="bg-white rounded-2xl border border-blush-200 p-8 text-center text-sm text-ink-500 flex flex-col items-center gap-2">
                <CalendarX className="h-6 w-6 text-ink-500/50" />
                Você não tem agendamentos futuros.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    serviceLabel={serviceLabel(a.serviceIds)}
                    professionalLabel={professionalLabel(a.professionalId)}
                    canCancel
                    canceling={cancelingId === a.id}
                    onCancel={() => handleCancel(a.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-lg text-rose-800 mb-3">Histórico</h2>
              <div className="space-y-3">
                {past.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    serviceLabel={serviceLabel(a.serviceIds)}
                    professionalLabel={professionalLabel(a.professionalId)}
                    canCancel={false}
                    canceling={false}
                    onCancel={() => {}}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
