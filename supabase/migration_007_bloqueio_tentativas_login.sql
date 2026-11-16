-- Studio Rosely Lebarch — migração: registro de tentativas de login
-- (bloqueio temporário por excesso de tentativas incorretas)
-- Rode este script em: Supabase Studio → SQL Editor → New query → Run
-- Pode ser executado mais de uma vez sem problema.

create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_email_created_idx
  on login_attempts (lower(email), created_at desc);

alter table login_attempts enable row level security;

-- Ninguém acessa essa tabela pelo navegador — só a Edge Function
-- "secure-login", usando a chave de serviço (que ignora RLS). Por isso,
-- de propósito, nenhuma política de leitura/escrita é criada aqui: o
-- padrão do Postgres com RLS ligada é negar tudo que não tenha uma
-- política explícita.
