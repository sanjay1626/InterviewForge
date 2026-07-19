# InterviewForge AI

Behavioral interview practice that helps you communicate your **real**
experience clearly — it never fabricates employment history, metrics, or
accomplishments.

Built with Expo + React Native + TypeScript, Expo Router, Supabase, and
TanStack Query.

> **Status: Phases 1–5 complete.**
> - **Phase 1** — Expo shell, auth (email/password + local guest mode),
>   navigation with an auth/onboarding gate, Supabase client, 5-step onboarding.
> - **Phase 2** — Knowledge base: resume upload (TXT/MD) with Storage +
>   `ingest-document` Edge Function chunking (embeddings optional), work
>   experience & project CRUD, skills/certifications, pgvector + retrieval RPC.
> - **Phase 3** — STAR Story Vault + guided, fact-preserving story builder.
> - **Phase 4** — Behavioral question library (50 questions), text practice, and
>   structured 10-point evaluation with a fact-preserving STAR improvement.
>   Grounded AI evaluation via the `evaluate-answer` Edge Function (Claude,
>   RLS-scoped retrieval); a deterministic offline evaluator is the fallback so
>   practice works with no backend and never fabricates.
> - **Phase 5** — Voice practice: record (expo-audio) → transcribe
>   (`transcribe-audio` Edge Function, provider-configurable) → correct the
>   transcript → evaluate through the Phase 4 pipeline; filler-word analysis and
>   text-to-speech playback (expo-speech) of the improved answer. Falls back to
>   manual transcript entry when transcription isn't configured.
>
> The remaining phase adds the progress dashboard, follow-up practice, and polish.

## Quick start

```bash
npm install
cp .env.example .env        # optional — app runs in guest mode without it
npx expo start -c           # then press "i" for iOS / scan the QR in Expo Go
```

See [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for the full backend
setup. Without Supabase keys the app runs in **guest mode** (local-only).

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` | Start and open iOS |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Jest suite |
| `npm run export` | Bundle with `expo export --platform ios` |

## Architecture

Feature-first, with the domain layer kept independent of React Native and
Supabase, behind repository interfaces.

```
app/                         # Expo Router routes (thin screens)
  _layout.tsx                #   providers + auth/onboarding gate
  welcome.tsx
  (auth)/ login | register
  (onboarding)/ index        #   OnboardingWizard host
  (app)/ dashboard | settings
src/
  core/
    config/env.ts            # EXPO_PUBLIC_* access, no secrets
    domain/                  # Result<T>, AppError — framework-free
    supabase/                # typed client + hand-kept Database types
    query/                   # React Query client
    ui/                      # Button, TextField, Screen, Card, state views, ErrorBoundary
    validation/              # pure validators
  features/
    auth/
      domain/                # AuthUser, AuthSession (no SDK types)
      data/                  # AuthRepository interface + Supabase/guest/composite impls
      store/                 # Zustand session state (lightweight UI state)
      hooks/                 # React Query mutations
      AuthProvider.tsx       # bootstraps + subscribes to session
    onboarding/
      domain/                # UserProfile, options, type guards
      data/                  # ProfileRepository + Supabase/guest/composite impls + mapper
      hooks/                 # profile query + completeOnboarding mutation
      components/            # OnboardingWizard, OptionGroup
      ProfileProvider.tsx
supabase/migrations/         # SQL (RLS-enabled)
docs/                        # setup guide
```

### Key decisions

- **Result + typed errors.** Repositories return `Result<T>` with a typed
  `AppError` (`code`, `retryable`). UI branches on this to render loading /
  empty / error (with retry) / success states.
- **Repository interfaces with composite impls.** `CompositeAuthRepository` and
  `CompositeProfileRepository` unify guest (AsyncStorage) and cloud (Supabase)
  behind one contract, so screens never care which backend is active.
- **Guest mode works with no backend.** Useful for demos and for running in
  Expo Go before Supabase is configured. Cloud-only actions are clearly gated.
- **Zustand only for session UI state**; server state lives in React Query.
- **Grounding-first product stance.** Copy throughout reinforces that the app
  only uses what the user provides.

## Testing

Provider/service unit tests (Jest, no native rendering required) cover the
validators and the auth/profile repositories, including guest persistence,
not-configured handling, Supabase mapping, and enum coercion.
