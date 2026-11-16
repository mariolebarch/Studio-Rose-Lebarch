// Login com bloqueio temporário por excesso de tentativas incorretas.
// Usada tanto pelo login das profissionais/administradora quanto pelo
// login das clientes — a checagem de bloqueio e a tentativa de senha
// acontecem aqui no servidor, então não dá pra burlar reiniciando a
// página ou limpando o navegador.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 15;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendLockoutEmail(apiKey: string, email: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Studio Rosely Lebarch <onboarding@resend.dev>",
      to: email,
      subject: "Várias tentativas de login na sua conta",
      html:
        `<p>Detectamos ${MAX_ATTEMPTS} tentativas de login incorretas seguidas na conta <strong>${email}</strong> ` +
        `do site do Studio Rosely Lebarch.</p>` +
        `<p>Por segurança, o acesso dessa conta ficou temporariamente bloqueado por ${LOCKOUT_MINUTES} minutos.</p>` +
        `<p>Se não foi você, não precisa fazer nada — o bloqueio expira sozinho. Se foi você, aguarde esse tempo ` +
        `e tente novamente com a senha correta.</p>`,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Método não permitido." }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : undefined;

    if (!email || !password) {
      return json({ ok: false, error: "Informe e-mail e senha." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data: recentAttempts } = await adminClient
      .from("login_attempts")
      .select("success")
      .eq("email", email)
      .gte("created_at", windowStart);

    const recentFailures = (recentAttempts ?? []).filter((a) => !a.success).length;

    if (recentFailures >= MAX_ATTEMPTS) {
      return json(
        {
          ok: false,
          lockedOut: true,
          error: `Muitas tentativas incorretas seguidas. Tente novamente em ${LOCKOUT_MINUTES} minutos.`,
        },
        429
      );
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    await adminClient.from("login_attempts").insert({ email, success: !signInError });

    if (signInError) {
      const newFailureCount = recentFailures + 1;
      if (newFailureCount === MAX_ATTEMPTS && resendApiKey) {
        await sendLockoutEmail(resendApiKey, email).catch(() => {});
      }
      return json({ ok: false, error: "E-mail ou senha incorretos." }, 401);
    }

    return json({
      ok: true,
      session: {
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
      },
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
