-- Feature: Fast Interview Prep — store AI-drafted personalized answers alongside
-- the rest of the generated package. Additive + idempotent.

alter table public.interview_prep
  add column if not exists answers jsonb not null default '[]'::jsonb;
