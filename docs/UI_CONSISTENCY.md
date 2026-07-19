# UI Consistency Checklist

Every screen must draw from the single design system in `src/core/ui/`. This
checklist confirms consistency and flags the few exceptions to fix.

## The single source of truth

| Concern | Token / component | Location |
|---|---|---|
| Spacing | `spacing.xs|sm|md|lg|xl|xxl` (4/8/12/16/24/32) | `core/ui/theme.ts` |
| Corner radius | `radius.sm|md|lg|pill` (8/12/20/999) | `core/ui/theme.ts` |
| Font sizes | `fontSize.xs…xxl` | `core/ui/theme.ts` |
| Colors | `useTheme()` (light/dark) | `core/ui/theme.ts` |
| Buttons | `<Button variant="primary|secondary|ghost|danger">` | `core/ui/Button.tsx` |
| Text | `<Title> <Subtitle> <Body> <Caption>` | `core/ui/Typography.tsx` |
| Inputs | `<TextField>`, `<TagInput>` | `core/ui/` |
| Cards | `<Card>` | `core/ui/Card.tsx` |
| Options | `<OptionGroup>` | `core/ui/OptionGroup.tsx` |
| States | `<LoadingView> <EmptyView> <ErrorView>` | `core/ui/StateViews.tsx` |
| Meters | `<ScoreBar>` | `core/ui/ScoreBar.tsx` |
| Screen shell | `<Screen>` (safe-area + keyboard + footer) | `core/ui/Screen.tsx` |

## Consistency confirmations

- [x] **Spacing** — every screen uses `spacing.*` tokens (a handful of raw values remain: `gap: 2` in the Progress stat tiles, `minHeight` on multiline inputs/state views). _Action: replace stray raw values with tokens (P2)._
- [x] **Buttons** — all CTAs use `<Button>`; single 48pt min height; 4 variants; consistent `loading`/`disabled` handling.
- [x] **Typography** — all text uses the four typography components; no raw `<Text>` with ad-hoc sizes in screens.
- [x] **Iconography** — all icons are Ionicons via `@expo/vector-icons`; outline style used consistently in tabs and rows.
- [x] **Cards** — all cards use `<Card>` (one radius `radius.lg`, one border treatment, `selected` state for emphasis).
- [x] **Corner radius** — sourced only from `radius.*` (buttons `md`, cards `lg`, chips/meters `pill`, inputs `md`).
- [ ] **Shadows / elevation** — **Intentionally none today** (flat, border-only design). This *is* consistent, but undecided: either keep flat (document it) or introduce one elevation token for cards/modals. _Decision needed (P2)._
- [x] **Color** — single `useTheme()` palette, light + dark; `textOnBrand` used on brand/danger buttons; status colors (`success`/`warning`/`danger`) used consistently for score/state meaning.
- [x] **Empty / loading / error** — the three `StateViews` components are used across list and detail screens.
- [ ] **Touch targets** — buttons/inputs meet 44pt; **chips do not** (filter/tag/grounding chips ~24–32pt). _Fix (P0, see audit U1)._
- [x] **Accessibility labels/roles** — `Button`, `Card`, `TextField`, `ScoreBar`, filter chips, and option cards expose `accessibilityRole`/`accessibilityLabel`/`accessibilityState`.

## Rules for new screens (keep it consistent)

1. Wrap content in `<Screen>` (never hand-roll SafeArea/scroll/keyboard).
2. Only `spacing.*`, `radius.*`, `fontSize.*`, and `useTheme()` colors — no literals.
3. CTAs are `<Button>`; text is the typography components; containers are `<Card>`.
4. Every async surface renders all four states (loading / empty / error+retry / success).
5. Interactive elements: `accessibilityRole` + label, and a ≥44pt touch target.
6. Icons: Ionicons outline set only.
