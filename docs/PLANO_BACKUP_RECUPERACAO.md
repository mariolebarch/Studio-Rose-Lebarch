# Plano de backup e recuperação — Studio Rosely Lebarch

Este documento explica o que já está protegido automaticamente e o que
fazer, passo a passo, se algo der errado (perda de dados ou suspeita de
invasão).

## 1. O que já existe automaticamente

- **Backup do banco de dados a cada 3 dias.** Um workflow do GitHub
  Actions (`.github/workflows/backup-keepalive.yml`) gera uma cópia
  completa do banco (`pg_dump`) e guarda como anexo ("artifact") da
  execução, por **35 dias**. Ou seja, a qualquer momento existem
  aproximadamente 11-12 backups guardados, cobrindo mais de um mês.
- **"Keep-alive" do projeto.** O mesmo workflow faz uma leitura simples
  na API a cada 3 dias para o projeto gratuito do Supabase não pausar
  por inatividade (projetos gratuitos pausam depois de ~7 dias sem uso).

Nenhuma dessas duas coisas depende de ação sua — já rodam sozinhas.

## 2. Como baixar um backup

1. Entre no GitHub, no repositório do site.
2. Clique na aba **"Actions"** (no menu superior do repositório).
3. Na lista da esquerda, clique em **"Backup e keep-alive do Supabase"**.
4. Escolha a execução ("run") da data que você quer — a lista mostra
   data e hora de cada uma.
5. Role até a seção **"Artifacts"**, no final da página daquela
   execução.
6. Clique em **"backup-supabase-AAAA-MM-DD"** para baixar o arquivo
   (`.sql.gz` — um arquivo compactado).

Esse arquivo contém todos os dados do banco naquele momento: profissionais,
serviços, agendamentos, clientes, etc.

## 3. Como restaurar um backup (se precisar)

Isso é um procedimento técnico — se você não se sentir segura fazendo
sozinha, me chame nesta conversa e eu faço com você, passo a passo.

1. Baixe o arquivo de backup mais recente (seção 2 acima) e descompacte
   (`.sql.gz` → `.sql`).
2. No painel do Supabase, vá em **Project Settings → Database** e copie
   a **"Connection string"** (a URI de conexão direta ao Postgres).
3. Em um computador com `psql` instalado, rode:
   ```
   psql "COLE_A_CONNECTION_STRING_AQUI" < backup-AAAA-MM-DD.sql
   ```
4. Isso recria as tabelas e os dados exatamente como estavam na data do
   backup escolhido.

**Atenção:** restaurar um backup **sobrescreve** os dados atuais pelos
dados daquela data — qualquer agendamento feito depois da data do backup
seria perdido. Por isso, só restaure se tiver certeza de que os dados
atuais estão corrompidos/perdidos, e se possível, confirme comigo antes.

## 4. Se suspeitar de invasão ou acesso indevido

Siga esta ordem:

1. **Troque sua senha imediatamente** (Configurações → Trocar senha) e
   peça para a Bete trocar a dela também.
2. **Revogue todas as sessões ativas.** No painel do Supabase, vá em
   **Authentication → Users**, clique no usuário suspeito e use a opção
   de encerrar sessões ("Sign out user" / "Revoke sessions"). Isso força
   um novo login em todos os dispositivos.
3. **Olhe o registro de auditoria** em `/admin/auditoria` no site — ele
   mostra quem alterou o quê e quando, nos agendamentos e nas
   profissionais. Veja se há alterações que vocês não reconhecem.
4. **Verifique a lista de profissionais cadastradas** (Profissionais, no
   menu) — confirme se não apareceu nenhuma conta estranha.
5. Se algo realmente parecer comprometido (login de IP desconhecido,
   dados alterados sem explicação), me avise nesta conversa com o que
   encontrou — posso ajudar a investigar mais a fundo pelos logs e, se
   necessário, trocar as chaves de API do projeto (uma ação mais
   drástica, que exige reimplantar o site).

## 5. Checklist mensal (leva 5 minutos)

- [ ] O workflow "Backup e keep-alive do Supabase" rodou nos últimos 3
      dias sem erro? (Veja em Actions — ícone verde = ok, vermelho =
      falhou e precisa de atenção.)
- [ ] O registro de auditoria (`/admin/auditoria`) não mostra nada fora
      do comum?
- [ ] A lista de profissionais só tem quem realmente deveria ter acesso?
- [ ] Ninguém esqueceu senha anotada em lugar visível/compartilhado?
