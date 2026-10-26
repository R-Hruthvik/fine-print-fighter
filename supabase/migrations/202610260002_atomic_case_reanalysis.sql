-- Archive the previous analysis and promote the new run as one transaction.
-- The function runs as the authenticated caller and keeps RLS in force.
create or replace function public.save_case_reanalysis(
  p_case_id uuid,
  p_analysis jsonb,
  p_letter text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_case record;
begin
  if p_analysis is null or jsonb_typeof(p_analysis) <> 'object'
    or p_letter is null or char_length(p_letter) > 30000 then
    raise exception 'Invalid analysis snapshot';
  end if;

  select id, owner_id, analysis, letter
    into current_case
    from public.cases
   where id = p_case_id
     and owner_id = (select auth.uid())
   for update;

  if not found then
    return false;
  end if;

  insert into public.analysis_runs (case_id, owner_id, analysis, letter)
  values (current_case.id, current_case.owner_id, current_case.analysis, current_case.letter);

  update public.cases
     set analysis = p_analysis,
         letter = p_letter,
         updated_at = now()
   where id = current_case.id
     and owner_id = (select auth.uid());

  if not found then
    raise exception 'Case update was not permitted';
  end if;
  return true;
end;
$$;

revoke all on function public.save_case_reanalysis(uuid, jsonb, text) from public;
grant execute on function public.save_case_reanalysis(uuid, jsonb, text) to authenticated;
