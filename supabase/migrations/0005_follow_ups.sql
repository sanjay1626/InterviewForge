-- Phase 6 — follow-up answers. Depends on 0004 (practice_answers).
-- Each row is a user's response to a realistic follow-up question, plus concise
-- feedback. Owner-only RLS.

create table if not exists public.follow_up_answers (
  id            uuid primary key default gen_random_uuid(),
  answer_id     uuid references public.practice_answers (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  prompt        text not null,
  response      text not null,
  overall_score integer not null default 0,
  feedback      text,
  created_at    timestamptz not null default now()
);

create index if not exists follow_up_answers_user_idx on public.follow_up_answers (user_id);
create index if not exists follow_up_answers_answer_idx on public.follow_up_answers (answer_id);

alter table public.follow_up_answers enable row level security;

drop policy if exists "follow_ups: select own" on public.follow_up_answers;
create policy "follow_ups: select own"
  on public.follow_up_answers for select using (auth.uid() = user_id);

drop policy if exists "follow_ups: insert own" on public.follow_up_answers;
create policy "follow_ups: insert own"
  on public.follow_up_answers for insert with check (auth.uid() = user_id);

drop policy if exists "follow_ups: update own" on public.follow_up_answers;
create policy "follow_ups: update own"
  on public.follow_up_answers for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "follow_ups: delete own" on public.follow_up_answers;
create policy "follow_ups: delete own"
  on public.follow_up_answers for delete using (auth.uid() = user_id);
