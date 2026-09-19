# Integration status

## Supabase

The Supabase project is connected and active:

- Project: **TeachCraft AI**
- Region: **Mumbai (`ap-south-1`)**
- Project cost check: **$0 monthly**
- Schema migrations: initial schema, teaching memory, and security/performance hardening applied successfully
- Tables verified: `public.profiles`, `public.lessons`, `public.usage_events`, `public.teaching_sessions`, `public.lesson_versions`
- Row Level Security: enabled on all user-owned tables with statement-scoped auth checks
- Security advisors: database policy/search-path findings cleared; Supabase Auth still reports leaked-password protection disabled
- Performance advisors: only unused-index notices remain because the new/demo tables are currently empty
- Project URL and publishable key: configured locally without exposing credentials in chat

## Claude

The Anthropic/Claude connection includes a named account, **TeachCraft workspace**. The account was reconnected during the Phase 4 live-test attempt. Model discovery now succeeds and returns 11 current Claude model options.

The Pipedream `anthropic-chat` action still rejects correctly shaped requests at the provider-action boundary for every tested supported and legacy model identifier. No model response has been returned, so the integration is not yet usable for live generation. No API key was requested in chat, displayed, or written into project files.

The local Next.js app still uses `ANTHROPIC_API_KEY` because a standalone web deployment cannot automatically access Strawberry's private connected-account token.

## Verified

- `npm install` completed.
- `npm run build` passes with exit code 0.
- Supabase project rechecked as `ACTIVE_HEALTHY` in Mumbai; all three public tables are present with RLS enabled.
- Supabase security advisors returned no lints.
- Login route renders with Supabase configuration present.
- Unauthenticated `/dashboard` access correctly redirects to `/login`.
- Root lesson-generation workflow was smoke-tested in offline preview mode.
- Preview mode generated a complete lesson with objectives, sequence, explanation, activity, assessment, and homework.
- Preview Save correctly refused to write and clearly explained that Supabase must be connected for persistence.
- Dashboard and lesson-editor routes render safely.
- The premium interface pass is complete: ivory editorial surfaces, deep forest accents, gold highlights, richer cards, refined controls, and a more luxurious hero treatment.
- The public product surface now uses the quieter **TeachCraft** brand with no visible AI/vendor references; underlying server integrations remain unchanged.
- The lesson studio now includes planning presets, a Lesson Compass readiness/rhythm/audience summary, one-click 30-minute/active-practice/accessibility adaptations, materials preparation, and success criteria.
- Browser smoke test passed for lesson creation, Lesson Compass rendering, adaptation controls, and corrected 30-minute sequence timing (5 + 13 + 8 + 4 minutes).
- Course Arc Studio is implemented at `/arc` with multi-week planning, sessions-per-week controls, weekly outcomes, activities, checks, and local draft saving; demo arc generation was browser-tested.
- Student Handout is implemented at `/handout` with learner goals, activity instructions, response space, reflection, and print / Save PDF support; browser-tested.
- Classroom Presentation mode is implemented at `/presentation` with phase navigation, live countdown timers, teacher/student actions, discussion prompts, print, and exit controls; browser-tested, including timer countdown.
- The main studio now persists the current lesson in session storage so Handout and Presentation mode can open the active lesson in the same browser session.
- Phase 1 teaching intelligence is implemented: deterministic Lesson Quality Intelligence, clickable objective alignment mapping, lesson rhythm visualization and rebalancing, ten teaching-style transformations, Misconception Lab, classroom contingencies, Course Arc session import, live presentation checkpoints, transparent timing adaptation, and post-class reflection.
- Browser QA confirmed the quality score and attention signals, alignment Uncovered state, Case-Based Learning transformation, Course Arc `Create lesson` import, live adaptation from 10:00 to 15:00 with an explicit note, checkpoint recording, local reflection saving, and continued Handout rendering.
- Phase 2 typed intelligence models and deterministic builders are implemented without changing the live generation API schema or requiring a database migration.
- Phase 2 studio panels are implemented for Learning Friction Forecast, explicit intervention review, Question Bank filters, Example Ladder, Analogy Quality Check, Accessibility Adapter, and Foundation / Standard / Challenge Learner Paths.
- Phase 2 Presentation mode now includes diagnostic questions, Example Ladder navigation, structured post-class evidence, and version-aware improvement proposals with explicit Accept / Reject actions.
- Browser QA on the compiled build confirmed all Phase 2 panels render, an intervention can be reviewed and accepted explicitly, presentation diagnostics and examples render, structured reflection saves locally, improvement proposals appear, and Handout remains compatible.
- Course Arc Intelligence is implemented and browser-tested on the compiled build with coherence, practice ratio, check coverage, signals to review, and recommended continuity moves.
- Security source scan found no public Anthropic key variable or client-side API-key logging; Anthropic credentials remain server-only in the two API routes.
- Phase 3 database models and helpers are implemented for Teaching Sessions, teaching events, planned-versus-actual timing, lesson lifecycle statuses, lesson versions, repeated friction, and successful teaching moves.
- Presentation Mode now starts/completes a distinct teaching session, records reversible timing adaptations, and displays a timestamped Teaching Evidence Timeline plus structured reflection fields including most useful activity.
- The dashboard now loads lesson statuses and teaching sessions, supports status filtering, and exposes descriptive metrics for lessons needing review, recent teaching, and frequently revisited concepts.
- The saved lesson editor now loads Teaching History and Version History, creates versions only for meaningful edits, and loads prior versions into the editor for explicit restore.
- Browser QA on the final compiled build confirmed demo generation, Presentation Mode, session start, +5-minute adaptation, completion at 65 actual against 60 planned, evidence timeline, and reflection controls. Demo mode correctly reported that no account data was created.
- Supabase table and migration verification confirmed the new tables, indexes, checks, foreign keys, RLS, and migrations `teaching_memory` and `security_performance_hardening`.
- The signed-in dashboard rendered with the user account, and the requested sign-out test confirmed unauthenticated `/dashboard` redirects to `/login`.
- The authenticated save flow is prepared but not verified end-to-end because demo mode intentionally blocks writes and no live lesson-generation credential is available. No fake account records were created.

## Phase 4 production readiness

- Generation requests and model outputs now use shared strict Zod schemas; malformed provider output is rejected safely.
- `/api/generate-lesson` and `/api/generate-arc` now authenticate through server-side Supabase cookies, enforce per-user cooldown and daily limits, use a bounded Anthropic timeout, and return stable safe error codes.
- Generation telemetry is stored in `usage_events` with model, duration, token counts when available, success, and safe error code. Raw prompts and provider response bodies are not stored.
- The generation UI has transparent design-stage progress labels and explicit cancellation without claiming hidden provider operations.
- Vitest has 12 passing deterministic core/API tests. `npm run build` passes on Next.js 16.3.5 using the new `proxy.ts` auth-refresh convention.
- `vercel.json`, `.nvmrc`, production-aware `validate-env.ps1`, `DEPLOYMENT_CHECKLIST.md`, and `PRIVACY.md` are included.
- `npm audit --omit=dev` reports zero advisories after the Next.js/PostCSS security upgrade.
- No automated browser harness was added; browser QA remains an explicit manual smoke-test checklist because authenticated credentials and live provider calls are still unavailable.

## Current blocker

The app remains intentionally staged with `NEXT_PUBLIC_DEMO_MODE=true`. The local `.env.local` has no server-side `ANTHROPIC_API_KEY`. Reconnection restored Anthropic model discovery, but the Pipedream `anthropic-chat` action still rejects valid requests before returning a model response. Claude cannot be live-tested until that action is repaired or a server-side deployment credential is supplied. Authenticated persistence cannot be fully smoke-tested while demo mode blocks saving, so no fake account records were created. Supabase security advisors now show only the manual `auth_leaked_password_protection` warning; performance advisors show only unused indexes on empty/demo tables. No credential was requested, displayed, or written to the project.

## Next action

Repair or replace Anthropic in Strawberry settings, then run live lesson and course-arc generation smoke tests. Keep demo mode enabled until those pass; after that, complete two-account RLS isolation plus signed-in lesson save, library reopen, Teaching Session sync, and version-history tests before switching demo mode off.
