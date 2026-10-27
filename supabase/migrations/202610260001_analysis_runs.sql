-- Keep prior saved-case analyses and their letter drafts for private review.
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  analysis jsonb not null,
  letter text not null default '',
  created_at timestamptz not null default now(),
  constraint analysis_runs_analysis_object check (jsonb_typeof(analysis) = 'object'),
  constraint analysis_runs_letter_length check (char_length(letter) <= 30000)
);

create index if not exists analysis_runs_case_created_idx
  on public.analysis_runs (case_id, created_at desc);
create index if not exists analysis_runs_owner_created_idx
  on public.analysis_runs (owner_id, created_at desc);

alter table public.analysis_runs enable row level security;

drop policy if exists "read own analysis runs" on public.analysis_runs;
create policy "read own analysis runs" on public.analysis_runs
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "insert own analysis runs" on public.analysis_runs;
create policy "insert own analysis runs" on public.analysis_runs
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.cases
      where cases.id = analysis_runs.case_id
        and cases.owner_id = (select auth.uid())
    )
  );

drop policy if exists "delete own analysis runs" on public.analysis_runs;
create policy "delete own analysis runs" on public.analysis_runs
  for delete to authenticated
  using (owner_id = (select auth.uid()));
