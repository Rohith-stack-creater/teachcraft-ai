# TeachCraft production checklist

This checklist is an operational guide, not a deployment claim. Complete and record each item before switching a production environment out of demo mode.

## Build and runtime

- [ ] Use Node.js 20.x (`.nvmrc` and `package.json` engines).
- [ ] Install with `npm ci` and build with `npm run build`.
- [ ] Run `npm test` in CI.
- [ ] Configure a health check or synthetic request for `/login` and `/api/generate-lesson`.
- [ ] Confirm the deployment is using the Node.js runtime, not an edge runtime, for generation routes.

## Environment variables

Set separately for Preview and Production; never commit values:

- `NEXT_PUBLIC_DEMO_MODE=false` only after live validation.
- `ANTHROPIC_API_KEY` as a server-only secret.
- `ANTHROPIC_MODEL` as a server-only configuration value.
- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or the current publishable key.
- Optional limits: `TEACHCRAFT_DAILY_LESSON_LIMIT`, `TEACHCRAFT_DAILY_ARC_LIMIT`, `TEACHCRAFT_GENERATION_COOLDOWN_SECONDS`, `TEACHCRAFT_GENERATION_TIMEOUT_MS`.

Run `powershell -ExecutionPolicy Bypass -File .\validate-env.ps1 -Production` without printing secret values.

## Supabase

- [ ] Apply migrations in order: `0001_initial_schema`, `0002_teaching_memory`, `0003_security_performance_hardening`, `0004_generation_observability`.
- [ ] Confirm RLS is enabled on `profiles`, `lessons`, `usage_events`, `teaching_sessions`, and `lesson_versions`.
- [ ] Confirm the Auth signup trigger is security-definer with a fixed `search_path` and is not executable by clients.
- [ ] Enable leaked-password protection in Supabase Auth. This remains a manual configuration item until the project setting is verified.
- [ ] Add production and preview URLs under Authentication → URL Configuration.
- [ ] Test a user’s read/update/delete access against another user’s records using dedicated test accounts.
- [ ] Keep database backups and confirm deletion/cascade behavior is acceptable for lessons, sessions, and versions.

## AI provider

- [ ] Verify the Anthropic key and workspace permissions outside the application.
- [ ] Verify the configured model identifier is supported by the account.
- [ ] Run a live lesson-generation request and a live course-arc request.
- [ ] Confirm malformed, refused, timed-out, 401/403, 429, and 5xx provider responses become safe user-facing errors.
- [ ] Confirm no prompt, lesson content, secret, or provider response is logged unnecessarily.

## Reliability and observability

- [ ] Verify per-user daily limits and cooldown behavior with a test account.
- [ ] Verify `usage_events` records event type, model, success, duration, safe error code, and token counts when available.
- [ ] Alert on repeated `generation_*_result` failures and elevated 429/5xx responses.
- [ ] Add an external error-monitoring provider only through a server-side adapter if needed; do not put its credential in `NEXT_PUBLIC_*`.
- [ ] Define a rollback procedure: restore prior deployment, keep migrations forward-compatible, and do not delete user data during rollback.

## Privacy and launch review

- [ ] Review `PRIVACY.md` with legal counsel before public launch.
- [ ] Decide retention and deletion timelines for lessons, sessions, versions, and usage telemetry.
- [ ] Confirm the model-provider data-processing terms and what content is sent for generation.
- [ ] Confirm support contact, incident response owner, and user data export/deletion process.
- [ ] Keep `NEXT_PUBLIC_DEMO_MODE=true` in local preview environments unless live credentials are intentionally configured.
