-- Studio Rosely Lebarch — migração: restringe o que a cliente pode alterar
-- no próprio agendamento (segurança)
-- Rode este script em: Supabase Studio → SQL Editor → New query → Run
-- Pode ser executado mais de uma vez sem problema.

-- Antes, a cliente logada podia enviar um UPDATE para a sua própria linha
-- de agendamento alterando QUALQUER coluna (profissional, data, horário,
-- preço implícito via service_ids etc.), não só cancelar. A tela do site
-- só mudava o status, mas nada no banco impedia um PATCH direto via API
-- alterando outros campos. Agora a política é dividida em duas: a
-- profissional/administradora continua com acesso total (criar, editar
-- qualquer campo); a cliente só pode alterar o próprio agendamento para
-- marcá-lo como "cancelado", mantendo todos os outros campos iguais.

drop policy if exists "appointments_update" on appointments;

create policy "appointments_update_staff" on appointments for update
  using (
    exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
    or professional_id = (select id from professionals where lower(email) = lower(auth.jwt() ->> 'email'))
  )
  with check (
    exists (select 1 from professionals p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.role = 'admin')
    or professional_id = (select id from professionals where lower(email) = lower(auth.jwt() ->> 'email'))
  );

drop policy if exists "appointments_update_client_cancel" on appointments;

create policy "appointments_update_client_cancel" on appointments for update
  using (
    client_id = (select id from clients where auth_user_id = auth.uid())
  )
  with check (
    client_id = (select id from clients where auth_user_id = auth.uid())
    and status = 'cancelado'
    and professional_id = (select a2.professional_id from appointments a2 where a2.id = appointments.id)
    and service_ids = (select a2.service_ids from appointments a2 where a2.id = appointments.id)
    and date = (select a2.date from appointments a2 where a2.id = appointments.id)
    and start_time = (select a2.start_time from appointments a2 where a2.id = appointments.id)
    and end_time = (select a2.end_time from appointments a2 where a2.id = appointments.id)
    and client_name = (select a2.client_name from appointments a2 where a2.id = appointments.id)
    and client_phone = (select a2.client_phone from appointments a2 where a2.id = appointments.id)
    and client_id = (select a2.client_id from appointments a2 where a2.id = appointments.id)
    and coalesce(notes, '') = (select coalesce(a2.notes, '') from appointments a2 where a2.id = appointments.id)
  );
