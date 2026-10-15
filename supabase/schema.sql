-- FYTRACKER — schema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- Pode rodar de novo sem problema: tudo é "if not exists".

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Configurações por usuário (1 linha por conta)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  webhook_token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  cakto_secret       text,                      -- "secret" que a Cakto envia no payload (opcional)
  tax_rate           numeric(6,3) not null default 0,   -- imposto em % sobre o faturamento líquido
  meta_access_token  text,                      -- token do Meta (System User / long-lived)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Contas de anúncio do Meta conectadas
-- ─────────────────────────────────────────────────────────────
create table if not exists public.meta_ad_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  account_id      text not null,                -- sem o prefixo act_
  name            text not null,
  currency        text,
  timezone        text,
  active          boolean not null default true,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, account_id)
);

-- Campanhas / conjuntos / anúncios (status e orçamento)
create table if not exists public.meta_entities (
  user_id       uuid not null references auth.users(id) on delete cascade,
  level         text not null check (level in ('campaign','adset','ad')),
  entity_id     text not null,
  account_id    text not null,
  name          text not null,
  status        text,                           -- effective_status do Meta
  daily_budget  numeric(14,2),
  campaign_id   text,
  adset_id      text,
  updated_at    timestamptz not null default now(),
  primary key (user_id, level, entity_id)
);

-- Métricas diárias por anúncio
create table if not exists public.ad_insights (
  user_id             uuid not null references auth.users(id) on delete cascade,
  account_id          text not null,
  date                date not null,
  campaign_id         text not null,
  campaign_name       text,
  adset_id            text not null,
  adset_name          text,
  ad_id               text not null,
  ad_name             text,
  spend               numeric(14,2) not null default 0,
  impressions         bigint not null default 0,
  clicks              bigint not null default 0,
  link_clicks         bigint not null default 0,
  landing_page_views  bigint not null default 0,
  initiate_checkouts  bigint not null default 0,
  meta_purchases      bigint not null default 0,
  updated_at          timestamptz not null default now(),
  primary key (user_id, ad_id, date)
);
create index if not exists ad_insights_user_date on public.ad_insights (user_id, date);

-- ─────────────────────────────────────────────────────────────
-- Produtos (custo por unidade para o cálculo de lucro)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  external_id  text not null,                   -- id do produto na Cakto
  name         text not null,
  cost         numeric(14,2) not null default 0,
  created_at   timestamptz not null default now(),
  unique (user_id, external_id)
);

-- ─────────────────────────────────────────────────────────────
-- Vendas (vindas do webhook da Cakto)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.sales (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  platform         text not null default 'cakto',
  external_id      text not null,
  ref_id           text,
  status           text not null check (status in ('approved','pending','refused','refunded','chargeback')),
  payment_method   text not null default 'other' check (payment_method in ('pix','card','boleto','other')),
  product_id       text,
  product_name     text,
  offer_name       text,
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  gross_amount     numeric(14,2) not null default 0,   -- valor pago pelo cliente
  net_amount       numeric(14,2) not null default 0,   -- o que fica pra você (comissão de produtor)
  fees             numeric(14,2) not null default 0,   -- taxas da plataforma
  installments     int,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,
  utm_term         text,
  src              text,
  sck              text,
  campaign_id      text,
  adset_id         text,
  ad_id            text,
  occurred_at      timestamptz not null,               -- data usada nos relatórios
  paid_at          timestamptz,
  raw              jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, platform, external_id)
);
create index if not exists sales_user_occurred on public.sales (user_id, occurred_at);

-- Log bruto de todo webhook recebido (para depurar)
create table if not exists public.webhook_logs (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  platform     text not null,
  event        text,
  payload      jsonb,
  error        text,
  received_at  timestamptz not null default now()
);
create index if not exists webhook_logs_user on public.webhook_logs (user_id, received_at desc);

-- ─────────────────────────────────────────────────────────────
-- RLS: cada usuário só enxerga os próprios dados
-- (webhooks e sync usam a chave secreta no servidor, que ignora RLS)
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['settings','meta_ad_accounts','meta_entities','ad_insights','products','sales','webhook_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Cria a linha de settings automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
