-- Phase 3 — STAR Story Vault.
-- Depends on 0001 (public.set_updated_at).

create table if not exists public.star_stories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  situation     text,
  task          text,
  action        text,
  result        text,
  lesson        text,
  skills        text[] not null default '{}',
  competencies  text[] not null default '{}',
  company       text,
  project       text,
  tags          text[] not null default '{}',
  status        text not null default 'draft'
                  check (status in ('draft', 'needs_details', 'ready')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.star_stories is
  'User-authored STAR stories. All content is user-provided; never AI-fabricated.';

create index if not exists star_stories_user_idx on public.star_stories (user_id);
create index if not exists star_stories_status_idx on public.star_stories (status);

drop trigger if exists star_stories_set_updated_at on public.star_stories;
create trigger star_stories_set_updated_at
  before update on public.star_stories
  for each row execute function public.set_updated_at();

-- Row-level security: owner-only.
alter table public.star_stories enable row level security;

drop policy if exists "stories: select own" on public.star_stories;
create policy "stories: select own"
  on public.star_stories for select using (auth.uid() = user_id);

drop policy if exists "stories: insert own" on public.star_stories;
create policy "stories: insert own"
  on public.star_stories for insert with check (auth.uid() = user_id);

drop policy if exists "stories: update own" on public.star_stories;
create policy "stories: update own"
  on public.star_stories for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "stories: delete own" on public.star_stories;
create policy "stories: delete own"
  on public.star_stories for delete using (auth.uid() = user_id);
