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

## 6. Enable pgvector — [Later — Phase 2]

Needed for document embeddings / retrieval.

1. **Database → Extensions**.
2. Search `vector`, toggle it **on** (schema `extensions`).
   Or in SQL: `create extension if not exists vector with schema extensions;`

_Not required for Phase 1._

## 7. Create the private `documents` Storage bucket — [Later — Phase 2]

1. **Storage → New bucket** → name `documents`, **uncheck "Public"** (private).
2. This bucket will hold per-user resume uploads.

_Not required for Phase 1._

## 8. Apply Storage RLS policies — [Later — Phase 2]

Restrict every object to the owner's folder (`documents/{user_id}/...`). Example
policy set (run in SQL editor once the bucket exists):

```sql
-- Read/write only within your own user-id folder.
create policy "documents: read own"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents: write own"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents: update own"
  on storage.objects for update
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents: delete own"
  on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
```

_Not required for Phase 1._

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

## 11. Deploy Edge Functions — [Later — Phase 2+]

The document ingestion + AI evaluation functions are introduced in later phases
(`ingest-document`, retrieval, evaluation). When they exist:

```bash
supabase functions deploy ingest-document
supabase functions deploy evaluate-answer
```

_Not required for Phase 1._

## 12. Add LLM and embedding provider secrets — [Later — Phase 2+]

Set these as **Edge Function secrets** (server-side only), never in the app:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set EMBEDDINGS_API_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...   # for privileged writes inside functions
```

_Not required for Phase 1._

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

Upload / ingestion / retrieval / evaluation tests come online in later phases.

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
