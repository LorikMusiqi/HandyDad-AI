-- HandyDad AI — Saved guides table
-- Apply this manually via the Supabase SQL editor.

create table if not exists public.saved_guides (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  content     text not null,
  tags        text[] not null default '{}',
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists saved_guides_user_created_idx
  on public.saved_guides (user_id, created_at desc);

alter table public.saved_guides enable row level security;

drop policy if exists "saved_guides_select_own" on public.saved_guides;
create policy "saved_guides_select_own"
  on public.saved_guides for select
  using (auth.uid() = user_id);

drop policy if exists "saved_guides_insert_own" on public.saved_guides;
create policy "saved_guides_insert_own"
  on public.saved_guides for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_guides_update_own" on public.saved_guides;
create policy "saved_guides_update_own"
  on public.saved_guides for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_guides_delete_own" on public.saved_guides;
create policy "saved_guides_delete_own"
  on public.saved_guides for delete
  using (auth.uid() = user_id);
