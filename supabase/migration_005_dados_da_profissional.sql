-- Studio Rosely Lebarch — migração: WhatsApp e InfinitePay no cadastro da profissional
-- Rode este script em: Supabase Studio → SQL Editor → New query → Run
-- Pode ser executado mais de uma vez sem problema.

alter table professionals add column if not exists whatsapp text not null default '';
alter table professionals add column if not exists infinite_tag text;
