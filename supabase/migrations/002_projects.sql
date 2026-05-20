-- HandyDad AI — Projects + project_messages tables
-- Apply this manually via the Supabase SQL editor after 001_guides.sql.

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'active'
              check (status in ('active', 'completed', 'archived')),
  checklist   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

create table if not exists public.project_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists project_messages_project_created_idx
  on public.project_messages (project_id, created_at);

-- Trigger: bump projects.updated_at whenever a child message is inserted
create or replace function public.bump_project_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.projects
     set updated_at = now()
   where id = new.project_id;
  return new;
end;
$$;

drop trigger if exists project_messages_bump_parent on public.project_messages;
create trigger project_messages_bump_parent
  after insert on public.project_messages
  for each row execute function public.bump_project_updated_at();

-- Trigger: keep updated_at fresh on direct project edits too
create or replace function public.touch_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated on public.projects;
create trigger projects_touch_updated
  before update on public.projects
  for each row execute function public.touch_projects_updated_at();

-- RLS
alter table public.projects enable row level security;
alter table public.project_messages enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects for select using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects for insert with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects for delete using (auth.uid() = user_id);

drop policy if exists "project_messages_select_own" on public.project_messages;
create policy "project_messages_select_own"
  on public.project_messages for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_messages.project_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "project_messages_insert_own" on public.project_messages;
create policy "project_messages_insert_own"
  on public.project_messages for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_messages.project_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "project_messages_delete_own" on public.project_messages;
create policy "project_messages_delete_own"
  on public.project_messages for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_messages.project_id
        and p.user_id = auth.uid()
    )
  );
