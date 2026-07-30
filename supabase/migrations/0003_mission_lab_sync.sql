-- UNI Mission Lab normalized synchronization v0.1
-- Additive fields required to preserve the portable Mission Lab state.

alter table public.missions
  add column completed_criteria integer[] not null default '{}',
  add column settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  add column goalos jsonb not null default '{}'::jsonb check (jsonb_typeof(goalos) = 'object');

alter table public.participants
  add column capability_ids uuid[] not null default '{}';

create index on public.capabilities(mission_id);
create index on public.participants(mission_id);
create index on public.evidence(workspace_id, created_at);
create index on public.validations(workspace_id, created_at);

create or replace function public.uni_validate_mission_references()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from unnest(new.capability_ids) as requested(id)
    left join public.capabilities capability on capability.id = requested.id
    where capability.id is null
       or capability.workspace_id <> new.workspace_id
       or capability.mission_id <> new.mission_id
  ) then
    raise exception 'Capability belongs to another mission';
  end if;

  if tg_table_name = 'contributions' and new.participant_id is not null and not exists (
    select 1
    from public.participants participant
    where participant.id = new.participant_id
      and participant.workspace_id = new.workspace_id
      and participant.mission_id = new.mission_id
  ) then
    raise exception 'Participant belongs to another mission';
  end if;
  return new;
end;
$$;

create trigger uni_participant_references_before_write
before insert or update on public.participants
for each row execute function public.uni_validate_mission_references();

create trigger uni_contribution_references_before_write
before insert or update on public.contributions
for each row execute function public.uni_validate_mission_references();
