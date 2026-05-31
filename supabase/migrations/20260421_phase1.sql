create extension if not exists "pgcrypto";

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  offer_data jsonb not null,
  strategy_brief jsonb not null,
  generated_content jsonb not null,
  commerce_scores jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  title text not null
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.campaigns enable row level security;
alter table public.brands enable row level security;

create policy "campaigns_select_own"
on public.campaigns
for select
to authenticated
using (auth.uid() = user_id);

create policy "campaigns_insert_own_or_guest"
on public.campaigns
for insert
to authenticated, anon
with check (user_id is null or auth.uid() = user_id);

create policy "campaigns_update_own"
on public.campaigns
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "brands_select_own"
on public.brands
for select
to authenticated
using (auth.uid() = user_id);

create policy "brands_insert_own"
on public.brands
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "brands_update_own"
on public.brands
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
