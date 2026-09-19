# Deployment secret setup

This procedure keeps the Anthropic credential out of the repository, browser, chat, logs, and client-side bundles. Do not paste the key into chat or commit it to `.env.local`, `.env.example`, screenshots, or support tickets.

## Recommended path: Vercel project settings

1. Create or open the TeachCraft project in Vercel.
2. Open **Project Settings → Environment Variables**.
3. Add `ANTHROPIC_API_KEY` as an **encrypted server-side secret**. Do not prefix it with `NEXT_PUBLIC_`.
4. Add the following non-secret configuration values:

   | Variable | Preview | Production |
   | --- | --- | --- |
   | `NEXT_PUBLIC_DEMO_MODE` | `true` until preview AI/auth tests pass | `false` only after launch gates pass |
   | `ANTHROPIC_MODEL` | `claude-sonnet-4-6` or the model approved for the account | same approved model |
   | `TEACHCRAFT_GENERATION_TIMEOUT_MS` | `30000` | `30000` |
   | `TEACHCRAFT_DAILY_LESSON_LIMIT` | `10` | set an approved budget |
   | `TEACHCRAFT_DAILY_ARC_LIMIT` | `3` | set an approved budget |
   | `TEACHCRAFT_GENERATION_COOLDOWN_SECONDS` | `10` | set an approved abuse-control value |
   | `NEXT_PUBLIC_SUPABASE_URL` | project URL | production project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable/anon key | production publishable/anon key |

5. Limit the secret to the required environment. A Preview key and Production key may be separate keys if the Anthropic workspace policy requires it.
6. Redeploy after changing server-side variables. Vercel environment-variable changes do not retroactively alter an already-built deployment.
7. In Supabase Authentication → URL Configuration, add the exact production and preview URLs before testing sign-in redirects.

## Local preflight without exposing secrets

Local demo mode should remain:

```text
NEXT_PUBLIC_DEMO_MODE=true
```

For a deliberately configured live environment, run PowerShell from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate-env.ps1 -Production
```

The script checks presence only and never prints secret values. Do not copy the production key into the local project unless that is explicitly approved for a disposable private environment.

## Deployment guardrails

- `ANTHROPIC_API_KEY` is read only by server-side generation routes.
- The client never receives the key and does not call Anthropic directly.
- The deployment must use the Node.js runtime for `/api/generate-lesson` and `/api/generate-arc`.
- Keep the first deployment in Preview or a protected production environment.
- Do not set `NEXT_PUBLIC_DEMO_MODE=false` until the live smoke-test procedure passes.
- If a key is exposed, revoke it in Anthropic immediately, create a replacement, update the hosting secret, and redeploy. Do not merely delete it from source control.

## Rollback

If live tests fail or cost/error rates are unexpected:

1. Set the deployment back to `NEXT_PUBLIC_DEMO_MODE=true` or promote the last known-good deployment.
2. Revoke and replace the provider key if exposure is suspected.
3. Keep the database migrations applied; the generation telemetry schema is forward-compatible.
4. Review `usage_events` for safe error codes, duration, and success state without extracting prompt content.
5. Record the failed build/deployment URL and time, but never record the secret or raw provider response.
