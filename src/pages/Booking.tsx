import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, MessageCircle, CalendarCheck, RefreshCw, User } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { StepIndicator } from "../components/booking/StepIndicator";
import { CalendarPicker } from "../components/booking/CalendarPicker";
import { TimeSlotGrid } from "../components/booking/TimeSlotGrid";
import { useAppStore } from "../store/useAppStore";
import { useClientAuthStore } from "../store/useClientAuthStore";
import { serviceCategories } from "../data/services";
import { formatPhoneBR, isValidPhoneBR } from "../utils/phone";
import { IconHand, IconFoot, IconSparkleGlyph, IconCombo, IconExtra } from "../components/decor/Icons";
import { formatDateBR } from "../utils/slots";
import { buildWhatsAppMessage, whatsappLinkWithMessage } from "../utils/whatsapp";

const categoryIcons = {
  hand: IconHand,
  foot: IconFoot,
  sparkle: IconSparkleGlyph,
  combo: IconCombo,
  extra: IconExtra,
};

const STEPS = ["Profissional", "Procedimentos", "Data", "Horário", "Seus dados", "Confirmação"];

export function Booking() {
  const [params] = useSearchParams();
  const professionals = useAppStore((s) => s.professionals);
  const services = useAppStore((s) => s.services);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const loadingData = useAppStore((s) => s.loading);
  const loadError = useAppStore((s) => s.loadError);
  const reloadData = useAppStore((s) => s.reloadData);
  const clientProfile = useClientAuthStore((s) => s.profile);

  const activeProfessionals = useMemo(() => professionals.filter((p) => p.active), [professionals]);

  const [step, setStep] = useState(0);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState(clientProfile?.name ?? "");
  const [clientPhone, setClientPhone] = useState(formatPhoneBR(clientProfile?.whatsapp ?? ""));
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Congela os dados do agendamento confirmado: evita que a tela de sucesso
  // e a mensagem do WhatsApp fiquem vazias caso os dados "ao vivo" (serviços,
  // profissional selecionados) mudem por qualquer motivo depois da confirmação.
  const [confirmedBooking, setConfirmedBooking] = useState<{
    serviceNamesLabel: string;
    professionalName: string;
    date: string;
    startTime: string;
    clientName: string;
  } | null>(null);

  const professionalServices = useMemo(
    () => services.filter((s) => s.professionalId === professionalId),
    [services, professionalId]
  );
  const selectedServices = useMemo(
    () => professionalServices.filter((s) => selectedServiceIds.includes(s.id)),
    [professionalServices, selectedServiceIds]
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.durationMin, 0),
    [selectedServices]
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices]
  );
  const serviceNamesLabel = selectedServices.map((s) => s.name).join(" + ");
  const selectedProfessional = activeProfessionals.find((p) => p.id === professionalId) ?? null;

  useEffect(() => {
    const presetId = params.get("service");
    if (presetId) {
      const svc = services.find((s) => s.id === presetId && s.active);
      if (svc) {
        setProfessionalId(svc.professionalId);
        setSelectedServiceIds([svc.id]);
        setStep(2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.length]);

  function resetAll() {
    setStep(0);
    setProfessionalId(null);
    setSelectedServiceIds([]);
    setDate(null);
    setTime(null);
    setClientName(clientProfile?.name ?? "");
    setClientPhone(formatPhoneBR(clientProfile?.whatsapp ?? ""));
    setNotes("");
    setDone(false);
    setConfirmedBooking(null);
  }

  function chooseProfessional(id: string) {
    setProfessionalId(id);
    setSelectedServiceIds([]);
    setDate(null);
    setTime(null);
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setTime(null);
  }

  function canAdvance() {
    if (step === 0) return !!professionalId;
    if (step === 1) return selectedServiceIds.length > 0;
    if (step === 2) return !!date;
    if (step === 3) return !!time;
    if (step === 4) return clientName.trim().length > 1 && isValidPhoneBR(clientPhone);
    return true;
  }

  async function handleConfirm() {
    if (!professionalId || selectedServices.length === 0 || !date || !time) return;
    const [h, m] = time.split(":").map(Number);
    const totalStart = h * 60 + m;
    const totalEnd = totalStart + totalDuration;
    const endTime = `${Math.floor(totalEnd / 60).toString().padStart(2, "0")}:${(totalEnd % 60).toString().padStart(2, "0")}`;

    setSubmitError("");
    setSubmitting(true);
    const result = await addAppointment({
      professionalId,
      serviceIds: selectedServiceIds,
      date,
      startTime: time,
      endTime,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientId: clientProfile?.id,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      setConfirmedBooking({
        serviceNamesLabel,
        professionalName: selectedProfessional?.name ?? "",
        date,
        startTime: time,
        clientName: clientName.trim(),
      });
      setDone(true);
    } else {
      setSubmitError(
        `Não foi possível confirmar o agendamento. Tente novamente em instantes.${
          result.error ? ` (detalhe técnico: ${result.error})` : ""
        }`
      );
    }
  }

  const whatsappMessage = confirmedBooking
    ? buildWhatsAppMessage({
        serviceNames: confirmedBooking.serviceNamesLabel.split(" + "),
        date: confirmedBooking.date,
        startTime: confirmedBooking.startTime,
        clientName: confirmedBooking.clientName,
      })
    : "";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-cream-100 pt-28 pb-20">
        <div className="mx-auto max-w-3xl px-6 sm:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold tracking-widest uppercase text-rose-600">Agendamento</span>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl text-rose-900">Marque seu horário</h1>
            <p className="mt-2 text-ink-500 text-sm">
              Rápido, simples e com horários sempre atualizados. Você pode combinar mais de um procedimento no mesmo horário.
            </p>
          </div>

          {!done && <StepIndicator steps={STEPS} current={step} />}

          <div className="bg-white rounded-3xl shadow-soft border border-blush-200 p-6 sm:p-10">
            {done && confirmedBooking ? (
              <div className="text-center py-6 animate-fade-up">
                <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-5">
                  <CalendarCheck className="h-8 w-8" />
                </div>
                <h2 className="font-display text-2xl text-rose-900">Pré-agendamento realizado!</h2>
                <p className="mt-2 text-ink-500 max-w-md mx-auto text-sm leading-relaxed">
                  Seu horário para <strong>{confirmedBooking.serviceNamesLabel}</strong> com{" "}
                  <strong>{confirmedBooking.professionalName}</strong> em{" "}
                  <strong>{formatDateBR(confirmedBooking.date)}</strong> às{" "}
                  <strong>{confirmedBooking.startTime}</strong> foi reservado. Confirme pelo WhatsApp para
                  garantir seu atendimento.
                </p>
                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={whatsappLinkWithMessage(whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:brightness-95 text-white font-semibold px-6 py-3 transition"
                  >
                    <MessageCircle className="h-4 w-4" /> Confirmar no WhatsApp
                  </a>
                  <button
                    onClick={resetAll}
                    className="rounded-full border border-blush-300 hover:border-rose-400 text-rose-700 font-semibold px-6 py-3 transition-colors"
                  >
                    Novo agendamento
                  </button>
                </div>
                <Link
                  to="/conta/agendamentos"
                  className="mt-4 inline-block text-sm text-ink-500 hover:text-rose-600 transition-colors"
                >
                  Ver meus agendamentos
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between max-w-md mx-auto pb-5 mb-5 border-b border-blush-100">
                  <button
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-rose-600 disabled:opacity-0 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </button>

                  {step < 5 ? (
                    <button
                      onClick={() => canAdvance() && setStep((s) => s + 1)}
                      disabled={!canAdvance()}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-semibold px-6 py-2.5 text-sm transition-colors"
                    >
                      Continuar <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirm}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 text-sm transition-colors"
                    >
                      <Check className="h-4 w-4" /> {submitting ? "Confirmando..." : "Confirmar agendamento"}
                    </button>
                  )}
                </div>

                {submitError && (
                  <p className="mb-4 text-center text-xs text-red-600 max-w-md mx-auto">{submitError}</p>
                )}

                {step === 0 && activeProfessionals.length === 0 && (
                  <div className="text-center py-10 animate-fade-up">
                    <p className="text-sm text-ink-500 mb-4">
                      {loadingData
                        ? "Carregando profissionais..."
                        : loadError ?? "Não conseguimos carregar as profissionais agora."}
                    </p>
                    {!loadingData && (
                      <button
                        onClick={() => reloadData()}
                        className="inline-flex items-center gap-2 rounded-full border border-blush-300 hover:border-rose-400 text-rose-700 font-semibold px-5 py-2.5 text-sm transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" /> Tentar novamente
                      </button>
                    )}
                  </div>
                )}

                {step === 0 && activeProfessionals.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-4 animate-fade-up max-w-md mx-auto">
                    {activeProfessionals.map((p) => {
                      const active = professionalId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => chooseProfessional(p.id)}
                          className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition-all
                            ${active ? "border-rose-500 bg-blush-50 shadow-soft" : "border-blush-200 hover:border-rose-300"}
                          `}
                        >
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-rose-600 text-white" : "bg-blush-100 text-rose-600"}`}>
                            <User className="h-6 w-6" />
                          </div>
                          <p className="font-semibold text-ink-900">{p.name}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6 animate-fade-up">
                    {selectedServices.length > 0 && (
                      <div className="max-w-md mx-auto rounded-2xl bg-blush-50 border border-blush-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
                        <span className="text-ink-700">
                          {selectedServices.length} procedimento(s) · {totalDuration} min
                        </span>
                        <span className="font-display text-rose-600">
                          R$ {totalPrice.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    )}
                    {professionalServices.length === 0 && (
                      <p className="text-sm text-ink-500 text-center py-6">
                        {selectedProfessional?.name} ainda não tem procedimentos cadastrados.
                      </p>
                    )}
                    {serviceCategories.map((cat) => {
                      const Icon = categoryIcons[cat.icon];
                      const items = professionalServices.filter((s) => s.categoryId === cat.id && s.active);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat.id}>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="h-8 w-8 rounded-full bg-blush-100 flex items-center justify-center text-rose-600 shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <h3 className="font-display text-base text-rose-800">{cat.name}</h3>
                          </div>
                          <div className="space-y-2.5">
                            {items.map((s) => {
                              const active = selectedServiceIds.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => toggleService(s.id)}
                                  className={`w-full flex items-start justify-between gap-4 rounded-2xl border p-4 text-left transition-all
                                    ${active ? "border-rose-500 bg-blush-50 shadow-soft" : "border-blush-200 hover:border-rose-300"}
                                  `}
                                >
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                                        active ? "bg-rose-600 border-rose-600 text-white" : "border-blush-300"
                                      }`}
                                    >
                                      {active && <Check className="h-3.5 w-3.5" />}
                                    </span>
                                    <div>
                                      <p className="font-semibold text-ink-900">{s.name}</p>
                                      <p className="text-xs text-ink-500 mt-1">{s.description}</p>
                                      <p className="text-xs text-ink-500 mt-1">{s.durationMin} min</p>
                                    </div>
                                  </div>
                                  <span className="font-display text-lg text-rose-600 shrink-0">
                                    R$ {s.price.toFixed(2).replace(".", ",")}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {step === 2 && professionalId && (
                  <div className="animate-fade-up">
                    <CalendarPicker professionalId={professionalId} selectedDate={date} onSelect={(d) => setDate(d)} />
                  </div>
                )}

                {step === 3 && date && professionalId && selectedServices.length > 0 && (
                  <div className="animate-fade-up">
                    <p className="text-sm text-ink-500 mb-4">
                      Horários disponíveis para <strong className="text-ink-900">{formatDateBR(date)}</strong>{" "}
                      ({totalDuration} min de duração total)
                    </p>
                    <TimeSlotGrid
                      professionalId={professionalId}
                      date={date}
                      durationMin={totalDuration}
                      selectedTime={time}
                      onSelect={setTime}
                    />
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4 animate-fade-up max-w-md mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo</label>
                      <input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full rounded-xl border border-blush-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1.5">WhatsApp</label>
                      <input
                        value={clientPhone}
                        onChange={(e) => setClientPhone(formatPhoneBR(e.target.value))}
                        placeholder="(31) 99509-3346"
                        inputMode="numeric"
                        className="w-full rounded-xl border border-blush-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1.5">Observações (opcional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Alguma preferência de cor, desenho ou observação"
                        className="w-full rounded-xl border border-blush-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                      />
                    </div>
                  </div>
                )}

                {step === 5 && date && time && (
                  <div className="animate-fade-up max-w-md mx-auto">
                    <h3 className="font-display text-xl text-rose-900 mb-5">Confira os detalhes</h3>
                    <dl className="space-y-3 text-sm">
                      {[
                        ["Profissional", selectedProfessional?.name ?? ""],
                        ["Procedimento(s)", serviceNamesLabel],
                        ["Duração total", `${totalDuration} min`],
                        ["Valor total", `R$ ${totalPrice.toFixed(2).replace(".", ",")}`],
                        ["Data", formatDateBR(date)],
                        ["Horário", time],
                        ["Nome", clientName],
                        ["WhatsApp", clientPhone],
                        ...(notes ? [["Observações", notes]] : []),
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 border-b border-blush-100 pb-2">
                          <dt className="text-ink-500">{label}</dt>
                          <dd className="text-ink-900 font-medium text-right">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </>
            )}
          </div>

          {!done && (
            <p className="text-center text-xs text-ink-500 mt-6">
              Precisa de ajuda?{" "}
              <Link to="/#localizacao" className="text-rose-600 font-medium">
                Veja nosso contato
              </Link>
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
