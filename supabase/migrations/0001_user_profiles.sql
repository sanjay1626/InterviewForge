-- Phase 1 — user_profiles
-- One row per authenticated user, created on onboarding completion.
-- Row-level security ensures each user can only see and modify their own row.

-- Reusable trigger to keep updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  display_name             text,
  target_role              text,
  experience_level         text,
  industry                 text,
  interview_goals          text[]      not null default '{}',
  preferred_practice_mode  text,
  onboarding_completed     boolean     not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.user_profiles is
  'Per-user onboarding profile and interview preferences.';

-- Index for the common "has this user onboarded?" lookups.
create index if not exists user_profiles_onboarding_idx
  on public.user_profiles (onboarding_completed);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Row-level security -------------------------------------------------------
alter table public.user_profiles enable row level security;

drop policy if exists "profiles: select own" on public.user_profiles;
create policy "profiles: select own"
  on public.user_profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.user_profiles;
create policy "profiles: insert own"
  on public.user_profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.user_profiles;
create policy "profiles: update own"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles: delete own" on public.user_profiles;
create policy "profiles: delete own"
  on public.user_profiles
  for delete
  using (auth.uid() = id);
