# TeachCraft browser smoke-test checklist

This checklist records the high-value browser paths that should run in preview and production. The first group has been manually exercised on the compiled app; the second group remains blocked by live credentials or requires dedicated test accounts.

## Previously verified in demo mode

- [x] `/login` renders and the signed-out `/dashboard` path redirects back to `/login`.
- [x] Main studio creates a deterministic lesson preview with objectives, sequence, explanation, activity, assessment, and homework.
- [x] Generation-stage labels render and the Cancel control leaves the brief unchanged.
- [x] Lesson Compass, quality signals, objective alignment, rhythm, adaptations, Question Bank, and friction panels render.
- [x] `/arc` builds a demo course arc and imports a session brief into the lesson studio.
- [x] `/presentation` starts a local Teaching Session, records a checkpoint, applies a reversible timing adaptation, completes at planned-versus-actual time, and shows an evidence timeline.
- [x] Reflection and improvement proposals save locally without claiming account persistence.
- [x] `/handout` renders the active lesson and print/PDF flow remains available.

## Required with live credentials

- [ ] Sign up or sign in with a dedicated test account; verify an authenticated dashboard.
- [ ] Generate one lesson and one course arc through Anthropic; verify loading, cancellation, timeout, and safe error states.
- [ ] Save the lesson; refresh; reopen it from the library; edit and save a meaningful version.
- [ ] Start and complete a Teaching Session against the saved lesson; verify session and reflection data persist.
- [ ] Create a second account and verify it cannot read, update, or delete the first account’s lessons, sessions, versions, or usage events.
- [ ] Exercise cooldown and daily generation limits; verify safe 429 responses and no provider secrets in the browser.
- [ ] Run sign-out and confirm protected routes return to `/login`.

## Launch evidence to retain

Record environment, build commit, test account IDs (not passwords), date/time, provider model, migration versions, and any failures. Do not paste API keys, access tokens, student data, or raw provider responses into the evidence log.
