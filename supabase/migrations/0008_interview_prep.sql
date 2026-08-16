-- Feature: Fast Interview Prep. Depends on 0001 (public.set_updated_at).
-- One user-owned prep package per (resume + job description). Reuses existing
-- questions/answers/star_stories/practice_sessions tables — this table only
-- stores the generated package + its inputs.

create table if not exists public.interview_prep (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  document_id          uuid references public.documents (id) on delete set null,
  job_title            text not null default '',
  company              text not null default '',
  job_description      text not null default '',
  interview_date       date,
  -- Generated, grounded content (JobAnalysis, RequirementMatch[], PrepQuestion[],
  -- StudyTopic[], ReadinessScore[], SuggestedStory[], NeedsInput[]).
  analysis             jsonb not null default '{}'::jsonb,
  requirement_matches  jsonb not null default '[]'::jsonb,
  question_plan        jsonb not null default '[]'::jsonb,
  study_topics         jsonb not null default '[]'::jsonb,
  readiness            jsonb not null default '[]'::jsonb,
  suggested_stories    jsonb not null default '[]'::jsonb,
  needs_input          jsonb not null default '[]'::jsonb,
  source               text not null default 'offline'
                         check (source in ('ai', 'offline')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists interview_prep_user_idx
  on public.interview_prep (user_id, created_at desc);

drop trigger if exists interview_prep_set_updated_at on public.interview_prep;
create trigger interview_prep_set_updated_at
  before update on public.interview_prep
  for each row execute function public.set_updated_at();

-- Row-level security: owner-only.
alter table public.interview_prep enable row level security;

drop policy if exists "interview_prep: select own" on public.interview_prep;
create policy "interview_prep: select own" on public.interview_prep
  for select using (auth.uid() = user_id);

drop policy if exists "interview_prep: insert own" on public.interview_prep;
create policy "interview_prep: insert own" on public.interview_prep
  for insert with check (auth.uid() = user_id);

drop policy if exists "interview_prep: update own" on public.interview_prep;
create policy "interview_prep: update own" on public.interview_prep
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "interview_prep: delete own" on public.interview_prep;
create policy "interview_prep: delete own" on public.interview_prep
  for delete using (auth.uid() = user_id);
