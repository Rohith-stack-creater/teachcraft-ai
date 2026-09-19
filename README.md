# TeachCraft

A premium lesson studio for college and university lecturers. It turns a teaching brief into structured lesson plans, explanations, examples, activities, checks, homework, and success criteria—with planning presets and one-click adaptations for different classroom contexts.

## Current status

The app foundation, premium interface, Supabase project, database schema, authentication client, dashboard, saved-lesson editor, print/PDF flow, offline preview, planning presets, Lesson Compass, and lesson adaptations are in place. Phase 1 and Phase 2 teaching intelligence are implemented: explainable lesson-quality scoring, objective alignment mapping, rhythm visualization and rebalancing, teaching-style transformation, Misconception Lab, classroom contingencies, Course Arc session-to-lesson import, live classroom checkpoints, reversible live timing adaptation, structured post-class reflection, learning-friction analysis, question generation, accessibility adaptations, learner paths, and evidence-backed improvement proposals. Phase 3 teaching memory is now implemented for recorded teaching sessions, planned-versus-actual timing, evidence timelines, lesson lifecycle statuses, lesson versions, Teaching History, version-aware editor updates, deterministic dashboard metrics, and user-owned Supabase persistence paths.

- Supabase project: **TeachCraft AI**
- Region: **Mumbai (`ap-south-1`)**
- Schema: initial, teaching-memory, and security/performance-hardening migrations applied successfully
- Row Level Security: enabled on all user-owned application tables, with statement-scoped auth checks
- Security advisors: database policy/search-path findings cleared; Supabase Auth still reports leaked-password protection disabled
- Performance advisors: only expected unused-index notices remain on currently empty/demo tables
- Local mode: safe offline preview remains enabled with `NEXT_PUBLIC_DEMO_MODE=true`
- Claude: still staged because reconnection restored model discovery but the connected Anthropic chat action still rejects valid requests, while the local server has no `ANTHROPIC_API_KEY`

In preview mode, lesson generation is local and clearly labeled. It does not claim to be Claude output. Saving remains disabled until live Supabase mode is enabled in the environment.

## Stack

- Next.js + TypeScript
- Anthropic Claude Messages API
- Supabase Auth + PostgreSQL + Row Level Security
- Deployable to Vercel or another Node-compatible host

## Local setup

1. Install Node.js 20+.
2. Run `npm install` and then `npm run dev`.
3. The checked-in `.env.example` documents required variables. The local `.env.local` contains the private environment configuration and is not committed.
4. For live generation, provide `ANTHROPIC_API_KEY` through a server-side secret manager and set `ANTHROPIC_MODEL` only if needed.
5. For live persistence, set `NEXT_PUBLIC_DEMO_MODE=false` and keep the configured Supabase URL and publishable key.
6. Run `powershell -ExecutionPolicy Bypass -File .\\validate-env.ps1` to verify configuration without printing secrets.
7. Open `http://localhost:3000`.

The intended database region is Mumbai (`ap-south-1`). The project has already been created and the migration applied through the Supabase integration.

## Security notes

- Never put `ANTHROPIC_API_KEY` in a `NEXT_PUBLIC_*` variable.
- The Claude request runs server-side through `/api/generate-lesson`.
- Lesson rows are protected by Supabase Row Level Security.
- The signup trigger is not executable by anonymous or authenticated clients.
- Generation routes require authenticated server sessions, validate provider output, enforce per-user cooldown/daily limits, time out stalled provider calls, and record safe usage telemetry.
- Keep `ANTHROPIC_API_KEY` server-only; never expose it through `NEXT_PUBLIC_*` variables.

## Phase 1 teaching intelligence

- **Lesson Quality Intelligence** scores objective clarity, alignment, time feasibility, cognitive progression, engagement, assessment coverage, accessibility, workload balance, transitions, and prerequisite coverage using deterministic checks. Strengths, attention points, and clickable issue links are shown rather than presenting an unexplained score.
- **Learning Alignment Map** traces each objective through a lesson phase, activity, assessment question, and success criterion, with an explicit Uncovered state.
- **Lesson Rhythm Visualizer** labels phases as teacher-led, student-led, discussion, practice, assessment, or reflection. The deterministic rebalancer can move time from a teacher-heavy phase into student activity.
- **Teaching Style Transformer** supports ten teaching modes while preserving the topic, objectives, and core explanation and changing the activity, teacher actions, student actions, and homework where appropriate.
- **Misconception Lab** turns the lesson's misconception signal into a reason, correction, counterexample, diagnostic question, response, and follow-up teaching move.
- **Classroom Contingencies** provides practical plans for early finishers, struggling learners, active discussion, technology failure, silence, less time, and more time.
- **Course Arc integration** adds a `Create lesson` action to each course session and transfers course context into the lesson brief.
- **Presentation checkpoints and adaptation** add confidence, yes/no, multiple choice, one-minute, think-pair-share, raise-hand, and exit-ticket controls. Live controls make transparent timing changes such as adding practice or skipping optional content.
- **Post-Class Reflection** captures what worked, learner difficulty, discussion quality, reinforcement needs, timing, and the next change. It saves to the active browser lesson session and syncs to a saved Supabase lesson when a saved lesson ID is available.

## Phase 2 learning intelligence

- **Learning Friction Forecast** identifies evidence-backed design risks such as prerequisite gaps, abstract explanations, invisible practice outcomes, thin assessment evidence, and named misconception risks. Each item includes a severity, rationale, evidence, and an actionable teaching move.
- **Intervention review** shows a before/after proposal before any friction intervention changes the lesson. Accept and Reject are explicit; the original lesson remains intact until acceptance.
- **Question Bank** derives diagnostic, recall, understanding, application, analysis, evaluation, discussion, exit-ticket, and exam-practice questions with Foundation, Core, or Stretch difficulty labels, answer direction, purpose, and rationale.
- **Diagnostic Questions, Example Ladder, and Analogy Quality Check** add live checks for starting ideas, a five-step familiar-to-independent progression, and an explicit explanation of where an analogy breaks.
- **Accessibility Adapter and Learner Paths** offer plain-language, numbered-step, multiple-entry, Foundation, Standard, and Challenge variations while preserving the original objectives. Changes are accepted individually.
- **Course Arc Intelligence** adds arc-level coherence, practice ratio, session-check coverage, continuity signals, and recommended next moves above the weekly journey.
- **Structured Post-Class Evidence and Improvement Engine** add understanding, timing, engagement, difficult-concept, and lecturer-confidence fields. Saved evidence creates version-aware improvement proposals with evidence, before/after states, and explicit accept/reject controls.

Phase 2 is intentionally local and deterministic in demo mode. It does not claim to have observed students, does not silently overwrite lesson content, and does not require a major database migration.

## Phase 3 teaching memory

- **Teaching Sessions** separate a reusable lesson from one delivery. Presentation Mode records session context, start/completion, checkpoints, adaptations, difficult concepts, engagement, understanding, lecturer confidence, reflections, and a timestamped evidence timeline.
- **Planned versus actual teaching time** reports timing differences as evidence, not as a quality score. Timing changes are explicit, reversible in the local demo, and included in the session record.
- **Lesson lifecycle** supports Draft, Ready, Taught, Needs Revision, and Archived statuses. The authenticated dashboard adds status filtering and descriptive teaching-memory metrics without pretending to measure teaching quality.
- **Version History** creates an initial version on save and a new version only for meaningful saved edits or accepted improvement proposals. The editor keeps prior versions and can load an older version into the editor before the lecturer explicitly saves it.
- **Teaching History** attaches completed delivery records to the lesson and surfaces repeated friction and successful teaching moves through pure, deterministic helpers in `lib/teaching-memory.ts`.

Demo mode intentionally stores sessions and reflections only in browser session storage and creates no account records. Authenticated persistence is implemented for saved lessons, `teaching_sessions`, and `lesson_versions`, but the end-to-end authenticated write path still requires live generation or another real saved lesson while demo mode remains enabled.

## Dashboard and saved lessons

The `/dashboard` route provides an authenticated lecturer workspace with lesson counts, subject filters, search, saved-lesson cards, and confirmed deletion. Generated lessons can be saved from the main workspace. The `/lesson/[id]` route supports reopening, editing, saving, and print/PDF export.

## Phase 4 production reliability

- Shared strict Zod schemas validate both generation requests and model output; malformed provider JSON is rejected rather than persisted.
- Live generation is server-only, authenticated, timeout-bounded, and protected by per-user cooldown and daily lesson/arc limits. Safe result telemetry records model, duration, token counts when available, success, and an error code without storing raw prompts or provider response bodies.
- User-facing generation stages are transparent design checkpoints with explicit cancellation. They do not claim that the provider has completed a hidden step.
- API error responses use stable safe codes and do not expose provider response bodies, stack traces, or database messages.
- Vitest covers 12 deterministic core/API tests. `npm run build` passes on Next.js 16.3.5 after migrating the auth refresh entry point to the `proxy.ts` convention.
- Vercel configuration, Node 20 pinning, environment validation, deployment checklist, deployment-secret setup, live smoke-test procedure, and privacy/retention review plan are included. This repository has not been deployed from this chat.
- `npm audit --omit=dev` is clean after the Next.js 16.3.5 and PostCSS security upgrade.

## Next production steps

1. Repair or replace the Anthropic credential path and run live lesson and course-arc generation smoke tests.
2. Enable Supabase Auth leaked-password protection and configure Authentication URL settings for local, preview, and production domains.
3. Create two dedicated test accounts and verify cross-user RLS isolation, authenticated lesson save/reopen, Teaching Session sync, and version-history writes.
4. Turn off demo mode only after the live authenticated workflow passes together.
5. Deploy a preview environment and run the checklist in `DEPLOYMENT_CHECKLIST.md`; complete the privacy/retention decisions in `PRIVACY.md` before public launch.
