-- Additive Clear Take foundation in the existing Seler Ecommerce project.
-- Shared Auth settings and unrelated tables/policies are intentionally untouched.
-- No IF NOT EXISTS: unexpected name collisions must fail, not silently adopt a resource.

create table public.clear_take_profiles (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  brand jsonb not null default '{"name":"Clear Take","background":"#172B2E","foreground":"#F6F2E9","accent":"#B8E3CC","fontSize":56,"pace":1}'::jsonb
    check (jsonb_typeof(brand) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clear_take_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  script text not null default '' check (char_length(script) <= 3000),
  format text not null default 'portrait' check (format in ('portrait','landscape','square')),
  scenes jsonb not null default '[]'::jsonb check (jsonb_typeof(scenes) = 'array' and jsonb_array_length(scenes) <= 12),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) <= 10),
  facts_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index clear_take_projects_owner_created on public.clear_take_projects(owner_id, created_at desc);

create table public.clear_take_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  kind text not null check (kind in ('image','video','audio')),
  object_path text not null unique check (
    split_part(object_path, '/', 1) = owner_id::text
    and char_length(object_path) <= 1024
    and object_path !~ '(^|/)\.\.(/|$)'
    and position('/' in object_path) > 0
  ),
  size_bytes bigint not null check (size_bytes between 1 and 104857600),
  mime_type text not null check (char_length(mime_type) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index clear_take_assets_owner_created on public.clear_take_assets(owner_id, created_at desc);

-- This is the durable render queue and history. Only a trusted worker may update it.
-- Queue consumption/claiming and runtime validation will be added with worker integration.
create table public.clear_take_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null,
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  status text not null default 'queued' check (status in ('queued','rendering','complete','failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  checks jsonb not null default '[]'::jsonb check (jsonb_typeof(checks) = 'array'),
  adjustments jsonb not null default '[]'::jsonb check (jsonb_typeof(adjustments) = 'array'),
  output_path text check (
    output_path is null or (
      split_part(output_path, '/', 1) = owner_id::text
      and char_length(output_path) <= 1024
      and output_path !~ '(^|/)\.\.(/|$)'
      and position('/' in output_path) > 0
    )
  ),
  error_message text check (char_length(error_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (project_id, owner_id) references public.clear_take_projects(id, owner_id) on delete cascade
);
create index clear_take_generations_owner_created on public.clear_take_generations(owner_id, created_at desc);
create index clear_take_generations_queue on public.clear_take_generations(created_at) where status = 'queued';

create table public.clear_take_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  generation_id uuid not null unique,
  kind text not null check (kind in ('keep','slower','larger')),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  foreign key (generation_id, owner_id) references public.clear_take_generations(id, owner_id) on delete cascade
);
create index clear_take_feedback_owner_created on public.clear_take_feedback(owner_id, created_at desc);

create function public.clear_take_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.clear_take_touch_updated_at() from public, anon, authenticated;
create trigger clear_take_profiles_updated before update on public.clear_take_profiles
  for each row execute function public.clear_take_touch_updated_at();
create trigger clear_take_projects_updated before update on public.clear_take_projects
  for each row execute function public.clear_take_touch_updated_at();
create trigger clear_take_generations_updated before update on public.clear_take_generations
  for each row execute function public.clear_take_touch_updated_at();

alter table public.clear_take_profiles enable row level security;
alter table public.clear_take_projects enable row level security;
alter table public.clear_take_assets enable row level security;
alter table public.clear_take_generations enable row level security;
alter table public.clear_take_feedback enable row level security;

revoke all on table public.clear_take_profiles, public.clear_take_projects, public.clear_take_assets,
  public.clear_take_generations, public.clear_take_feedback from public, anon, authenticated;
grant select, insert, update, delete on public.clear_take_profiles, public.clear_take_projects, public.clear_take_assets to authenticated;
grant select on public.clear_take_generations to authenticated;
grant insert (id, owner_id, project_id, request) on public.clear_take_generations to authenticated;
grant select, insert on public.clear_take_feedback to authenticated;
grant all on public.clear_take_profiles, public.clear_take_projects, public.clear_take_assets,
  public.clear_take_generations, public.clear_take_feedback to service_role;

create policy clear_take_profiles_owner on public.clear_take_profiles for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy clear_take_projects_owner on public.clear_take_projects for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy clear_take_assets_owner on public.clear_take_assets for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy clear_take_generations_read on public.clear_take_generations for select to authenticated
  using (owner_id = (select auth.uid()));
create policy clear_take_generations_enqueue on public.clear_take_generations for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'queued' and progress = 0 and output_path is null);
create policy clear_take_feedback_read on public.clear_take_feedback for select to authenticated
  using (owner_id = (select auth.uid()));
create policy clear_take_feedback_submit on public.clear_take_feedback for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (
    select 1 from public.clear_take_generations g
    where g.id = generation_id and g.owner_id = (select auth.uid()) and g.status = 'complete'
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('clear-take-media','clear-take-media',false,104857600,array[
    'image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm',
    'audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a'
  ]),
  ('clear-take-exports','clear-take-exports',false,209715200,array['video/mp4']);

create policy clear_take_media_owner on storage.objects for all to authenticated
  using (bucket_id = 'clear-take-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'clear-take-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy clear_take_exports_read on storage.objects for select to authenticated
  using (bucket_id = 'clear-take-exports' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Restrictive guards ensure a future unrelated permissive storage policy cannot
-- make these two buckets cross-user accessible. Other buckets pass unchanged.
create policy clear_take_storage_read_boundary on storage.objects as restrictive for select to anon, authenticated
  using (bucket_id not in ('clear-take-media','clear-take-exports') or (storage.foldername(name))[1] = (select auth.uid())::text);
create policy clear_take_storage_insert_boundary on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id not in ('clear-take-media','clear-take-exports') or
    (bucket_id = 'clear-take-media' and (storage.foldername(name))[1] = (select auth.uid())::text));
create policy clear_take_storage_update_boundary on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id not in ('clear-take-media','clear-take-exports') or
    (bucket_id = 'clear-take-media' and (storage.foldername(name))[1] = (select auth.uid())::text))
  with check (bucket_id not in ('clear-take-media','clear-take-exports') or
    (bucket_id = 'clear-take-media' and (storage.foldername(name))[1] = (select auth.uid())::text));
create policy clear_take_storage_delete_boundary on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id not in ('clear-take-media','clear-take-exports') or
    (bucket_id = 'clear-take-media' and (storage.foldername(name))[1] = (select auth.uid())::text));
