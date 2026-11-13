import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import type { DayHours, Weekday } from "../data/business";
import { defaultBusinessHours } from "../data/business";
import type { Service } from "../data/services";

export interface Professional {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  infiniteTag: string | null;
  role: "admin" | "staff";
  active: boolean;
}

export interface Appointment {
  id: string;
  professionalId: string;
  serviceIds: string[];
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  clientName: string;
  clientPhone: string;
  notes?: string;
  createdAt: string;
  status: "confirmado" | "cancelado";
}

export interface BlockedDate {
  id: string;
  professionalId: string;
  date: string;
  reason?: string;
}

export interface BlockedRange {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

interface AppState {
  professionals: Professional[];
  currentProfessional: Professional | null;
  isAdmin: boolean;

  services: Service[];
  businessHoursByProfessional: Record<string, Record<Weekday, DayHours>>;
  blockedDates: BlockedDate[];
  blockedRanges: BlockedRange[];
  appointments: Appointment[]; // populada apenas quando autenticada (respeitando RLS por profissional)

  loading: boolean;
  ready: boolean;
  loadError: string | null;
  isAdminAuthenticated: boolean;

  init: () => Promise<void>;
  reloadData: () => Promise<void>;

  login: (email: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<ActionResult>;

  addAppointment: (
    a: Omit<Appointment, "id" | "createdAt" | "status"> & { clientId?: string }
  ) => Promise<ActionResult & { appointment?: Appointment }>;
  cancelAppointment: (id: string) => Promise<ActionResult>;
  deleteAppointment: (id: string) => Promise<ActionResult>;
  fetchAppointments: () => Promise<void>;

  addBlockedDate: (professionalId: string, date: string, reason?: string) => Promise<ActionResult>;
  removeBlockedDate: (id: string) => Promise<ActionResult>;

  addBlockedRange: (range: Omit<BlockedRange, "id">) => Promise<ActionResult>;
  removeBlockedRange: (id: string) => Promise<ActionResult>;

  updateBusinessHours: (professionalId: string, weekday: Weekday, hours: DayHours) => Promise<ActionResult>;

  addService: (service: Omit<Service, "id"> & { id?: string }) => Promise<ActionResult>;
  updateService: (id: string, patch: Partial<Service>) => Promise<ActionResult>;
  removeService: (id: string) => Promise<ActionResult>;

  addProfessional: (professional: {
    name: string;
    email: string;
    role: "admin" | "staff";
    whatsapp: string;
    infiniteTag?: string;
  }) => Promise<ActionResult & { temporaryPassword?: string; loginWarning?: string }>;
  updateProfessional: (
    id: string,
    patch: { name?: string; role?: "admin" | "staff"; active?: boolean; whatsapp?: string; infiniteTag?: string | null }
  ) => Promise<ActionResult>;
}

function normalizeInfiniteTag(tag: string | undefined | null): string | null {
  const trimmed = (tag ?? "").trim().replace(/^\$+/, "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `servico-${Date.now()}`
  );
}

function mapProfessionalRow(row: any): Professional {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    whatsapp: row.whatsapp ?? "",
    infiniteTag: row.infinite_tag ?? null,
    role: row.role,
    active: row.active,
  };
}

function mapServiceRow(row: any): Service {
  return {
    id: row.id,
    professionalId: row.professional_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    durationMin: row.duration_min,
    price: Number(row.price),
    active: row.active,
  };
}

function mapAppointmentRow(row: any): Appointment {
  return {
    id: row.id,
    professionalId: row.professional_id,
    serviceIds: row.service_ids ?? (row.service_id ? [row.service_id] : []),
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    status: row.status,
  };
}

function mapBlockedDateRow(row: any): BlockedDate {
  return { id: row.id, professionalId: row.professional_id, date: row.date, reason: row.reason ?? undefined };
}

function mapBlockedRangeRow(row: any): BlockedRange {
  return {
    id: row.id,
    professionalId: row.professional_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason ?? undefined,
  };
}

function findProfessionalByEmail(professionals: Professional[], email?: string | null): Professional | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  return professionals.find((p) => p.email.toLowerCase() === lower) ?? null;
}

async function fetchCoreOnce() {
  return Promise.all([
    supabase.from("professionals").select("*").order("created_at"),
    supabase.from("services").select("*").order("category_id"),
    supabase.from("professional_hours").select("*"),
    supabase.from("blocked_dates").select("*"),
    supabase.from("blocked_ranges").select("*"),
  ]);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Redes móveis podem falhar na primeira tentativa; tenta mais algumas vezes
// antes de desistir, para não deixar a tela de agendamento vazia à toa.
async function fetchCoreWithRetry(retries = 2) {
  let result = await fetchCoreOnce();
  let attempt = 0;
  while (result.some((r) => r.error) && attempt < retries) {
    await wait(700 * (attempt + 1));
    result = await fetchCoreOnce();
    attempt++;
  }
  return result;
}

function applyCoreResult(
  set: (partial: Partial<AppState>) => void,
  result: Awaited<ReturnType<typeof fetchCoreOnce>>
) {
  const [professionalsRes, servicesRes, hoursRes, blockedDatesRes, blockedRangesRes] = result;
  const businessHoursByProfessional: Record<string, Record<Weekday, DayHours>> = {};
  for (const row of hoursRes.data ?? []) {
    businessHoursByProfessional[row.professional_id] = row.business_hours ?? defaultBusinessHours;
  }
  const coreError = professionalsRes.error ?? servicesRes.error ?? hoursRes.error ?? null;
  set({
    professionals: (professionalsRes.data ?? []).map(mapProfessionalRow),
    services: (servicesRes.data ?? []).map(mapServiceRow),
    businessHoursByProfessional,
    blockedDates: (blockedDatesRes.data ?? []).map(mapBlockedDateRow),
    blockedRanges: (blockedRangesRes.data ?? []).map(mapBlockedRangeRow),
    loadError: coreError
      ? `Não foi possível carregar os dados. Verifique sua internet. (detalhe técnico: ${(coreError as any).message ?? coreError})`
      : null,
  });
}

export const useAppStore = create<AppState>()((set, get) => ({
  professionals: [],
  currentProfessional: null,
  isAdmin: false,
  services: [],
  businessHoursByProfessional: {},
  blockedDates: [],
  blockedRanges: [],
  appointments: [],
  loading: false,
  ready: false,
  loadError: null,
  isAdminAuthenticated: false,

  init: async () => {
    if (get().ready) return;
    set({ loading: true });

    const [coreResult, sessionRes] = await Promise.all([
      fetchCoreWithRetry(),
      supabase.auth.getSession(),
    ]);
    applyCoreResult(set, coreResult);

    const session = sessionRes.data.session;
    const professionals = get().professionals;
    const currentProfessional = session ? findProfessionalByEmail(professionals, session.user.email) : null;

    // Uma sessão sem profissional correspondente não é um erro: pode ser
    // uma cliente logada (área /conta), que é tratada por outro store.
    set({
      isAdminAuthenticated: !!currentProfessional,
      currentProfessional,
      isAdmin: currentProfessional?.role === "admin",
      loading: false,
      ready: true,
    });

    if (currentProfessional) {
      get().fetchAppointments();
    }

    supabase.auth.onAuthStateChange(async (_event: string, newSession: { user: { email?: string } } | null) => {
      if (!newSession) {
        set({ isAdminAuthenticated: false, currentProfessional: null, isAdmin: false, appointments: [] });
        return;
      }
      const prof = findProfessionalByEmail(get().professionals, newSession.user.email);
      if (!prof) {
        // Sessão de uma cliente (ou conta sem papel nenhum) — não mexe
        // no estado da área administrativa.
        set({ isAdminAuthenticated: false, currentProfessional: null, isAdmin: false, appointments: [] });
        return;
      }
      set({ isAdminAuthenticated: true, currentProfessional: prof, isAdmin: prof.role === "admin" });
      get().fetchAppointments();
    });
  },

  reloadData: async () => {
    set({ loading: true });
    const result = await fetchCoreWithRetry();
    applyCoreResult(set, result);
    set({ loading: false });
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    const prof = findProfessionalByEmail(get().professionals, email);
    if (!prof) {
      await supabase.auth.signOut();
      return { ok: false, error: "Sua conta não está associada a nenhuma profissional cadastrada." };
    }
    if (!prof.active) {
      await supabase.auth.signOut();
      return { ok: false, error: "Este acesso foi desativado. Fale com a administradora." };
    }
    set({ isAdminAuthenticated: true, currentProfessional: prof, isAdmin: prof.role === "admin" });
    await get().fetchAppointments();
    return { ok: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ isAdminAuthenticated: false, currentProfessional: null, isAdmin: false, appointments: [] });
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  fetchAppointments: async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    if (!error) {
      set({ appointments: (data ?? []).map(mapAppointmentRow) });
    }
  },

  addAppointment: async (a) => {
    const payload = {
      professional_id: a.professionalId,
      service_ids: a.serviceIds,
      date: a.date,
      start_time: a.startTime,
      end_time: a.endTime,
      client_name: a.clientName,
      client_phone: a.clientPhone,
      client_id: a.clientId ?? null,
      notes: a.notes ?? null,
    };

    // Agendamentos agora exigem login (cliente dona ou profissional/admin
    // criando manualmente) — em ambos os casos a RLS libera a releitura.
    const { data, error } = await supabase.from("appointments").insert(payload).select().single();
    if (error) return { ok: false, error: error.message };
    const appointment = mapAppointmentRow(data);
    if (get().isAdminAuthenticated) {
      set((s) => ({ appointments: [...s.appointments, appointment] }));
    }
    return { ok: true, appointment };
  },

  cancelAppointment: async (id) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelado" })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, status: "cancelado" } : a)),
    }));
    return { ok: true };
  },

  deleteAppointment: async (id) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
    return { ok: true };
  },

  addBlockedDate: async (professionalId, date, reason) => {
    const { data, error } = await supabase
      .from("blocked_dates")
      .insert({ professional_id: professionalId, date, reason: reason ?? null })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    set((s) => ({ blockedDates: [...s.blockedDates, mapBlockedDateRow(data)] }));
    return { ok: true };
  },

  removeBlockedDate: async (id) => {
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    set((s) => ({ blockedDates: s.blockedDates.filter((b) => b.id !== id) }));
    return { ok: true };
  },

  addBlockedRange: async (range) => {
    const { data, error } = await supabase
      .from("blocked_ranges")
      .insert({
        professional_id: range.professionalId,
        date: range.date,
        start_time: range.startTime,
        end_time: range.endTime,
        reason: range.reason ?? null,
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    set((s) => ({ blockedRanges: [...s.blockedRanges, mapBlockedRangeRow(data)] }));
    return { ok: true };
  },

  removeBlockedRange: async (id) => {
    const { error } = await supabase.from("blocked_ranges").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    set((s) => ({ blockedRanges: s.blockedRanges.filter((b) => b.id !== id) }));
    return { ok: true };
  },

  updateBusinessHours: async (professionalId, weekday, hours) => {
    const current = get().businessHoursByProfessional[professionalId] ?? defaultBusinessHours;
    const nextHours = { ...current, [weekday]: hours };
    const { error } = await supabase
      .from("professional_hours")
      .upsert({ professional_id: professionalId, business_hours: nextHours });
    if (error) return { ok: false, error: error.message };
    set((s) => ({
      businessHoursByProfessional: { ...s.businessHoursByProfessional, [professionalId]: nextHours },
    }));
    return { ok: true };
  },

  addService: async (service) => {
    const id = service.id ?? slugify(service.name);
    const { data, error } = await supabase
      .from("services")
      .insert({
        id,
        professional_id: service.professionalId,
        category_id: service.categoryId,
        name: service.name,
        description: service.description,
        duration_min: service.durationMin,
        price: service.price,
        active: service.active,
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    set((s) => ({ services: [...s.services, mapServiceRow(data)] }));
    return { ok: true };
  },

  updateService: async (id, patch) => {
    const payload: Record<string, unknown> = {};
    if (patch.categoryId !== undefined) payload.category_id = patch.categoryId;
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.durationMin !== undefined) payload.duration_min = patch.durationMin;
    if (patch.price !== undefined) payload.price = patch.price;
    if (patch.active !== undefined) payload.active = patch.active;

    const { data, error } = await supabase
      .from("services")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    set((s) => ({ services: s.services.map((sv) => (sv.id === id ? mapServiceRow(data) : sv)) }));
    return { ok: true };
  },

  removeService: async (id) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    set((s) => ({ services: s.services.filter((sv) => sv.id !== id) }));
    return { ok: true };
  },

  addProfessional: async (professional) => {
    const email = professional.email.toLowerCase().trim();
    const { data, error } = await supabase
      .from("professionals")
      .insert({
        name: professional.name,
        email,
        role: professional.role,
        whatsapp: professional.whatsapp.trim(),
        infinite_tag: normalizeInfiniteTag(professional.infiniteTag),
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    const prof = mapProfessionalRow(data);
    const defaultHours = get().businessHoursByProfessional[get().currentProfessional?.id ?? ""] ?? defaultBusinessHours;
    await supabase.from("professional_hours").upsert({ professional_id: prof.id, business_hours: defaultHours });
    set((s) => ({
      professionals: [...s.professionals, prof],
      businessHoursByProfessional: { ...s.businessHoursByProfessional, [prof.id]: defaultHours },
    }));

    const { data: fnData, error: fnError } = await supabase.functions.invoke("create-professional-login", {
      body: { email },
    });
    if (fnError || !fnData?.ok) {
      let detail: string | undefined = fnData?.error;
      if (!detail && fnError && "context" in fnError) {
        try {
          const body = await (fnError as { context: Response }).context.json();
          detail = body?.error;
        } catch {
          // mantém o fallback abaixo se o corpo do erro não vier em JSON
        }
      }
      return {
        ok: true,
        loginWarning:
          detail ??
          fnError?.message ??
          "Não foi possível criar o login automaticamente. Crie manualmente no Supabase (Authentication → Users).",
      };
    }
    return { ok: true, temporaryPassword: fnData.temporaryPassword as string };
  },

  updateProfessional: async (id, patch) => {
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.role !== undefined) payload.role = patch.role;
    if (patch.active !== undefined) payload.active = patch.active;
    if (patch.whatsapp !== undefined) payload.whatsapp = patch.whatsapp.trim();
    if (patch.infiniteTag !== undefined) payload.infinite_tag = normalizeInfiniteTag(patch.infiniteTag);

    const { data, error } = await supabase.from("professionals").update(payload).eq("id", id).select().single();
    if (error) return { ok: false, error: error.message };
    const prof = mapProfessionalRow(data);
    set((s) => ({ professionals: s.professionals.map((p) => (p.id === id ? prof : p)) }));
    return { ok: true };
  },
}));
