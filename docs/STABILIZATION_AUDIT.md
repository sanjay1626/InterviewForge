# InterviewForge AI — Stabilization & Beta-Readiness Audit

_Scope: Behavioral Interview MVP (Phases 1–6). No new feature work. This document
recommends; a small set of clearly-beneficial, zero-behavior-change code/AI/DB
fixes were applied and are marked **[FIXED]**. Everything else is **[RECOMMEND]**._

Priority legend: **P0** blocker for beta · **P1** should fix before wide beta ·
**P2** polish / post-beta.

> **v1.1 hardening pass — applied since this audit was written** (all verified,
> gates green): **U1** chip touch targets now ≥44pt (min-height on filter chips,
> `hitSlop` on dense tag/grounding chips); **C1** recorder stops + releases the
> audio session on unmount; **C2** unmount guard around the voice screen's async
> `setState`; **C3** answer/transcript/follow-up length caps (client `maxLength`
> + server-side truncation in `evaluate-answer`); **D1** composite
> `(user_id, created_at)` indexes (`migration 0006`); **CI** GitHub Actions runs
> typecheck + test + export on every push/PR. Remaining items below are still
> open.

---

## 1. UX Polish — recommendations (not yet implemented)

The design system is already consistent (single `Button`, `Card`, `TextField`,
`Screen`, typography, and `spacing`/`radius`/`fontSize` tokens). The gaps are
mostly interaction feedback, touch targets, and warmth.

| # | Pri | Area | Finding | Recommendation |
|---|----|------|---------|----------------|
| U1 | **P0** | Accessibility / touch targets | Chips (filter chips in Story Vault & Progress, `TagInput` chips, grounding chips in STAR builder) use `paddingVertical: spacing.xs` (~24–32pt tall) — **below the 44pt minimum**. | Add `minHeight: 44` (or `hitSlop`) to all chip Pressables. Audit with the iOS Accessibility Inspector. |
| U2 | **P1** | Loading states | AI evaluation can take 5–15s; upload+ingest several seconds. Buttons show a spinner but there's no "this can take a moment" cue and no skeletons. | Add a subtitle under the evaluating button ("Grading against your experience…"), and skeleton placeholders on list screens' first load. |
| U3 | **P1** | Voice recording feedback | Only a text timer; no level meter or pulsing indicator; nav isn't locked during recording; permission-denied has no path to Settings. | Add a pulsing dot/animated ring, a "recording" haptic, and a `Linking.openSettings()` button when permission is denied. |
| U4 | **P1** | Success states | Inconsistent: skills screen shows a "Saved." caption; most flows rely on navigation. | Introduce one lightweight toast/snackbar component and use it for all save/delete confirmations. |
| U5 | **P1** | Error retry consistency | Query errors have a retry button (`ErrorView`); mutation errors show a caption only (user must re-tap the primary button). | Acceptable, but standardize: every failed mutation surfaces the same inline error + the primary button re-enables. Document the pattern. |
| U6 | P2 | Empty states | Text-only. | Add a small icon/illustration per empty state for warmth (Ionicons already available). |
| U7 | P2 | Motion | No micro-interactions beyond default stack/tab transitions and `Pressable` opacity. | Add `LayoutAnimation` when adding/removing tags & list items; a subtle fade-in on results; keep it minimal to avoid jank on Expo Go. |
| U8 | P2 | Haptics | None. | `expo-haptics` on record start/stop, submit, and destructive confirms. |
| U9 | P2 | Lists | Pull-to-refresh missing on Vault/Experience/Projects/Progress. | Add `RefreshControl` wired to each query's `refetch`. |
| U10 | P2 | Dark mode contrast | `brandDark #8AA0FF` and status colors on dark surfaces look fine but are unverified. | Run a WCAG AA contrast pass on text/brand/status pairs in both themes; adjust tokens if any pair < 4.5:1. |

**Do these before implementing:** U1 is the only true P0. The rest are additive
and should be scheduled, not rushed.

---

## 2. Code Audit

### Applied now — clearly beneficial, zero behavior change

| ✔ | Change |
|---|--------|
| **[FIXED]** | `theme.ts` — removed the `mode: 'light' as unknown as 'light'` + post-mutation hack; replaced with a clean `Theme` interface and two typed objects. |
| **[FIXED]** | Deduped the `notSignedIn`/inline "No active session" `AppError` (was copied in **6** hooks) → `noSessionError()` in `core/domain/errors.ts`. |
| **[FIXED]** | Deduped word-count / spoken-time math (was inline in **4** places) → `core/utils/text.ts` (`countWords`, `spokenSecondsForWords`, `estimateSpokenSeconds`); `star-helpers` now re-exports it. |
| **[FIXED]** | `SupabaseProfileRepository` had its own copy of `mapPostgrestError` → now uses the shared `core/supabase/errors.ts` one. |

### Recommended (needs judgement or is larger than a safe drive-by)

| # | Pri | Finding | Recommendation |
|---|----|---------|----------------|
| C1 | **P1** | **Memory/resource leak:** `useRecorder` never stops recording or resets the audio session on unmount. Leaving the voice screen mid-record keeps the mic/audio session active. | Add a cleanup `useEffect` that stops recording and calls `setAudioModeAsync({ allowsRecording: false })` on unmount. |
| C2 | **P1** | **Async race / setState-after-unmount:** the voice screen calls `setPhase`/`setTranscript` in async callbacks after `await`; navigating away mid-transcribe warns. | Guard with an `isMounted` ref (or `AbortController`) around the transcribe callbacks. |
| C3 | **P1** | **Unbounded input → cost/DoS:** free-text answers, stories, and experience fields have no max length. A huge answer is sent to the LLM (cost) and DB. The Edge Function truncates *grounding* but not the *answer*. | Cap answer length client-side (~4,000 chars) and in `evaluate-answer`; cap story/experience text fields with `maxLength`. |
| C4 | P2 | Large components: `StarStoryBuilder` (286 LOC), `OnboardingWizard` (261 LOC). | Extract per-step sub-components. Moderate benefit; do it when next touching them, not speculatively. |
| C5 | P2 | Composite-repository routing (`isGuestUserId(userId) || !cloud ? guest : cloud`) is repeated across ~6 composites. | Extract a `routeByUser(userId, guest, cloud)` helper. Low risk, modest DRY win. |
| C6 | P2 | `functions.invoke` failures are swallowed to `null` (correct for fallback) but lose diagnostics. | Add a dev-only `console.warn(error)` before falling back, gated on `__DEV__`. |
| C7 | P2 | `practice-ui-store.last` persists in memory across unrelated navigation; `clear()` is never called. | Clear it when leaving the practice flow, or key results by attempt id. Cosmetic. |
| C8 | P2 | Lists render with `.map` (no virtualization). Fine at current sizes (≤50 questions, ≤100 attempts). | Switch to `FlatList` if any list can grow unbounded (practice history). |

**Not problems (verified):** no service-role key in the app; `Result`/`AppError`
pattern is consistent across repositories; React Query dedupes the shared
`['profile', userId]` query used by the gate, dashboard, and knowledge hub (no
double fetch); `useSpeech` correctly stops on unmount.

---

## 3. AI Prompt Audit

Only one LLM prompt exists (`evaluate-answer`); `ingest-document` is
deterministic chunking and the STAR builder is fully non-AI.

| ✔ | Change (no product-behavior / schema change) |
|---|--------|
| **[FIXED]** | Tightened the `evaluate-answer` system prompt: explicit encouraging-but-honest **tone** and second person; reinforced **anti-fabrication** ("if it is not in the answer or verified facts, it does not exist"); required **overallScore consistency** with category scores; made **follow-ups answer-specific** (3–5, probing contribution/measurement/difficulty/reactions/change/lesson); capped list lengths (2–5) to keep responses tight; required a plain-language `changeExplanation`. |

**Recommended (P2):**
- **Prompt caching** — the system prompt is stable; add `cache_control` to it to cut cost/latency at scale.
- **Semantic grounding gap** — the evaluator retrieves experiences/projects/stories/skills but **not** resume `document_chunks`. Wire `match_document_chunks` (embed the answer) once an embeddings key is set, so resume facts also ground the evaluation.
- **Adaptive thinking** — consider `thinking: {type:"adaptive"}` for higher-quality grading (trade latency/cost); measure first.

The anti-fabrication posture is strong and consistent across the AI path, the
offline evaluator (invents nothing by construction), and the deterministic STAR
builder.

---

## 4. Database Audit

Schema is well-formed: 12 tables, owner-only RLS everywhere user data lives,
FKs with sensible `on delete` rules, `updated_at` triggers, HNSW vector index,
and storage policies scoped to `documents/{auth.uid()}/…`.

| # | Pri | Finding | Recommendation |
|---|----|---------|----------------|
| D1 | **P1** | List queries order by `created_at`/`updated_at` filtered by `user_id`, but indexes are single-column `(user_id)`. | Add composite indexes `(user_id, created_at desc)` on `practice_answers`, `star_stories`, `documents`, `work_experiences`, `projects` for the list paths. |
| D2 | **P1** | Edge Functions have no request-size or rate limits → AI/transcription cost exposure. | Enforce max answer/audio size (see C3) and add per-user rate limiting (Supabase function config or a simple `user_progress`-based counter). |
| D3 | P2 | `user_progress` exists but is unused (dashboard computes client-side). | Keep for V2 server aggregation, or populate via a trigger/Edge Function so multi-device users get consistent stats. Document the decision. |
| D4 | P2 | `behavioral_questions` is seeded in SQL **and** bundled in TS (`questions.ts`) — two sources of truth. | Low risk (app reads the bundle). Add a comment cross-linking them, or generate the seed from the bundle in CI. |
| D5 | P2 | No `supabase/seed.sql` for local `supabase db reset`. | Add one (or rely on migrations, which already seed) so `supabase start` gives a populated local DB. |

**Verified good:** RLS on every user-owned table; storage owner-folder policies;
`match_document_chunks` is `security invoker` and also filters `auth.uid()`;
migrations are idempotent (`if not exists` / `on conflict` / `drop policy`).

---

## 8. Final Product Review — four lenses

### 👔 Senior Product Manager
- **Strength:** a genuinely differentiated, defensible promise — *fact-grounded* coaching that never fabricates. The offline fallback means the core loop works with zero backend, which is great for demos and trials.
- **Weakness:** the value spine (record → evaluate → improve) is strong, but retention hooks are thin — no reminders, no streak nudges beyond a number, no "your stories are getting stronger" narrative.
- **Postpone:** Technical/Coding interviews, Career Coach (correctly deferred).
- **Move to V2:** mock-interview (multi-question) sessions; sharing/export of a polished answer.

### 🎨 Senior UX Designer
- **Strength:** consistent, calm design system; clear STAR scaffolding; honest AI/offline badges build trust.
- **Weakness:** interaction feedback (U1–U4) — sub-44pt chips, thin success/loading feedback, and no motion make it feel like a competent prototype rather than a shipped product.
- **Highest risk:** the voice flow — recording UX and permission edges are where first impressions break.

### 🛠️ Senior Software Engineer
- **Strength:** clean feature-first architecture, repository interfaces, `Result`/typed errors, guest/cloud composites, 57 passing tests, green `tsc`/`export`.
- **Weakness:** a few real correctness/leak items (C1–C3); `typedRoutes` disabled; no CI, no error monitoring, no analytics.
- **Highest risk:** unbounded LLM input (cost) and the recorder leak.

### 💰 VC Investor
- **Strength:** narrow, real wedge (behavioral prep) with a credible expansion path (technical → coding → career). The anti-fabrication stance is a trust moat and a marketing line.
- **Weakness:** thin moat on the AI itself (any competitor can call an LLM); the moat is the grounded knowledge base + workflow, which needs the resume-chunk grounding actually wired in to pay off.
- **Highest risk / diligence question:** unit economics of AI evaluation at scale (cost per practice), and retention.

---

## Prioritized recommendation ranking (all sections, by impact)

1. **P0 · U1** — fix sub-44pt touch targets (accessibility & App Store review risk).
2. **P1 · C3 + D2** — bound LLM/transcription input size and add rate limiting (cost/DoS).
3. **P1 · C1/C2** — recorder cleanup + unmount guards (correctness/leak).
4. **P1 · U2/U3/U4** — loading/recording/success feedback (perceived quality).
5. **P1 · D1** — composite indexes for list paths (perf as data grows).
6. **P1 · AI** — wire resume-chunk semantic grounding + prompt caching.
7. **P2** — motion, haptics, pull-to-refresh, empty-state art, component splits, `FlatList`, monitoring/analytics/CI.

---

## Version roadmap

### v1.1 — Beta hardening (this milestone)
- U1 touch targets; C1/C2 recorder + unmount safety; C3/D2 input caps + rate limiting; U2–U4 feedback polish; D1 indexes.
- Add **error monitoring** (Sentry) and **basic analytics** (screen views, practice completed, eval source).
- Turn `tsc`/`jest`/`expo export` into **CI** (GitHub Actions).
- Wire **resume-chunk grounding** + **prompt caching**.

### v2.0 — Depth on Behavioral
- Mock-interview (multi-question) sessions with a session-summary screen (schema already supports `practice_sessions`).
- Server-side `user_progress` aggregation for multi-device consistency.
- Answer history & trends ("this story improved from 62 → 84"); export/share a polished answer.
- Push reminders / streak nudges; richer empty-state onboarding.
- Re-enable typed routes (or migrate to an SDK where the generator behaves).

### v3.0 — Platform expansion (only after Behavioral is loved)
- Technical Interview module (system design / behavioral-technical hybrid).
- Coding Interview module.
- Career Coach.
- Team/coach dashboards; PDF resume/DOCX ingestion; multi-language.
