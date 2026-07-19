# Developer Guide

Everything an engineer needs to run, understand, test, and ship InterviewForge AI.

## 1. Prerequisites

- **Node** 20+ (developed on 24).
- **npm** 10+.
- **Expo Go** (iOS) on a physical device, or an iOS simulator (macOS).
- Expo SDK **54** — see [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for why the project is pinned to 54 and how to match your Expo Go.
- (Optional) **Supabase CLI** for migrations/functions; a Supabase project for cloud features.

## 2. Local setup

```bash
npm install                 # installs deps (uses --legacy-peer-deps semantics; already pinned)
cp .env.example .env         # optional — the app runs in guest mode without it
npx expo start -c            # -c clears the Metro cache; press "i" or scan the QR in Expo Go
```

Without `.env`, the app runs **guest / offline**: local auth, local data, the
offline evaluator, and manual voice transcript entry. Add Supabase keys to
unlock cloud accounts, storage, ingestion, and AI evaluation.

## 3. Environment variables

Only `EXPO_PUBLIC_*` vars are exposed to the client (by Expo). **Never** put a
service-role or provider secret in `.env` — those are Supabase **function
secrets**.

| Var | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` (client) | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` (client) | Public anon key |
| `ANTHROPIC_API_KEY` (+ opt. `EVAL_MODEL`) | Supabase function secret | AI answer evaluation (`evaluate-answer`) |
| `TRANSCRIBE_API_KEY` (+ opt. `TRANSCRIBE_URL`/`TRANSCRIBE_MODEL`) | Supabase function secret | Voice transcription (`transcribe-audio`) |
| `EMBEDDINGS_API_KEY` (+ opt. `EMBEDDINGS_URL`/`EMBEDDINGS_MODEL`) | Supabase function secret | Resume embeddings (`ingest-document`) |

After editing `.env`, restart with `npx expo start -c`.

## 4. Scripts

| Command | Purpose |
|---|---|
| `npm start` | Expo dev server |
| `npm run ios` | Start + open iOS |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest suite |
| `npm run export` | `expo export --platform ios` (production bundle sanity check) |

The three verification gates that must stay green: **`typecheck`**, **`test`**,
**`export`**.

## 5. Folder structure

```
app/                         # Expo Router routes (thin screens only)
  _layout.tsx                #   providers + auth/onboarding gate
  (auth)/ (onboarding)/ (app)/…
src/
  core/                      # framework-agnostic building blocks
    config/     env access (EXPO_PUBLIC_* only)
    domain/     Result<T>, AppError, competencies — no RN/Supabase imports
    supabase/   typed client, hand-kept Database types, shared error mappers
    data/       LocalCollection (guest storage)
    ui/         design system (Button, Card, Screen, Typography, states, ScoreBar…)
    utils/      id, utf8, text (word count / spoken time)
    validation/ pure validators
    query/      React Query client
  features/<feature>/        # feature-first; one folder per domain area
    domain/     types + pure logic (framework-free, unit-tested)
    data/       repository interface + Supabase / guest / composite impls + mappers
    hooks/      React Query hooks
    components/ feature UI
    store/      Zustand (lightweight UI state only)
    <Feature>Provider.tsx    # injects repositories (swappable in tests)
supabase/
  migrations/   0001…0005 (idempotent, ordered)
  functions/    ingest-document, evaluate-answer, transcribe-audio (Deno)
docs/           setup, audit, checklists, this guide
```

### Architectural rules

- **Domain is pure.** `src/**/domain` and `src/core/domain` never import React
  Native or Supabase. This keeps logic unit-testable and portable.
- **Repositories behind interfaces.** Every data source implements an interface;
  a **composite** routes guest (AsyncStorage) vs cloud (Supabase) by user id.
  Providers inject them so tests pass fakes.
- **`Result<T>` + typed `AppError`.** Repositories never throw for expected
  failures — they return `Result`. UI branches on `ok` and renders
  loading/empty/error(+retry)/success.
- **Zustand only for local UI/session state**; server state lives in React Query.
- **Grounding-first.** No AI or heuristic path may assert a fact the user didn't
  provide. Missing facts become editable `[brackets]`.

## 6. Testing

- Framework: **jest-expo** (`jest.config.js`), config in `jest.setup.js`
  (AsyncStorage mock). Tests are co-located under `__tests__/`.
- What's covered: pure domain logic (validators, STAR helpers, local evaluator,
  fillers, progress) and repository behavior with injected fakes / the
  AsyncStorage mock (guest CRUD, mappers, normalizers).
- Run: `npm test`. Add tests beside the code (`feature/domain/__tests__/…`).
- Prefer testing **domain + repositories** (fast, deterministic) over RN
  component rendering.

## 7. Database & Edge Functions

- Apply migrations: SQL editor, or `supabase db push` (needs `supabase link`).
  See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for the full, phase-tagged guide.
- Deploy functions: `supabase functions deploy <name>`; set secrets with
  `supabase secrets set KEY=…`. All functions run under the caller's JWT and
  return `501` when their provider key is missing so the app can fall back.
- Regenerate types after schema changes:
  `supabase gen types typescript --project-id <ref> > src/core/supabase/database.types.ts`
  (currently hand-maintained).

## 8. Build & deployment (Expo)

- **Expo Go** (dev): `npx expo start`. Audio recording/playback are best-effort
  in Expo Go; a dev build is more reliable.
- **Dev/standalone build**: EAS (`npx eas build -p ios --profile development`).
  The `expo-audio` config plugin supplies the microphone permission string.
- **Export sanity check**: `npm run export` bundles for iOS and catches
  Metro/asset issues without a full build.
- Known: `experiments.typedRoutes` is **off** — the SDK 54 typed-route generator
  mis-scans this `src/` layout. Route strings are plain (still valid); re-enable
  when the generator is fixed or on a newer SDK.

## 9. Conventions

- TypeScript strict; `@/` path alias → `src/`.
- Feature imports go through the feature's public surface (provider/hooks), not
  deep into another feature's `data/`.
- New screens: follow `docs/UI_CONSISTENCY.md` (design-system tokens only, all
  four states, ≥44pt targets, accessibility labels).
- Commit style: small, verified changes; keep `typecheck`/`test`/`export` green.
