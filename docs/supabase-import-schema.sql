-- Tables for the admin spreadsheet paste import tool.
-- Run this in the Supabase SQL editor before using /admin/data-import.

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sailors', 'season_prices')),
  status text not null check (status in ('success', 'failed')),
  headers text[] not null default '{}',
  row_count integer not null default 0,
  valid_count integer not null default 0,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sailor_master (
  id uuid primary key default gen_random_uuid(),
  import_key text not null unique,
  personal_id text,
  name text not null,
  grade text not null,
  sailor_type text,
  job text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.season_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null unique,
  category text,
  pandemic text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.season_prices (
  id uuid primary key default gen_random_uuid(),
  import_key text not null unique,
  city text not null,
  item_name text not null,
  category text,
  pandemic text,
  base_price integer,
  pandemic_low integer,
  pandemic_high integer,
  boost_low integer,
  boost_high integer,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint season_prices_city_item_unique unique (city, item_name)
);

create index if not exists sailor_master_name_idx on public.sailor_master (name);
create index if not exists sailor_master_grade_idx on public.sailor_master (grade);
create index if not exists sailor_master_type_idx on public.sailor_master (sailor_type);
create index if not exists season_prices_city_idx on public.season_prices (city);
create index if not exists season_prices_item_idx on public.season_prices (item_name);
create index if not exists season_prices_category_idx on public.season_prices (category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sailor_master_updated_at on public.sailor_master;
create trigger set_sailor_master_updated_at
before update on public.sailor_master
for each row execute function public.set_updated_at();

drop trigger if exists set_season_items_updated_at on public.season_items;
create trigger set_season_items_updated_at
before update on public.season_items
for each row execute function public.set_updated_at();

drop trigger if exists set_season_prices_updated_at on public.season_prices;
create trigger set_season_prices_updated_at
before update on public.season_prices
for each row execute function public.set_updated_at();

alter table public.import_batches enable row level security;
alter table public.sailor_master enable row level security;
alter table public.season_items enable row level security;
alter table public.season_prices enable row level security;

-- The app writes through the server-side service role key.
-- Add anon/authenticated SELECT policies later only if these tables must be read directly from the browser.
