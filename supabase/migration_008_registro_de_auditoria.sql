-- Studio Rosely Lebarch — migração: registro de auditoria
-- Rode este script em: Supabase Studio → SQL Editor → New query → Run
-- Pode ser executado mais de uma vez sem problema.

-- Guarda quem alterou o quê (e quando) em agendamentos e profissionais —
-- preenchido automaticamente por gatilhos no banco, então vale mesmo
-- para alterações feitas direto pela API, não só pela tela do site.
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_id uuid not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on audit_log (created_at desc);

alter table audit_log enable row level security;

drop policy if exists "audit_log_admin_read" on audit_log;
create policy "audit_log_admin_read" on audit_log for select
  using (exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin'));

-- Função genérica de auditoria: compara OLD/NEW e grava só os campos que
-- mudaram (em UPDATE), ou a linha inteira (em INSERT/DELETE).
create or replace function log_audit_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
  diff jsonb;
begin
  actor := lower(auth.jwt() ->> 'email');

  if (tg_op = 'UPDATE') then
    select jsonb_object_agg(o.key, jsonb_build_object('de', o.value, 'para', n.value))
      into diff
      from jsonb_each(to_jsonb(OLD)) o
      join jsonb_each(to_jsonb(NEW)) n using (key)
      where o.value is distinct from n.value;

    if diff is not null then
      insert into audit_log (actor_email, action, entity_type, entity_id, changes)
      values (actor, 'update', tg_table_name, NEW.id, diff);
    end if;
    return NEW;
  elsif (tg_op = 'INSERT') then
    insert into audit_log (actor_email, action, entity_type, entity_id, changes)
    values (actor, 'insert', tg_table_name, NEW.id, to_jsonb(NEW));
    return NEW;
  elsif (tg_op = 'DELETE') then
    insert into audit_log (actor_email, action, entity_type, entity_id, changes)
    values (actor, 'delete', tg_table_name, OLD.id, to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists appointments_audit on appointments;
create trigger appointments_audit
  after insert or update or delete on appointments
  for each row execute function log_audit_change();

drop trigger if exists professionals_audit on professionals;
create trigger professionals_audit
  after insert or update or delete on professionals
  for each row execute function log_audit_change();
