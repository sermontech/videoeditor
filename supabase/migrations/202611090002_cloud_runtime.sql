-- Invite-only Clear Take membership. Existing ecommerce identities remain untouched.
create table public.clear_take_members (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.clear_take_members enable row level security;
revoke all on public.clear_take_members from public, anon, authenticated;
grant select on public.clear_take_members to authenticated;
grant all on public.clear_take_members to service_role;
create policy clear_take_members_read on public.clear_take_members for select to authenticated using (owner_id = (select auth.uid()));
create function public.clear_take_can_access() returns boolean language sql stable set search_path = '' as $$
  select exists(select 1 from public.clear_take_members where owner_id = (select auth.uid()) and enabled);
$$;
revoke all on function public.clear_take_can_access() from public, anon;
grant execute on function public.clear_take_can_access() to authenticated, service_role;
create policy clear_take_profiles_members on public.clear_take_profiles as restrictive for all to authenticated using ((select public.clear_take_can_access())) with check ((select public.clear_take_can_access()));
create policy clear_take_projects_members on public.clear_take_projects as restrictive for all to authenticated using ((select public.clear_take_can_access())) with check ((select public.clear_take_can_access()));
create policy clear_take_assets_members on public.clear_take_assets as restrictive for all to authenticated using ((select public.clear_take_can_access())) with check ((select public.clear_take_can_access()));
create policy clear_take_generations_members on public.clear_take_generations as restrictive for all to authenticated using ((select public.clear_take_can_access())) with check ((select public.clear_take_can_access()));
create policy clear_take_feedback_members on public.clear_take_feedback as restrictive for all to authenticated using ((select public.clear_take_can_access())) with check ((select public.clear_take_can_access()));
create policy clear_take_storage_members on storage.objects as restrictive for all to authenticated
 using (bucket_id not in ('clear-take-media','clear-take-exports') or (select public.clear_take_can_access()))
 with check (bucket_id not in ('clear-take-media','clear-take-exports') or (select public.clear_take_can_access()));
alter table public.clear_take_projects add column audio_id uuid;
alter table public.clear_take_projects add column theme text not null default 'mint' check (theme in ('mint','lavender','clay'));
alter table public.clear_take_projects add constraint clear_take_audio_owner_fk foreign key (audio_id,owner_id) references public.clear_take_assets(id,owner_id);
alter table public.clear_take_generations add column worker_token uuid;
alter table public.clear_take_generations add column lease_until timestamptz;
alter table public.clear_take_generations add column attempts integer not null default 0;
alter table public.clear_take_generations add column version integer not null default 1;
alter table public.clear_take_generations add column layout jsonb not null default '[]';
alter table public.clear_take_generations add column size_bytes bigint;
create unique index clear_take_one_active_per_owner on public.clear_take_generations(owner_id) where status in ('queued','rendering');
-- Only the atomic, quota-controlled RPC can enqueue, not a direct REST INSERT.
revoke insert on public.clear_take_generations from authenticated;
revoke insert (id,owner_id,project_id,request) on public.clear_take_generations from authenticated;
revoke insert on public.clear_take_feedback from authenticated;
-- Durable quota ledger survives project deletion; clients cannot reset it.
create table public.clear_take_usage (
 owner_id uuid not null references auth.users(id) on delete cascade,
 usage_day date not null,
 render_count integer not null check (render_count between 1 and 20),
 primary key (owner_id,usage_day)
);
alter table public.clear_take_usage enable row level security;
revoke all on public.clear_take_usage from public,anon,authenticated;
grant select on public.clear_take_usage to authenticated;
grant all on public.clear_take_usage to service_role;
create policy clear_take_usage_read on public.clear_take_usage for select to authenticated using (owner_id=(select auth.uid()) and (select public.clear_take_can_access()));
create function public.clear_take_enqueue(p_project_id uuid) returns public.clear_take_generations
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); p public.clear_take_projects; b jsonb; result public.clear_take_generations; v integer;
begin
 if u is null or not exists(select 1 from public.clear_take_members where owner_id=u and enabled) then raise exception 'Clear Take membership required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into p from public.clear_take_projects where id=p_project_id and owner_id=u for update;
 if not found then raise exception 'Project not found'; end if;
 if not p.facts_confirmed or jsonb_array_length(p.scenes)=0 then raise exception 'Review your script before rendering'; end if;
 if exists(select 1 from public.clear_take_generations where owner_id=u and status in ('queued','rendering')) then raise exception 'A render is already queued or running'; end if;
 insert into public.clear_take_usage(owner_id,usage_day,render_count) values(u,(now() at time zone 'UTC')::date,1)
 on conflict(owner_id,usage_day) do update set render_count=public.clear_take_usage.render_count+1 where public.clear_take_usage.render_count<20;
 if not found then raise exception 'Daily render limit reached (20 per UTC day)'; end if;
 select brand into b from public.clear_take_profiles where owner_id=u;
 if b is null then raise exception 'Save your brand settings first'; end if;
 select coalesce(max(version),0)+1 into v from public.clear_take_generations where project_id=p.id;
 insert into public.clear_take_generations(owner_id,project_id,version,request)
 values(u,p.id,v,jsonb_build_object('title',p.title,'format',p.format,'scenes',p.scenes,'sources',p.sources,'audioId',p.audio_id,'brand',b,'factsConfirmed',true)) returning * into result;
 return result;
end; $$;
create function public.clear_take_claim(p_token uuid) returns setof public.clear_take_generations
language plpgsql security definer set search_path = '' as $$
begin
 update public.clear_take_generations set status='failed',error_message='Worker retry limit reached',worker_token=null,lease_until=null
 where status='rendering' and lease_until<now() and attempts>=3;
 return query with picked as (
  select id from public.clear_take_generations where attempts<3 and (status='queued' or (status='rendering' and lease_until<now()))
  order by created_at for update skip locked limit 1
 ) update public.clear_take_generations g set status='rendering',worker_token=p_token,lease_until=now()+interval '2 minutes',attempts=g.attempts+1,progress=0
 from picked where g.id=picked.id returning g.*;
end; $$;
create function public.clear_take_feedback_apply(p_generation_id uuid,p_kind text,p_note text default '') returns public.clear_take_feedback
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); result public.clear_take_feedback;
begin
 if u is null or not exists(select 1 from public.clear_take_members where owner_id=u and enabled) then raise exception 'Clear Take membership required' using errcode='42501'; end if;
 if p_kind not in ('keep','slower','larger') or p_note is null or char_length(p_note)>500 then raise exception 'Invalid review'; end if;
 perform 1 from public.clear_take_generations where id=p_generation_id and owner_id=u and status='complete' for update;
 if not found then raise exception 'Completed generation not found'; end if;
 insert into public.clear_take_feedback(owner_id,generation_id,kind,note) values(u,p_generation_id,p_kind,p_note) returning * into result;
 if p_kind='larger' then update public.clear_take_profiles set brand=jsonb_set(brand,'{fontSize}',to_jsonb(least(80,coalesce((brand->>'fontSize')::numeric,56)+4))) where owner_id=u;
 elsif p_kind='slower' then update public.clear_take_profiles set brand=jsonb_set(brand,'{pace}',to_jsonb(least(1.6,coalesce((brand->>'pace')::numeric,1)+0.15))) where owner_id=u; end if;
 return result;
end; $$;
create function public.clear_take_delete_project(p_project_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
 if u is null or not exists(select 1 from public.clear_take_members where owner_id=u and enabled) then raise exception 'Membership required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 perform 1 from public.clear_take_projects where id=p_project_id and owner_id=u for update;
 if not found then raise exception 'Project not found'; end if;
 if exists(select 1 from public.clear_take_generations where project_id=p_project_id and status in ('queued','rendering')) then raise exception 'Wait for the current render'; end if;
 delete from public.clear_take_projects where id=p_project_id and owner_id=u;
end; $$;
revoke delete on public.clear_take_projects from authenticated;
revoke all on function public.clear_take_enqueue(uuid), public.clear_take_claim(uuid), public.clear_take_feedback_apply(uuid,text,text), public.clear_take_delete_project(uuid) from public, anon, authenticated;
grant execute on function public.clear_take_enqueue(uuid), public.clear_take_feedback_apply(uuid,text,text), public.clear_take_delete_project(uuid) to authenticated;
grant execute on function public.clear_take_claim(uuid) to service_role;
