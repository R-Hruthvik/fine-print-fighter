-- Apply with the Supabase CLI or SQL editor. Case documents/results are private to their owner.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The earlier local migration used the same table names with legacy column names.
-- Add newer profile fields in place so existing profile rows remain linked to auth.users.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  pack_id text not null,
  jurisdiction text not null,
  documents jsonb not null,
  analysis jsonb not null,
  letter text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade the legacy cases table in place. PostgreSQL preserves its rows and
-- constraints when columns are renamed, including the auth.users foreign key.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'user_id')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'owner_id') then
    alter table public.cases rename column user_id to owner_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'company')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'company_name') then
    alter table public.cases rename column company to company_name;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'result')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'analysis') then
    alter table public.cases rename column result to analysis;
  end if;
end;
$$;

-- Legacy saves stored their source text in one JSON object. Convert those rows
-- to the labeled document array used by the current review and reanalysis flows.
do $$
begin
  if exists (select 1 from pg_trigger where tgrelid = 'public.cases'::regclass and tgname = 'cases_touch_updated_at' and not tgisinternal) then
    alter table public.cases disable trigger cases_touch_updated_at;
  end if;
end;
$$;

update public.cases
set documents = jsonb_build_array(
  jsonb_build_object(
    'label', 'Primary document',
    'text', coalesce(documents ->> 'documentText', documents ->> 'text', documents::text)
  ),
  jsonb_build_object('label', 'Company response', 'text', coalesce(documents ->> 'companyResponse', ''))
) || case
  when jsonb_typeof(documents -> 'additionalDocuments') = 'array' then documents -> 'additionalDocuments'
  else '[]'::jsonb
end
where jsonb_typeof(documents) = 'object';

-- Keep unusual legacy result payloads intact while making the column an object
-- so the current saved-case reader can safely inspect it.
update public.cases
set analysis = jsonb_build_object('legacyResult', analysis)
where jsonb_typeof(analysis) <> 'object';

do $$
begin
  if exists (select 1 from pg_trigger where tgrelid = 'public.cases'::regclass and tgname = 'cases_touch_updated_at' and not tgisinternal) then
    alter table public.cases enable trigger cases_touch_updated_at;
  end if;
end;
$$;

-- Add current constraints to legacy tables as well as newly-created tables.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.cases'::regclass and conname = 'cases_company_name_length_check') then
    alter table public.cases add constraint cases_company_name_length_check check (char_length(company_name) between 1 and 200);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.cases'::regclass and conname = 'cases_pack_id_format_check') then
    alter table public.cases add constraint cases_pack_id_format_check check (pack_id ~ '^[a-z]+(-[a-z]+)+$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.cases'::regclass and conname = 'cases_jurisdiction_check') then
    alter table public.cases add constraint cases_jurisdiction_check check (jurisdiction in ('IN', 'EU', 'US'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.cases'::regclass and conname = 'cases_documents_shape_check') then
    alter table public.cases add constraint cases_documents_shape_check check (jsonb_typeof(documents) = 'array' and jsonb_array_length(documents) between 2 and 20 and octet_length(documents::text) <= 250000);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.cases'::regclass and conname = 'cases_analysis_shape_check') then
    alter table public.cases add constraint cases_analysis_shape_check check (jsonb_typeof(analysis) = 'object' and octet_length(analysis::text) <= 1000000);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.cases'::regclass and conname = 'cases_letter_length_check') then
    alter table public.cases add constraint cases_letter_length_check check (char_length(letter) <= 30000);
  end if;
end;
$$;

create index if not exists cases_owner_updated_idx on public.cases(owner_id, updated_at desc);

-- Remove permissive policies from the old schema before installing the current
-- owner_id policies below. RLS remains enabled throughout the upgrade.
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users create own profile" on public.profiles;
drop policy if exists "users read own cases" on public.cases;
drop policy if exists "users create own cases" on public.cases;
drop policy if exists "users delete own cases" on public.cases;

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
