// Cria o login (Supabase Auth) de uma profissional recém-cadastrada.
// Só pode ser chamada por quem já está logada como administradora — a
// verificação é feita aqui, no servidor, usando a chave de serviço (nunca
// exposta ao navegador). Devolve uma senha temporária gerada na hora.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generatePassword(length = 12): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Método não permitido." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return json({ ok: false, error: "Não autenticado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser(token);
    const callerEmail = userData?.user?.email;
    if (userError || !callerEmail) {
      return json({ ok: false, error: "Sessão inválida." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProf, error: callerProfError } = await adminClient
      .from("professionals")
      .select("role")
      .ilike("email", callerEmail)
      .maybeSingle();
    if (callerProfError || callerProf?.role !== "admin") {
      return json({ ok: false, error: "Apenas a administradora pode criar logins de profissionais." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return json({ ok: false, error: "E-mail inválido." }, 400);
    }

    const temporaryPassword = generatePassword();
    const { error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });
    if (createError) {
      return json({ ok: false, error: createError.message }, 400);
    }

    return json({ ok: true, temporaryPassword });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
