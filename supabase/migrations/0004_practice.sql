-- Phase 4 — Behavioral question library, practice sessions/answers, evaluations,
-- and the user_progress aggregate (used from Phase 6). Depends on 0001.

-- ---------------------------------------------------------------------------
-- behavioral_questions: a GLOBAL, read-only catalog (not user-owned).
-- The app also bundles the same library locally so it works offline / for
-- guests; this table exists for server-side use and analytics.
-- ---------------------------------------------------------------------------
create table if not exists public.behavioral_questions (
  id              uuid primary key default gen_random_uuid(),
  competency      text not null,
  prompt          text not null unique,
  is_foundational boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists behavioral_questions_competency_idx
  on public.behavioral_questions (competency);

alter table public.behavioral_questions enable row level security;

drop policy if exists "questions: read all (authenticated)" on public.behavioral_questions;
create policy "questions: read all (authenticated)"
  on public.behavioral_questions for select
  to authenticated
  using (true);

-- Seed (idempotent). 5 per competency; the three foundational questions first.
insert into public.behavioral_questions (competency, prompt, is_foundational)
values
  ('problem-solving', 'Tell me about a difficult problem you faced and how you solved it.', true),
  ('problem-solving', 'Describe a time you had to analyze a complex issue with limited information.', false),
  ('problem-solving', 'Tell me about a situation where your first solution did not work. What did you do next?', false),
  ('problem-solving', 'Describe a time you identified the root cause of a recurring problem.', false),
  ('problem-solving', 'Tell me about a creative or unconventional solution you came up with.', false),
  ('conflict-resolution', 'Tell me about a conflict or disagreement with a coworker.', true),
  ('conflict-resolution', 'Describe a time you disagreed with your manager. How did you handle it?', false),
  ('conflict-resolution', 'Tell me about a time you had to work with someone difficult.', false),
  ('conflict-resolution', 'Describe a situation where you had to mediate a disagreement between others.', false),
  ('conflict-resolution', 'Tell me about a time you received critical feedback you disagreed with.', false),
  ('failure-learning', 'Tell me about a failure or mistake and what you learned from it.', true),
  ('failure-learning', 'Describe a time a project did not go as planned.', false),
  ('failure-learning', 'Tell me about a goal you set but failed to reach.', false),
  ('failure-learning', 'Describe a decision you made that you later regretted.', false),
  ('failure-learning', 'Tell me about a time you received negative feedback and how you responded.', false),
  ('leadership', 'Tell me about a time you led a team or project.', false),
  ('leadership', 'Describe a situation where you had to motivate others.', false),
  ('leadership', 'Tell me about a time you had to make an unpopular decision.', false),
  ('leadership', 'Describe how you delegated work on an important initiative.', false),
  ('leadership', 'Tell me about a time you mentored or developed someone.', false),
  ('teamwork', 'Tell me about a time you collaborated to achieve a shared goal.', false),
  ('teamwork', 'Describe a situation where you supported a struggling teammate.', false),
  ('teamwork', 'Tell me about a time you had to compromise for the good of the team.', false),
  ('teamwork', 'Describe how you contributed to a team with diverse perspectives.', false),
  ('teamwork', 'Tell me about a time you helped resolve a team bottleneck.', false),
  ('ownership', 'Tell me about a time you took responsibility for a mistake.', false),
  ('ownership', 'Describe a situation where you went beyond your defined role.', false),
  ('ownership', 'Tell me about a time you owned a problem no one else would.', false),
  ('ownership', 'Describe how you followed through on a commitment under pressure.', false),
  ('ownership', 'Tell me about a time you took initiative without being asked.', false),
  ('adaptability', 'Tell me about a time you had to adapt to a significant change.', false),
  ('adaptability', 'Describe a situation where priorities shifted suddenly.', false),
  ('adaptability', 'Tell me about a time you had to learn something new quickly.', false),
  ('adaptability', 'Describe how you handled ambiguity on a project.', false),
  ('adaptability', 'Tell me about a time you adjusted your approach based on new information.', false),
  ('communication', 'Tell me about a time you explained a complex idea to a non-expert.', false),
  ('communication', 'Describe a situation where clear communication prevented a problem.', false),
  ('communication', 'Tell me about a time you had to deliver difficult news.', false),
  ('communication', 'Describe how you persuaded someone to your point of view.', false),
  ('communication', 'Tell me about a time a miscommunication caused an issue and how you fixed it.', false),
  ('customer-focus', 'Tell me about a time you went above and beyond for a customer or user.', false),
  ('customer-focus', 'Describe a situation where you balanced customer needs with business constraints.', false),
  ('customer-focus', 'Tell me about a time you turned an unhappy customer around.', false),
  ('customer-focus', 'Describe how you used customer feedback to improve something.', false),
  ('customer-focus', 'Tell me about a time you advocated for the user in a decision.', false),
  ('time-management', 'Tell me about a time you managed competing priorities.', false),
  ('time-management', 'Describe a situation where you met a tight deadline.', false),
  ('time-management', 'Tell me about a time you had to say no to protect your priorities.', false),
  ('time-management', 'Describe how you organized a large or long-running task.', false),
  ('time-management', 'Tell me about a time you recovered a project that was behind schedule.', false)
on conflict (prompt) do nothing;

-- ---------------------------------------------------------------------------
-- practice_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.practice_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  mode           text not null default 'text'
                   check (mode in ('text', 'voice', 'guided', 'mock')),
  status         text not null default 'completed'
                   check (status in ('active', 'completed')),
  question_count integer not null default 0,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists practice_sessions_user_idx on public.practice_sessions (user_id);

drop trigger if exists practice_sessions_set_updated_at on public.practice_sessions;
create trigger practice_sessions_set_updated_at
  before update on public.practice_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- practice_answers
-- ---------------------------------------------------------------------------
create table if not exists public.practice_answers (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references public.practice_sessions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  question_id   uuid references public.behavioral_questions (id) on delete set null,
  question_text text not null,
  competency    text,
  answer_text   text not null,
  mode          text not null default 'text',
  created_at    timestamptz not null default now()
);
create index if not exists practice_answers_user_idx on public.practice_answers (user_id);
create index if not exists practice_answers_session_idx on public.practice_answers (session_id);

-- ---------------------------------------------------------------------------
-- answer_evaluations (one per answer)
-- ---------------------------------------------------------------------------
create table if not exists public.answer_evaluations (
  id                 uuid primary key default gen_random_uuid(),
  answer_id          uuid not null references public.practice_answers (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  overall_score      integer not null default 0,
  scores             jsonb not null default '{}'::jsonb,
  strengths          text[] not null default '{}',
  missing_details    text[] not null default '{}',
  unsupported_claims text[] not null default '{}',
  suggested_followups text[] not null default '{}',
  recommendations    text[] not null default '{}',
  improved_answer    text,
  facts_used         text[] not null default '{}',
  missing_info       text[] not null default '{}',
  change_explanation text,
  source             text not null default 'ai' check (source in ('ai', 'offline')),
  created_at         timestamptz not null default now()
);
create index if not exists answer_evaluations_user_idx on public.answer_evaluations (user_id);
create index if not exists answer_evaluations_answer_idx on public.answer_evaluations (answer_id);

-- ---------------------------------------------------------------------------
-- user_progress (one row per user; populated from Phase 6)
-- ---------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  questions_practiced  integer not null default 0,
  sessions_completed   integer not null default 0,
  average_score        numeric not null default 0,
  competency_scores    jsonb not null default '{}'::jsonb,
  last_practiced_at    timestamptz,
  streak_days          integer not null default 0,
  updated_at           timestamptz not null default now()
);

drop trigger if exists user_progress_set_updated_at on public.user_progress;
create trigger user_progress_set_updated_at
  before update on public.user_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: owner-only on the user-owned practice tables.
-- ---------------------------------------------------------------------------
alter table public.practice_sessions enable row level security;
alter table public.practice_answers enable row level security;
alter table public.answer_evaluations enable row level security;
alter table public.user_progress enable row level security;

do $$
declare
  t text;
  col text;
begin
  foreach t in array array['practice_sessions', 'practice_answers', 'answer_evaluations', 'user_progress']
  loop
    col := case when t = 'user_progress' then 'user_id' else 'user_id' end;
    execute format('drop policy if exists "%s: select own" on public.%I', t, t);
    execute format('create policy "%s: select own" on public.%I for select using (auth.uid() = %I)', t, t, col);
    execute format('drop policy if exists "%s: insert own" on public.%I', t, t);
    execute format('create policy "%s: insert own" on public.%I for insert with check (auth.uid() = %I)', t, t, col);
    execute format('drop policy if exists "%s: update own" on public.%I', t, t);
    execute format('create policy "%s: update own" on public.%I for update using (auth.uid() = %I) with check (auth.uid() = %I)', t, t, col, col);
    execute format('drop policy if exists "%s: delete own" on public.%I', t, t);
    execute format('create policy "%s: delete own" on public.%I for delete using (auth.uid() = %I)', t, t, col);
  end loop;
end $$;
