import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Appointment } from "./useAppStore";

export interface ClientProfile {
  id: string;
  authUserId: string;
  name: string;
  whatsapp: string;
  email: string | null;
  active: boolean;
  deletionRequestedAt: string | null;
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

interface ClientAuthState {
  ready: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  authEmail: string | null;
  profile: ClientProfile | null;
  needsProfile: boolean; // tem sessão, mas ainda não completou o cadastro
  appointments: Appointment[];

  init: () => Promise<void>;
  signInWithGoogle: () => Promise<ActionResult>;
  signUpWithEmail: (email: string, password: string, captchaToken?: string) => Promise<ActionResult>;
  signInWithEmail: (email: string, password: string, captchaToken?: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  completeProfile: (name: string, whatsapp: string) => Promise<ActionResult>;
  updateProfile: (patch: { name?: string; whatsapp?: string }) => Promise<ActionResult>;
  requestAccountDeletion: () => Promise<ActionResult>;
  fetchMyAppointments: () => Promise<void>;
  cancelMyAppointment: (id: string) => Promise<ActionResult>;
}

function mapClientRow(row: any): ClientProfile {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    whatsapp: row.whatsapp,
    email: row.email ?? null,
    active: row.active,
    deletionRequestedAt: row.deletion_requested_at ?? null,
  };
}

function mapAppointmentRow(row: any): Appointment {
  return {
    id: row.id,
    professionalId: row.professional_id,
    serviceIds: row.service_ids ?? [],
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

export const useClientAuthStore = create<ClientAuthState>()((set, get) => {
  async function loadForSession(session: Session) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    const profile = !error && data ? mapClientRow(data) : null;
    set({
      loading: false,
      ready: true,
      isAuthenticated: true,
      authEmail: session.user.email ?? null,
      profile,
      needsProfile: !profile,
    });
    if (profile) {
      get().fetchMyAppointments();
    }
  }

  return {
    ready: false,
    loading: false,
    isAuthenticated: false,
    authEmail: null,
    profile: null,
    needsProfile: false,
    appointments: [],

    init: async () => {
      if (get().ready) return;
      set({ loading: true });
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        set({ loading: false, ready: true });
      } else {
        await loadForSession(session);
      }

      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!newSession) {
          set({ isAuthenticated: false, authEmail: null, profile: null, needsProfile: false, appointments: [] });
          return;
        }
        await loadForSession(newSession);
      });
    },

    signInWithGoogle: async () => {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}conta/entrar`;
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    signUpWithEmail: async (email, password, captchaToken) => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    signInWithEmail: async (email, password, captchaToken) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    signOut: async () => {
      await supabase.auth.signOut();
      set({ isAuthenticated: false, authEmail: null, profile: null, needsProfile: false, appointments: [] });
    },

    completeProfile: async (name, whatsapp) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return { ok: false, error: "Sessão expirada. Entre novamente." };

      const { data, error } = await supabase
        .from("clients")
        .insert({
          auth_user_id: session.user.id,
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          email: session.user.email ?? null,
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      set({ profile: mapClientRow(data), needsProfile: false });
      get().fetchMyAppointments();
      return { ok: true };
    },

    updateProfile: async (patch) => {
      const profile = get().profile;
      if (!profile) return { ok: false, error: "Perfil não encontrado." };
      const payload: Record<string, unknown> = {};
      if (patch.name !== undefined) payload.name = patch.name.trim();
      if (patch.whatsapp !== undefined) payload.whatsapp = patch.whatsapp.trim();

      const { data, error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", profile.id)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      set({ profile: mapClientRow(data) });
      return { ok: true };
    },

    requestAccountDeletion: async () => {
      const profile = get().profile;
      if (!profile) return { ok: false, error: "Perfil não encontrado." };
      const { data, error } = await supabase
        .from("clients")
        .update({ deletion_requested_at: new Date().toISOString() })
        .eq("id", profile.id)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      set({ profile: mapClientRow(data) });
      return { ok: true };
    },

    fetchMyAppointments: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (!error) {
        set({ appointments: (data ?? []).map(mapAppointmentRow) });
      }
    },

    cancelMyAppointment: async (id) => {
      const { error } = await supabase.from("appointments").update({ status: "cancelado" }).eq("id", id);
      if (error) return { ok: false, error: error.message };
      set((s) => ({
        appointments: s.appointments.map((a) => (a.id === id ? { ...a, status: "cancelado" } : a)),
      }));
      return { ok: true };
    },
  };
});
