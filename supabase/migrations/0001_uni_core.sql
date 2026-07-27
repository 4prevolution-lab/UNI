-- UNI protected runtime v0.1
-- PostgreSQL / Supabase. Apply only inside a project controlled by UNI.

create extension if not exists pgcrypto;

create type public.uni_member_role as enum ('owner', 'facilitator', 'contributor', 'validator', 'observer');
create type public.uni_mission_status as enum ('draft', 'active', 'paused', 'complete', 'stopped');
create type public.uni_contribution_status as enum ('planned', 'active', 'review', 'validated', 'blocked');
create type public.uni_validation_decision as enum ('accepted', 'revision', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  locale text not null default 'fr-CA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  owner_id uuid not null references public.profiles(id),
  data_classification text not null default 'internal'
    check (data_classification in ('public', 'internal', 'confidential')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.uni_member_role not null,
  consent_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  outcome text not null,
  beneficiaries text not null default '',
  owner_id uuid not null references public.profiles(id),
  participation text not null check (participation in ('bénévole', 'éducative', 'rémunérée', 'hybride')),
  status public.uni_mission_status not null default 'draft',
  deadline date,
  success_criteria jsonb not null default '[]'::jsonb check (jsonb_typeof(success_criteria) = 'array'),
  stop_conditions jsonb not null default '[]'::jsonb check (jsonb_typeof(stop_conditions) = 'array'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.capabilities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  name text not null,
  required_level numeric not null default 1 check (required_level >= 0),
  available_level numeric not null default 0 check (available_level >= 0),
  vocabulary_uri text,
  created_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  role_label text not null default '',
  availability text not null default '',
  visibility text not null default 'mission' check (visibility in ('private', 'mission', 'public')),
  consent_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  title text not null,
  description text not null default '',
  status public.uni_contribution_status not null default 'planned',
  human_role text not null,
  ai_use text not null default 'Aucun',
  effort text not null default '',
  capability_ids uuid[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('document', 'link', 'dataset', 'observation')),
  reference text not null,
  note text not null default '',
  content_hash text check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
  storage_path text,
  submitted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.validations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  evidence_id uuid references public.evidence(id) on delete restrict,
  validator_id uuid not null references public.profiles(id),
  decision public.uni_validation_decision not null,
  rationale text not null check (char_length(rationale) >= 3),
  conflict_declared boolean not null default false,
  supersedes_id uuid references public.validations(id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create index on public.memberships(user_id) where revoked_at is null;
create index on public.missions(workspace_id);
create index on public.contributions(mission_id);
create index on public.evidence(contribution_id);
create index on public.validations(contribution_id);
create index on public.audit_events(workspace_id, created_at);

create or replace function public.uni_is_member(target_workspace uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and consent_at is not null
      and revoked_at is null
  );
$$;

create or replace function public.uni_has_role(target_workspace uuid, allowed public.uni_member_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and role = any(allowed)
      and consent_at is not null
      and revoked_at is null
  );
$$;

revoke all on function public.uni_is_member(uuid) from public;
revoke all on function public.uni_has_role(uuid, public.uni_member_role[]) from public;
grant execute on function public.uni_is_member(uuid) to authenticated;
grant execute on function public.uni_has_role(uuid, public.uni_member_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.missions enable row level security;
alter table public.capabilities enable row level security;
alter table public.participants enable row level security;
alter table public.contributions enable row level security;
alter table public.evidence enable row level security;
alter table public.validations enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles self read" on public.profiles for select using (id = auth.uid());
create policy "profiles self insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "workspace members read" on public.workspaces for select using (public.uni_is_member(id));
create policy "authenticated create workspace" on public.workspaces for insert to authenticated with check (owner_id = auth.uid());
create policy "workspace owners update" on public.workspaces for update using (public.uni_has_role(id, array['owner']::public.uni_member_role[]));

create policy "members read memberships" on public.memberships for select using (public.uni_is_member(workspace_id));
create policy "owners manage memberships" on public.memberships for all
  using (public.uni_has_role(workspace_id, array['owner']::public.uni_member_role[]))
  with check (public.uni_has_role(workspace_id, array['owner']::public.uni_member_role[]));

create policy "members read missions" on public.missions for select using (public.uni_is_member(workspace_id));
create policy "facilitators manage missions" on public.missions for all
  using (public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]))
  with check (public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]));

create policy "members read capabilities" on public.capabilities for select using (public.uni_is_member(workspace_id));
create policy "facilitators manage capabilities" on public.capabilities for all
  using (public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]))
  with check (public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]));

create policy "members read visible participants" on public.participants for select using (
  public.uni_is_member(workspace_id)
  and (visibility <> 'private' or user_id = auth.uid() or public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]))
);
create policy "facilitators manage participants" on public.participants for all
  using (public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]) or user_id = auth.uid())
  with check (public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]) or user_id = auth.uid());

create policy "members read contributions" on public.contributions for select using (public.uni_is_member(workspace_id));
create policy "contributors create contributions" on public.contributions for insert with check (
  created_by = auth.uid() and public.uni_has_role(workspace_id, array['owner','facilitator','contributor']::public.uni_member_role[])
);
create policy "authors and facilitators update contributions" on public.contributions for update
  using (created_by = auth.uid() or public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]))
  with check (created_by = auth.uid() or public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[]));

create policy "members read evidence" on public.evidence for select using (public.uni_is_member(workspace_id));
create policy "contributors submit evidence" on public.evidence for insert with check (
  submitted_by = auth.uid() and public.uni_has_role(workspace_id, array['owner','facilitator','contributor']::public.uni_member_role[])
);

create policy "members read validations" on public.validations for select using (public.uni_is_member(workspace_id));
create policy "validators create validations" on public.validations for insert with check (
  validator_id = auth.uid()
  and public.uni_has_role(workspace_id, array['owner','validator']::public.uni_member_role[])
);

create policy "members read audit" on public.audit_events for select using (public.uni_is_member(workspace_id));
create policy "members append audit" on public.audit_events for insert with check (
  actor_id = auth.uid() and public.uni_is_member(workspace_id)
);

create or replace function public.uni_bootstrap_workspace_owner()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.memberships (workspace_id, user_id, role, consent_at)
  values (new.id, new.owner_id, 'owner', now());
  return new;
end;
$$;

create trigger uni_workspace_owner_after_insert
after insert on public.workspaces
for each row execute function public.uni_bootstrap_workspace_owner();

create or replace function public.uni_hash_audit_event()
returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  head text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text, 0));
  select event_hash into head
  from public.audit_events
  where workspace_id = new.workspace_id
  order by created_at desc, id desc
  limit 1;
  new.previous_hash := coalesce(head, 'GENESIS');
  new.event_hash := encode(
    digest(
      concat_ws('|', new.workspace_id::text, coalesce(new.actor_id::text, ''), new.event_type,
        new.subject_type, coalesce(new.subject_id::text, ''), new.payload::text,
        new.previous_hash, new.created_at::text),
      'sha256'
    ),
    'hex'
  );
  return new;
end;
$$;

create trigger uni_audit_hash_before_insert
before insert on public.audit_events
for each row execute function public.uni_hash_audit_event();

-- No UPDATE or DELETE policies exist for evidence, validations, or audit_events:
-- corrections are additive and must supersede earlier records.

insert into storage.buckets (id, name, public, file_size_limit)
values ('uni-evidence', 'uni-evidence', false, 26214400)
on conflict (id) do nothing;

create policy "members read evidence objects" on storage.objects for select to authenticated using (
  bucket_id = 'uni-evidence'
  and public.uni_is_member(((storage.foldername(name))[1])::uuid)
);
create policy "contributors upload evidence objects" on storage.objects for insert to authenticated with check (
  bucket_id = 'uni-evidence'
  and public.uni_has_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','facilitator','contributor']::public.uni_member_role[]
  )
);
