-- UNI protected invitations v0.1
-- Plain invitation codes are returned once by RPC and never stored.

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  role public.uni_member_role not null check (role <> 'owner'),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses between 1 and 20),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.workspace_invites(workspace_id, expires_at);
alter table public.workspace_invites enable row level security;

create policy "authorized roles read invite metadata" on public.workspace_invites
for select using (
  public.uni_has_role(workspace_id, array['owner','facilitator']::public.uni_member_role[])
);

create or replace function public.uni_create_invite(
  target_workspace uuid,
  invited_role public.uni_member_role,
  lifetime_hours integer default 168,
  allowed_uses integer default 1
)
returns table(invite_code text, invite_expires_at timestamptz)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  generated_code text;
  generated_expiry timestamptz;
  caller_role public.uni_member_role;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if invited_role = 'owner' then raise exception 'Owner invitations are forbidden'; end if;
  if lifetime_hours < 1 or lifetime_hours > 720 then raise exception 'Invalid invitation lifetime'; end if;
  if allowed_uses < 1 or allowed_uses > 20 then raise exception 'Invalid invitation use limit'; end if;

  select role into caller_role
  from public.memberships
  where workspace_id = target_workspace
    and user_id = auth.uid()
    and consent_at is not null
    and revoked_at is null;

  if caller_role is null or caller_role not in ('owner', 'facilitator') then
    raise exception 'Invitation authority required';
  end if;
  if invited_role = 'facilitator' and caller_role <> 'owner' then
    raise exception 'Only an owner may invite a facilitator';
  end if;

  generated_code := encode(gen_random_bytes(24), 'hex');
  generated_expiry := now() + make_interval(hours => lifetime_hours);

  insert into public.workspace_invites
    (workspace_id, code_hash, role, created_by, expires_at, max_uses)
  values
    (target_workspace, encode(digest(generated_code, 'sha256'), 'hex'), invited_role,
     auth.uid(), generated_expiry, allowed_uses);

  insert into public.audit_events
    (workspace_id, actor_id, event_type, subject_type, payload, event_hash)
  values
    (target_workspace, auth.uid(), 'invite.created', 'workspace_invite',
     jsonb_build_object('role', invited_role, 'expires_at', generated_expiry, 'max_uses', allowed_uses),
     repeat('0', 64));

  return query select generated_code, generated_expiry;
end;
$$;

create or replace function public.uni_redeem_invite(invite_code text)
returns table(workspace_id uuid, assigned_role public.uni_member_role)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  invitation public.workspace_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'A UNI profile is required before joining';
  end if;

  select * into invitation
  from public.workspace_invites
  where code_hash = encode(digest(trim(invite_code), 'sha256'), 'hex')
  for update;

  if invitation.id is null then raise exception 'Invitation not found'; end if;
  if invitation.revoked_at is not null then raise exception 'Invitation revoked'; end if;
  if invitation.expires_at <= now() then raise exception 'Invitation expired'; end if;
  if invitation.use_count >= invitation.max_uses then raise exception 'Invitation exhausted'; end if;

  insert into public.memberships (workspace_id, user_id, role, consent_at)
  values (invitation.workspace_id, auth.uid(), invitation.role, now())
  on conflict (workspace_id, user_id) do update
    set consent_at = coalesce(public.memberships.consent_at, excluded.consent_at),
        revoked_at = null;

  update public.workspace_invites
  set use_count = use_count + 1
  where id = invitation.id;

  insert into public.audit_events
    (workspace_id, actor_id, event_type, subject_type, subject_id, payload, event_hash)
  values
    (invitation.workspace_id, auth.uid(), 'membership.joined', 'membership', auth.uid(),
     jsonb_build_object('role', invitation.role, 'invite_id', invitation.id),
     repeat('0', 64));

  return query select invitation.workspace_id, invitation.role;
end;
$$;

create or replace function public.uni_revoke_invite(target_invite uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  target_workspace uuid;
begin
  select workspace_id into target_workspace from public.workspace_invites where id = target_invite;
  if target_workspace is null then raise exception 'Invitation not found'; end if;
  if not public.uni_has_role(target_workspace, array['owner','facilitator']::public.uni_member_role[]) then
    raise exception 'Invitation authority required';
  end if;
  update public.workspace_invites set revoked_at = now()
  where id = target_invite and revoked_at is null;
end;
$$;

revoke all on function public.uni_create_invite(uuid, public.uni_member_role, integer, integer) from public;
revoke all on function public.uni_redeem_invite(text) from public;
revoke all on function public.uni_revoke_invite(uuid) from public;
grant execute on function public.uni_create_invite(uuid, public.uni_member_role, integer, integer) to authenticated;
grant execute on function public.uni_redeem_invite(text) to authenticated;
grant execute on function public.uni_revoke_invite(uuid) to authenticated;
