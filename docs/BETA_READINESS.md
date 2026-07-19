# Beta Readiness Checklists

Status key: ✅ done · ⚠️ partial · ⬜ to do. Items reference the audit
(`STABILIZATION_AUDIT.md`) where relevant.

## Production checklist

- ✅ Green `npx tsc --noEmit`, `npm test` (57 tests), `npx expo export`.
- ✅ No hard-coded secrets; only `EXPO_PUBLIC_*` in the client; `.env` gitignored.
- ✅ Guest mode works fully offline; cloud features degrade gracefully (typed not-configured errors, offline evaluator, manual transcript).
- ✅ App-level `ErrorBoundary`; loading/empty/error states throughout.
- ✅ **CI** running tsc + jest + export on every push/PR (`.github/workflows/ci.yml`).
- ⬜ **Crash/error monitoring** (Sentry or similar) in the app and Edge Functions.
- ⬜ **Product analytics** (screen views, practice completed, eval source, funnel).
- ⚠️ **Input caps** applied (answer/transcript/follow-up length, client + server — audit C3). **Rate limiting** on Edge Functions still open (audit D2).
- ⬜ App version/build bump strategy; changelog.
- ⬜ Privacy policy + terms (the app stores user career data + audio).

## Security checklist

- ✅ Row-Level Security on every user-owned table (owner-only CRUD).
- ✅ Storage bucket private; object policies scoped to `documents/{auth.uid()}/…`.
- ✅ Edge Functions run under the **caller's JWT** (RLS-enforced retrieval); no service-role key in the app or client-reachable code.
- ✅ `match_document_chunks` is `security invoker` and also filters `auth.uid()`.
- ✅ Provider keys (`ANTHROPIC_API_KEY`, `TRANSCRIBE_API_KEY`, `EMBEDDINGS_API_KEY`) are **function secrets**, never shipped to the client.
- ⚠️ Guest data is stored **unencrypted** in AsyncStorage — acceptable for local demo; document it and avoid storing sensitive PII in guest mode.
- ⬜ Rate limiting / abuse protection on Edge Functions (cost + DoS).
- ⬜ Max-length validation on all free-text inputs (server + client).
- ⬜ Dependency audit (`npm audit`) triaged; pin transitive versions if needed.
- ⬜ Confirm email verification policy for production (currently may be disabled for testing).

## Performance checklist

- ✅ React Query caching + dedupe; `staleTime` set; no redundant profile fetches.
- ✅ `computeProgress` memoized; Zustand selectors avoid over-render.
- ⚠️ Lists use `.map` (fine ≤ ~100 rows). ⬜ Move practice history to `FlatList` before it grows (audit C8).
- ✅ Composite DB indexes `(user_id, created_at)` for list paths (`migration 0006`, audit D1).
- ⬜ LLM **prompt caching** on the stable system prompt (cost/latency).
- ⬜ Measure cold-start, bundle size (currently ~4.1 MB iOS JS), and eval latency; set budgets.
- ⬜ Image/audio payload sizes bounded before upload.

## Accessibility checklist

- ✅ `accessibilityRole`/`accessibilityLabel` on interactive components; `accessibilityState` for selected/disabled/busy.
- ✅ Buttons and inputs ≥ 44pt.
- ✅ Dynamic light/dark theming via `useColorScheme`.
- ✅ **Chips ≥ 44pt** (audit U1 — filter chips min-height 44; tag/grounding chips use `hitSlop`).
- ⬜ WCAG AA contrast pass in both themes (audit U10).
- ⬜ VoiceOver walkthrough of every screen; verify focus order and that score meters announce values.
- ⬜ Respect Dynamic Type / large font sizes (test at XXL).
- ⬜ Reduce-motion support once animations are added.

## iOS checklist

- ✅ Safe-area insets + `KeyboardAvoidingView` via `<Screen>`; portrait lock.
- ✅ Bundle id `ai.interviewforge.app`; scheme `interviewforge`; new architecture enabled.
- ✅ Microphone usage description via the `expo-audio` config plugin.
- ⬜ App icon/splash finalized for brand (currently template assets).
- ⬜ Test on a small device (iPhone SE) and a Dynamic Island device (15/16 Pro).
- ⬜ Expo Go SDK 54 confirmed on target devices (see setup guide for the SDK-pin story).
- ⬜ Standalone/dev build via EAS validated (recording/playback are more robust than Expo Go).
- ⬜ TestFlight build + external tester group; feedback loop.
- ⬜ App Store privacy nutrition labels (audio, career data).

## Supabase deployment checklist

- ✅ Migrations `0001`–`0006` are idempotent and ordered.
- ⬜ Apply all migrations to the beta project (SQL editor or `supabase db push`).
- ⬜ Enable **pgvector**, create the private **documents** bucket (both handled by `0002` if run).
- ⬜ Deploy Edge Functions: `ingest-document`, `evaluate-answer`, `transcribe-audio`.
- ⬜ Set function secrets: `ANTHROPIC_API_KEY` (+ optional `EVAL_MODEL`), `TRANSCRIBE_API_KEY`, optional `EMBEDDINGS_API_KEY`.
- ⬜ Configure Email auth provider (decide on email confirmation for prod).
- ⬜ Set project-level rate limits / spend alerts on the AI + transcription providers.
- ⬜ Back-up / point-in-time recovery enabled on the paid tier.
- ⬜ Verify RLS by testing cross-user access is denied (two accounts).
- ⬜ Smoke-test end to end: sign-up → onboarding → resume upload+ingest → story → text & voice practice → evaluation → follow-ups → progress.
