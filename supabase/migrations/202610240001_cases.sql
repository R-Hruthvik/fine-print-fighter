create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  pack_id text not null check (pack_id in ('flight-delay', 'subscription-cancel', 'surprise-bill')),
  jurisdiction text not null check (jurisdiction in ('IN', 'EU', 'US')),
  documents jsonb not null,
  result jsonb not null,
  letter text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cases_user_updated_idx on public.cases (user_id, updated_at desc);
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users create own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users read own cases" on public.cases for select using (auth.uid() = user_id);
create policy "users create own cases" on public.cases for insert with check (auth.uid() = user_id);
create policy "users delete own cases" on public.cases for delete using (auth.uid() = user_id);
create or replace function public.touch_case_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger cases_touch_updated_at before update on public.cases for each row execute function public.touch_case_updated_at();
