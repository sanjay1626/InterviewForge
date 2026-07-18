# InterviewForge AI

Behavioral interview practice that helps you communicate your **real**
experience clearly — it never fabricates employment history, metrics, or
accomplishments.

Built with Expo + React Native + TypeScript, Expo Router, Supabase, and
TanStack Query.

> **Status: Phase 1 complete** — Expo shell, authentication (email/password +
> local guest mode), navigation with an auth/onboarding gate, Supabase client,
> and a 5-step onboarding flow. Later phases add the resume profile, STAR vault,
> practice, evaluation, voice, and progress dashboard.

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
