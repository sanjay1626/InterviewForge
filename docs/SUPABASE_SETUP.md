# Supabase Setup Guide — InterviewForge AI

This guide covers the full backend setup. It is written for the whole product,
but each step is tagged so you only do what the current phase needs:

- **[Phase 1]** — required now (auth + user_profiles + guest mode).
- **[Later]** — set up when the relevant phase lands (storage, ingestion,
  embeddings, Edge Functions, LLM secrets).

> ⚠️ **Never put the `service_role` key in the Expo app or in any
> `EXPO_PUBLIC_*` variable.** The app uses only the public **anon** key. The
> service role key belongs exclusively in server-side Edge Function secrets.

---

## 1. Create the Supabase project — [Phase 1]

1. Go to <https://supabase.com/dashboard> and sign in.
2. **New project** → pick an organization, name it `interviewforge`, set a strong
   database password (save it in your password manager), choose the region
   closest to your users.
3. Wait for provisioning to finish (~2 minutes).

## 2. Get the project URL and anon key — [Phase 1]

1. **Project Settings → API**.
2. Copy **Project URL** → this is `EXPO_PUBLIC_SUPABASE_URL`.
3. Under **Project API keys**, copy the **`anon` `public`** key → this is
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Leave the `service_role` key where it is. You will only use it later inside
   Edge Function secrets (step 12).

## 3. Configure Expo environment variables — [Phase 1]

1. In the project root, copy the template:
   ```bash
   cp .env.example .env
   ```
2. Fill in your values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
   ```
3. Restart the dev server so Expo re-inlines the variables:
   ```bash
   npx expo start -c
   ```
   `.env` is already gitignored. Only `EXPO_PUBLIC_*` names are exposed to the
   bundle by design.

> If you skip this step the app still runs — it falls back to **guest mode**
> (local-only). The Login/Register screens and Settings will show a "backend not
> configured" notice.

## 4. Install and link the Supabase client — [Phase 1] (already done)

The client is already installed and wired:

- `@supabase/supabase-js` + `react-native-url-polyfill` +
  `@react-native-async-storage/async-storage`.
- Client singleton: [`src/core/supabase/client.ts`](../src/core/supabase/client.ts)
  (AsyncStorage session persistence, auto token refresh, `detectSessionInUrl`
  off for native).

Nothing to do unless you upgrade dependencies.

## 5. Run database migrations — [Phase 1]

You can apply migrations two ways.

### Option A — SQL editor (fastest, no CLI)
1. Open **SQL Editor → New query** in the dashboard.
2. Paste the contents of
   [`supabase/migrations/0001_user_profiles.sql`](../supabase/migrations/0001_user_profiles.sql)
   and **Run**.

### Option B — Supabase CLI (recommended for teams)
1. Install: `npm i -g supabase` (or use `npx supabase`).
2. `supabase login`
3. `supabase link --project-ref YOUR-ref`
4. `supabase db push`

Verify: **Table Editor** should now show `public.user_profiles` with RLS enabled.

## 5b. Apply the Phase 2 migration — [Phase 2]

Run [`supabase/migrations/0002_knowledge_base.sql`](../supabase/migrations/0002_knowledge_base.sql)
the same way as step 5 (SQL Editor or `supabase db push`). It creates the
`documents`, `document_chunks`, `work_experiences`, and `projects` tables (all
with owner-only RLS), the `match_document_chunks` retrieval function, adds
`skills`/`certifications` to `user_profiles`, **enables pgvector**, and **creates
the private `documents` Storage bucket with owner-only object policies**.

So for Phase 2, steps 6, 7, and 8 below are **handled by the migration** — you do
not need to do them by hand. They're kept here for reference.

## 5c. Apply the Phase 3 migration — [Phase 3]

Run [`supabase/migrations/0003_star_stories.sql`](../supabase/migrations/0003_star_stories.sql)
to create the `star_stories` table (owner-only RLS, indexes, `updated_at`
trigger). No Storage, functions, or secrets are needed — the STAR vault and
guided builder are fully functional (and work in guest mode locally) once this
table exists.

## 5d. Apply the Phase 4 migration — [Phase 4]

Run [`supabase/migrations/0004_practice.sql`](../supabase/migrations/0004_practice.sql).
It creates the global read-only `behavioral_questions` catalog (seeded with 50
questions), plus `practice_sessions`, `practice_answers`, `answer_evaluations`,
and `user_progress` (all owner-only RLS). The app also bundles the question
library locally, so practice and the **offline** evaluator work with no backend
at all (guest mode).

## 5e. Apply the Phase 6 migration — [Phase 6]

Run [`supabase/migrations/0005_follow_ups.sql`](../supabase/migrations/0005_follow_ups.sql)
to create `follow_up_answers` (owner-only RLS) for follow-up practice. The
progress dashboard is computed on-device from your practice history, so it works
offline and for guests with no extra setup; `user_progress` (created in 0004)
remains available for future server-side aggregation.

## 5f. Apply the v1.1 index migration — [Recommended]

Run [`supabase/migrations/0006_list_indexes.sql`](../supabase/migrations/0006_list_indexes.sql)
to add composite `(user_id, created_at)` indexes for the list query paths. Pure
performance; no schema/behavior change.

## 6. Enable pgvector — [Handled by migration 0002]

The migration runs `create extension if not exists vector with schema extensions;`.
To do it manually instead: **Database → Extensions** → enable `vector`.

## 7. Create the private `documents` Storage bucket — [Handled by migration 0002]

The migration inserts the `documents` bucket (private). To do it manually:
**Storage → New bucket** → name `documents`, **uncheck "Public"**.

## 8. Apply Storage RLS policies — [Handled by migration 0002]

The migration creates owner-only policies restricting every object to
`documents/{auth.uid()}/...`. No manual step needed.

## 9. Configure email/password authentication — [Phase 1]

1. **Authentication → Providers → Email**: ensure **Email** is enabled.
2. **Authentication → Sign In / Providers → Email**:
   - For fastest local testing, you may **disable "Confirm email"** so sign-up
     returns a session immediately.
   - If you leave confirmation **on**, sign-up returns no session until the user
     confirms; the app surfaces a "confirm your email, then sign in" message
     (handled in `SupabaseAuthRepository.signUp`).
3. **Authentication → URL Configuration**: add your app scheme redirect
   `interviewforge://` (used later for deep links / password reset).

## 10. Enable anonymous authentication (only if you want cloud guest) — [Optional]

The app's **guest mode is fully local** (AsyncStorage) and needs **no** Supabase
anonymous auth — it works even with no backend. Enable Supabase Anonymous auth
only if, in a later phase, you want guest data to sync to the cloud:

1. **Authentication → Providers → Anonymous** → enable.

_Not required for Phase 1._

## 11. Deploy the ingestion Edge Function — [Phase 2]

Deploy `ingest-document` (chunks a resume and stores searchable chunks):

```bash
supabase functions deploy ingest-document
```

It runs with the caller's JWT (RLS-enforced) and needs **no service-role key**.
If it isn't deployed, resume upload still stores the file + document row, and the
app marks the document `failed` with a "deploy ingest-document" message and a
**Re-analyze** button.

**PDF support:** the function extracts text from PDFs server-side via `unpdf`
(bundled through the `npm:` import — no extra secret). The app uploads the raw
PDF to Storage and the function parses it; TXT/MD are read on-device and sent
inline. Scanned/image-only PDFs have no text layer and fail with a clear
message — use a text-based PDF or a `.txt` export. (Word `.docx` is not yet
supported.)

Deploy the Phase 4 answer evaluator and the Phase 5 transcriber the same way:

```bash
supabase functions deploy evaluate-answer
supabase functions deploy transcribe-audio
```

It also runs under the caller's JWT (RLS-enforced retrieval of the user's
profile, experiences, projects, and STAR stories as grounding) and needs an
`ANTHROPIC_API_KEY` secret (next step). Without it — or if it isn't deployed —
the app automatically falls back to its **offline heuristic** evaluator, which
never fabricates and marks missing facts as `[bracketed]` prompts.

## 12. Add embedding provider secret — [Optional in Phase 2, required for semantic search later]

Embeddings are **optional** right now: without a key, chunks are stored with
`embedding = null` and the feature still works (keyword-grounding). To enable
semantic retrieval, set an embeddings secret (server-side only, never in the app):

```bash
# OpenAI-compatible (default URL/model); dimension must match migration 0002 (1536)
supabase secrets set EMBEDDINGS_API_KEY=sk-...
# optional overrides:
supabase secrets set EMBEDDINGS_URL=https://api.openai.com/v1/embeddings
supabase secrets set EMBEDDINGS_MODEL=text-embedding-3-small
```

If you switch to a model with a different dimension, update the `vector(1536)`
size in `0002_knowledge_base.sql` and re-ingest.

For Phase 4 answer evaluation, set the Anthropic key as a function secret
(server-side only — never in the app):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional: override the default model (claude-opus-4-8)
supabase secrets set EVAL_MODEL=claude-sonnet-5
```

Without this key, `evaluate-answer` returns 501 and the app uses the offline
evaluator — the app stays fully functional, just without AI grounding.

For Phase 5 voice transcription, set a transcription provider key (also a
function secret; OpenAI-compatible Whisper endpoint by default):

```bash
supabase secrets set TRANSCRIBE_API_KEY=sk-...
# optional overrides:
supabase secrets set TRANSCRIBE_URL=https://api.openai.com/v1/audio/transcriptions
supabase secrets set TRANSCRIBE_MODEL=whisper-1
```

Without this key, `transcribe-audio` returns 501 and voice practice falls back
to manual transcript entry — the user simply types what they said, then submits
it for evaluation. TTS playback of the improved answer uses on-device speech
(expo-speech) and needs no key.

## 13. Test end-to-end — [Phase 1 subset]

Phase 1 testable paths:

1. **Guest:** launch app → **Continue as guest** → complete onboarding →
   land on Dashboard. Kill and relaunch → still signed in as guest.
2. **Register:** with keys configured → **Create an account** → onboarding →
   Dashboard. Confirm a row appears in `user_profiles` (Table Editor).
3. **Login:** sign out from Settings → sign back in → onboarding is skipped
   (profile already complete) → Dashboard.
4. **RLS:** in the SQL editor, `select * from user_profiles;` as the service role
   shows all rows; the app (anon + user JWT) only ever returns the signed-in
   user's row.

Phase 2 testable paths (after migration 0002 + deploying `ingest-document`):

5. **Resume upload:** Profile tab → Resume → upload a `.txt`/`.md` file →
   document appears and moves to **Analyzed** with a chunk count. Verify rows in
   `documents` and `document_chunks` (Table Editor).
6. **Storage:** the file is under `documents/{your-user-id}/…`; another user's
   JWT cannot read it (owner-only policy).
7. **Experience/Projects:** add, edit, delete entries → rows in
   `work_experiences` / `projects`, each scoped to your user id by RLS.
8. **Skills & certifications:** save on the Skills screen → `user_profiles.skills`
   / `certifications` update.

Retrieval / evaluation tests come online in later phases.

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| App shows "backend not configured" | `.env` missing or not reloaded | Create `.env`, then `npx expo start -c` |
| `Invalid login credentials` on correct password | Email confirmation on, account unconfirmed | Confirm the email or disable confirmation (step 9) |
| Sign-up succeeds but no session | Email confirmation enabled | Expected — confirm email then sign in |
| `new row violates row-level security policy` | Writing a profile whose `id` ≠ `auth.uid()` | The app sets `id` to the session user id; ensure you're authenticated |
| `permission denied for table user_profiles` | RLS on but policies not applied | Re-run migration `0001_user_profiles.sql` |
| Env vars `undefined` in app | Used a non-`EXPO_PUBLIC_` name | Prefix with `EXPO_PUBLIC_` and restart with `-c` |
| Metro cache / stale types | Old bundle | `npx expo start -c` and regenerate router types (`npx expo customize tsconfig.json`) |
| iOS Expo Go can't reach Supabase | Network / URL typo | Verify `EXPO_PUBLIC_SUPABASE_URL` has `https://` and correct ref |
| Resume uploads but document shows "Failed" | `ingest-document` not deployed | `supabase functions deploy ingest-document`, then tap **Re-analyze** |
| Upload error mentions bucket not found | Migration 0002 not applied | Run `0002_knowledge_base.sql` (creates the `documents` bucket) |
| Chunks stored but no embeddings | No embeddings key set | Optional — set `EMBEDDINGS_API_KEY` (step 12) and re-analyze |
| `relation "documents" does not exist` | Migration 0002 not applied | Apply `0002_knowledge_base.sql` |
