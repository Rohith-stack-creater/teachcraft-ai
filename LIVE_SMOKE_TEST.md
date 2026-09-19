# TeachCraft live smoke-test procedure

Run this against a protected Preview deployment first. Use a dedicated test account and synthetic teaching content. Do not use student names, grades, private institutional material, or production user data.

## Preconditions

- [ ] The deployment has `ANTHROPIC_API_KEY` configured as a server-side secret.
- [ ] `ANTHROPIC_MODEL` is a model currently permitted by the Anthropic account.
- [ ] Supabase production/preview URL settings include the exact deployment origin.
- [ ] The deployment has `NEXT_PUBLIC_DEMO_MODE=false` only for this controlled test.
- [ ] `npm run typecheck`, `npm test`, `npm run build`, and `npm audit --omit=dev` passed for the deployed commit.
- [ ] Supabase migrations `initial_schema`, `teaching_memory`, `security_performance_hardening`, and `generation_observability` are applied.
- [ ] Leaked-password protection is enabled in Supabase Auth before using a real public signup flow.

## Test data

Use:

- Subject: `Data Science`
- Topic: `Introduction to supervised learning`
- Learners: `Undergraduate first year`
- Duration: `60`
- Objective: `Students should explain the difference between supervised and unsupervised learning and identify one suitable use case for each.`
- Prerequisites: `Basic Python and descriptive statistics`
- Teaching style: `Interactive with worked examples`
- Course-arc brief: `A four-week introduction to supervised learning with weekly practice and retrieval checks.`

## A. Authentication and session

1. Open the Preview deployment at its exact configured origin.
2. Create or sign in with a dedicated test account.
3. Confirm the dashboard loads and the account is visible only to that test user.
4. Sign out.
5. Open `/dashboard` directly and confirm it redirects to `/login`.
6. Sign back in before continuing.

Pass criteria:

- No credentials appear in URLs, page source, browser storage, telemetry, or client network request bodies.
- Protected routes do not render account data while signed out.

## B. Live lesson generation

1. Open the main lesson studio.
2. Enter the test brief above.
3. Start generation once.
4. Confirm transparent progress stages appear and the control prevents duplicate starts.
5. Confirm the result contains at minimum: title, objectives, timed sequence, explanation, activity, assessment, homework, and success criteria.
6. Inspect the browser network panel: the browser may call `/api/generate-lesson`, but it must not call `api.anthropic.com` directly and must not expose `ANTHROPIC_API_KEY`.
7. Confirm no provider error body or server stack trace appears in the UI.
8. Save the generated lesson.
9. Refresh and reopen it from the authenticated library.

Pass criteria:

- HTTP 200 from the generation route with a schema-valid lesson.
- The lesson is saved under the test account and survives refresh.
- `usage_events` contains a generation start and result record with model, duration, success, and token counts when returned by the provider.
- No raw prompt or provider response body is stored in telemetry.

## C. Live course-arc generation

1. Open `/arc`.
2. Enter the course-arc brief above.
3. Start generation once.
4. Confirm the result contains a coherent multi-week arc with weekly outcomes, sessions, activities, checks, and continuity guidance.
5. Create a lesson from one session.
6. Confirm the imported lesson brief carries course context and session outcome.

Pass criteria:

- HTTP 200 from `/api/generate-arc` with a schema-valid arc.
- The arc and imported brief remain available after normal navigation.
- A `generation_arc` start event and `generation_arc_result` event are recorded for the test user.

## D. Failure and cancellation checks

Run only within approved limits:

- Start generation and cancel while the progress state is visible; confirm the original brief remains unchanged.
- Submit malformed or incomplete input through the UI; confirm a safe 400-level message.
- Temporarily test a deliberately invalid provider configuration only in Preview; confirm a safe configuration error without provider details.
- Trigger the configured cooldown with a second immediate generation; confirm a safe 429 response and retry guidance.
- Use enough controlled requests to confirm the daily limit; stop once the limit is reached.
- Do not intentionally create uncontrolled load.

## E. Persistence and Teaching Session

1. From the saved lesson, open Presentation Mode.
2. Start a Teaching Session.
3. Record a checkpoint and one timing adaptation.
4. Complete the session with actual duration different from planned duration.
5. Save structured reflection evidence.
6. Return to the lesson editor and confirm Teaching History and Version History show the new evidence.
7. Make one meaningful edit and save a new version.

Pass criteria:

- The session, event timeline, reflection, and version belong to the test account.
- Previous lesson content remains available through version history.
- No client error exposes database messages or stack traces.

## F. RLS isolation

Use a second dedicated test account.

- [ ] Account B cannot list, open, update, or delete Account A lessons.
- [ ] Account B cannot read Account A teaching sessions, versions, or usage events.
- [ ] Account A cannot access Account B records by changing a URL ID.
- [ ] Sign-out clears access to both accounts’ protected routes.

Stop and investigate immediately if any cross-account record is visible.

## Evidence to record

Record only:

- Deployment URL and commit identifier.
- Date/time and selected model name.
- HTTP status codes and safe error codes.
- Pass/fail result for each section.
- Migration versions and Supabase advisor status.
- Synthetic test account labels, never passwords or access tokens.

Never record API keys, cookies, authorization headers, raw prompts, raw provider responses, or real student data.

## Exit decision

Keep demo mode enabled if any live generation, authentication, persistence, RLS, telemetry, or privacy check fails. Switch the public environment to live mode only after all required sections pass and the owner accepts the provider cost and data-processing implications.
