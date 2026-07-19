-- v1.1 hardening — composite indexes for the common "list my rows, newest first"
-- query paths (filter by user_id, order by created/updated). Complements the
-- existing single-column user_id indexes. Idempotent.

create index if not exists practice_answers_user_created_idx
  on public.practice_answers (user_id, created_at desc);

create index if not exists star_stories_user_updated_idx
  on public.star_stories (user_id, updated_at desc);

create index if not exists documents_user_created_idx
  on public.documents (user_id, created_at desc);

create index if not exists work_experiences_user_created_idx
  on public.work_experiences (user_id, created_at desc);

create index if not exists projects_user_created_idx
  on public.projects (user_id, created_at desc);

create index if not exists follow_up_answers_user_created_idx
  on public.follow_up_answers (user_id, created_at desc);
