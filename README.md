# Studio Rosely Lebarch — Nails Design

Site institucional + sistema de agendamento para o Studio Rosely Lebarch
(@studioroselebarch). Construído com React, TypeScript, Vite, Tailwind CSS,
React Router e **Supabase** (banco de dados Postgres + autenticação),
compartilhado entre todos os dispositivos.

## Configurando o Supabase (obrigatório)

O projeto Supabase já usado se chama **"Salão - Rosely"**. Para conectar:

1. **Rode o esquema do banco.** No [Supabase Studio](https://supabase.com/dashboard),
   abra o projeto → **SQL Editor** → **New query**, cole todo o conteúdo de
   `supabase/schema.sql` e clique em **Run**. Isso cria as tabelas
   (`professionals`, `services`, `professional_hours`, `blocked_dates`,
   `blocked_ranges`, `appointments`), as regras de segurança (RLS) e os
   serviços padrão da Rose.
2. **Crie as contas das duas profissionais iniciais.** Em **Authentication →
   Users → Add user**, crie um usuário para cada uma (marque "Auto Confirm
   User"), usando o mesmo e-mail cadastrado na tabela `professionals`
   (`roselebarch@gmail.com` para a Rose, administradora; `bete@gmail.com`
   para a Bete). É esse e-mail/senha que cada uma vai usar para entrar em
   `/login`. Novas profissionais cadastradas depois pela Rose em
   **Profissionais** (painel admin) já têm o login criado automaticamente
   pela Edge Function `create-professional-login` (veja "Edge Functions"
   abaixo) — não precisa repetir este passo manual para elas.
3. **Configure as variáveis de ambiente.** Em **Project Settings → API**,
   copie a **Project URL** e a chave **anon public**, e crie um arquivo
   `.env` na raiz do projeto (baseado em `.env.example`):

   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-public
   ```

   O arquivo `.env` não é versionado (está no `.gitignore`).

**Já tinha um banco rodando antes desta atualização?** Rode, na ordem,
`supabase/migration_002_multiplos_procedimentos.sql` (agendamentos com mais
de um procedimento) e `supabase/migration_003_multiplas_profissionais.sql`
(suporte a mais de uma profissional) no SQL Editor — ambos são seguros de
rodar sem apagar dados existentes.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

Build de produção:

```bash
npm run build
npm run preview
```

## Estrutura

- `/` — site institucional (hero, sobre, serviços, galeria, depoimentos,
  localização).
- `/agendar` — fluxo de agendamento dinâmico: profissional → procedimentos
  (é possível escolher mais de um, ex.: mãos + pés, no mesmo horário) →
  data → horário (calculado automaticamente pela duração total, horário de
  funcionamento e bloqueios daquela profissional) → dados do cliente →
  confirmação (com link para confirmar via WhatsApp).
- `/login` — acesso à área administrativa (e-mail e senha cadastrados no
  Supabase Auth).
- `/admin` — painel da profissional logada: dashboard, agenda (com opção de
  marcar um horário manualmente e de enviar um lembrete por WhatsApp para a
  cliente), bloqueio de datas/horários, gestão de serviços, horário de
  funcionamento e troca de senha. A administradora (papel `admin`) também
  enxerga a agenda de todas as profissionais e tem acesso a **Profissionais**,
  onde pode cadastrar novas profissionais.

## Múltiplas profissionais

Cada profissional tem seu próprio catálogo de serviços, horário de
funcionamento, bloqueios e agenda — totalmente independentes entre si. A
Rose (papel `admin`) enxerga e gerencia tudo, inclusive a agenda das
outras; as demais profissionais só veem o que é delas. Só a administradora
tem acesso a **Profissionais**, onde pode adicionar, editar e
ativar/desativar profissionais — o login de acesso de cada nova
profissional já é criado automaticamente (veja "Edge Functions" abaixo).

## Edge Functions

O projeto usa uma Edge Function do Supabase (`create-professional-login`)
para criar, com segurança, o login de uma profissional recém-cadastrada
pelo painel admin — essa é a única parte do sistema que roda código no
servidor (tudo o resto é um site estático). Ela é publicada automaticamente
pelo workflow `.github/workflows/deploy-functions.yml` sempre que algo
muda em `supabase/functions/`, usando dois valores do repositório:

- Secret `SUPABASE_ACCESS_TOKEN`: um token pessoal gerado em
  [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
- Variable `SUPABASE_PROJECT_REF`: a referência do projeto (o trecho antes
  de `.supabase.co` na Project URL).

A função em si usa `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY`, que o Supabase já injeta automaticamente em
toda Edge Function — não precisa configurar isso à parte.

## Adicionando as fotos reais do Instagram

O site foi montado com ilustrações no lugar das fotos porque este ambiente
de desenvolvimento não tem acesso ao Instagram. Veja
`public/images/README.md` para a lista exata de arquivos e onde cada um
aparece — basta soltar os arquivos na pasta com o nome certo, sem mexer em
código.

## Sobre a persistência de dados

Os dados (serviços, horário de funcionamento, bloqueios e agendamentos)
ficam em um banco Supabase (Postgres) compartilhado — clientes e a
profissional veem a mesma agenda, em qualquer dispositivo ou navegador.

Regras de acesso (Row Level Security):

- Qualquer visitante pode **ler** profissionais, serviços, horário de
  funcionamento e bloqueios, e **criar** um novo agendamento (necessário
  para o fluxo de `/agendar`).
- Cada profissional autenticada (login em `/login`) só pode **ver a lista
  completa de agendamentos** (nome/telefone das clientes) e **editar**
  serviços, horários e bloqueios que são dela. A administradora (papel
  `admin`) pode ver e editar os de todas.
- Só a administradora pode inserir/editar a tabela `professionals`
  (cadastrar novas profissionais).
- Para calcular os horários livres em `/agendar` sem expor nome/telefone
  de outras clientes, o site usa a função `get_booked_slots`, que devolve
  apenas os horários já ocupados de uma profissional específica (sem dados
  pessoais).

## Deploy (GitHub Pages)

O build de produção precisa das variáveis `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` definidas no momento do `npm run build` (elas são
"assadas" no bundle, pois o site é 100% estático). Se publicar via GitHub
Actions/Pages, configure essas duas variáveis como *secrets*/*variables* do
repositório e exporte-as antes do build.
