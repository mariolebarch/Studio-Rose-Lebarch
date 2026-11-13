-- Studio Rosely Lebarch — migração: contas de clientes (login + perfil)
-- Rode este script em: Supabase Studio → SQL Editor → New query → Run
-- Pode ser executado mais de uma vez sem problema.

-- ==========================================================
-- Tabela de clientes
-- ==========================================================
-- auth_user_id é preenchido quando a cliente tem login próprio (Google ou
-- e-mail/senha). Fica nulo para clientes cadastradas manualmente pela
-- administradora (atendimento por telefone/presencial, sem conta).

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  whatsapp text not null,
  email text,
  active boolean not null default true,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now()
);

alter table clients enable row level security;

drop policy if exists "clients_self_read" on clients;
create policy "clients_self_read" on clients for select
  using (
    auth_user_id = auth.uid()
    or exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
  );

drop policy if exists "clients_self_insert" on clients;
create policy "clients_self_insert" on clients for insert
  with check (
    auth_user_id = auth.uid()
    or exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
  );

drop policy if exists "clients_self_update" on clients;
create policy "clients_self_update" on clients for update
  using (
    auth_user_id = auth.uid()
    or exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
  )
  with check (
    auth_user_id = auth.uid()
    or exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
  );

-- ==========================================================
-- Liga os agendamentos a uma conta de cliente (quando existir)
-- ==========================================================

alter table appointments add column if not exists client_id uuid references clients(id);

-- A partir de agora, só pode criar agendamento quem está logada (cliente
-- dona do agendamento) ou uma profissional/administradora (agendamento
-- manual). Substitui a política antiga, que permitia qualquer visitante.
drop policy if exists "appointments_public_insert" on appointments;
drop policy if exists "appointments_insert" on appointments;
create policy "appointments_insert" on appointments for insert
  with check (
    exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
    or professional_id = (select id from professionals where lower(email) = lower(auth.jwt() ->> 'email'))
    or client_id = (select id from clients where auth_user_id = auth.uid())
  );

-- Leitura/edição: profissional dona, administradora, OU a cliente dona do agendamento
drop policy if exists "appointments_read" on appointments;
create policy "appointments_read" on appointments for select
  using (
    exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
    or professional_id = (select id from professionals where lower(email) = lower(auth.jwt() ->> 'email'))
    or client_id = (select id from clients where auth_user_id = auth.uid())
  );

drop policy if exists "appointments_update" on appointments;
create policy "appointments_update" on appointments for update
  using (
    exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
    or professional_id = (select id from professionals where lower(email) = lower(auth.jwt() ->> 'email'))
    or client_id = (select id from clients where auth_user_id = auth.uid())
  )
  with check (
    exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
    or professional_id = (select id from professionals where lower(email) = lower(auth.jwt() ->> 'email'))
    or client_id = (select id from clients where auth_user_id = auth.uid())
  );

-- a exclusão (delete) continua só para profissional/admin, como já era
