-- Apply with the Supabase CLI or SQL editor. Case documents/results are private to their owner.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 200),
  pack_id text not null check (pack_id ~ '^[a-z]+(-[a-z]+)+$'),
  jurisdiction text not null check (jurisdiction in ('IN', 'EU', 'US')),
  documents jsonb not null check (jsonb_typeof(documents) = 'array' and jsonb_array_length(documents) between 2 and 20 and octet_length(documents::text) <= 250000),
  analysis jsonb not null check (jsonb_typeof(analysis) = 'object' and octet_length(analysis::text) <= 1000000),
  letter text not null check (char_length(letter) <= 30000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cases_owner_updated_idx on public.cases(owner_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.cases enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "read own cases" on public.cases;
create policy "read own cases" on public.cases for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "insert own cases" on public.cases;
create policy "insert own cases" on public.cases for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "update own cases" on public.cases;
create policy "update own cases" on public.cases for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "delete own cases" on public.cases;
create policy "delete own cases" on public.cases for delete to authenticated using (owner_id = (select auth.uid()));

-- Create a profile on signup. Existing accounts can be backfilled with INSERT ... SELECT from auth.users.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'name', '') from auth.users
on conflict (id) do nothing;
