-- Feature: Mock Interview. Depends on 0001 (public.set_updated_at).
-- Five user-owned tables; owner-only RLS; indexes for the common lookups.

create table if not exists public.mock_interview_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  config         jsonb not null default '{}'::jsonb,
  status         text not null default 'in_progress'
                   check (status in ('in_progress', 'completed', 'abandoned')),
  plan           jsonb not null default '[]'::jsonb,
  question_count integer not null default 0,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists mock_sessions_user_idx
  on public.mock_interview_sessions (user_id, created_at desc);

drop trigger if exists mock_sessions_set_updated_at on public.mock_interview_sessions;
create trigger mock_sessions_set_updated_at
  before update on public.mock_interview_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.mock_interview_questions (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.mock_interview_sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  order_index integer not null default 0,
  kind        text,
  competency  text,
  prompt      text not null,
  created_at  timestamptz not null default now()
);
create index if not exists mock_questions_session_idx
  on public.mock_interview_questions (session_id, order_index);

create table if not exists public.mock_interview_answers (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.mock_interview_sessions (id) on delete cascade,
  question_id uuid references public.mock_interview_questions (id) on delete set null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  order_index integer not null default 0,
  question_text text not null,
  kind        text,
  competency  text,
  transcript  text not null default '',
  mode        text not null default 'voice',
  duration_ms integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists mock_answers_session_idx
  on public.mock_interview_answers (session_id, order_index);
create index if not exists mock_answers_user_idx
  on public.mock_interview_answers (user_id);

create table if not exists public.mock_interview_followups (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.mock_interview_sessions (id) on delete cascade,
  answer_id   uuid references public.mock_interview_answers (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  prompt      text not null,
  response    text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists mock_followups_answer_idx
  on public.mock_interview_followups (answer_id);

create table if not exists public.mock_interview_reports (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null unique references public.mock_interview_sessions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  overall_score integer not null default 0,
  report        jsonb not null default '{}'::jsonb,
  source        text not null default 'ai' check (source in ('ai', 'offline')),
  created_at    timestamptz not null default now()
);
create index if not exists mock_reports_user_idx
  on public.mock_interview_reports (user_id, created_at desc);

-- Row-level security: owner-only on every table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'mock_interview_sessions', 'mock_interview_questions', 'mock_interview_answers',
    'mock_interview_followups', 'mock_interview_reports'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: select own" on public.%I', t, t);
    execute format('create policy "%s: select own" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s: insert own" on public.%I', t, t);
    execute format('create policy "%s: insert own" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s: update own" on public.%I', t, t);
    execute format('create policy "%s: update own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s: delete own" on public.%I', t, t);
    execute format('create policy "%s: delete own" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;
