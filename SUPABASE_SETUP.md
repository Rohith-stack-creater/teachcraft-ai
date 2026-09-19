# Supabase setup for TeachCraft AI

The Supabase project has been created and configured through the Strawberry integration.

## Completed

- Project name: **TeachCraft AI**
- Organization: **Rohith-stack-creater's Org**
- Region: **Mumbai / `ap-south-1`**
- Project status: healthy
- Initial migration: applied successfully
- Tables: `profiles`, `lessons`, and `usage_events`
- Row Level Security: enabled
- Signup trigger: locked down so clients cannot execute it directly
- Project URL and publishable key: stored in the local `.env.local` without exposing them in chat

## Local configuration

The app is currently kept in safe preview mode:

`NEXT_PUBLIC_DEMO_MODE=true`

This lets the lesson workflow run locally without making Claude requests or writing lesson data. To enable live persistence after live Claude testing is ready, set:

`NEXT_PUBLIC_DEMO_MODE=false`

The server-side Claude secret must remain:

`ANTHROPIC_API_KEY=...`

Never rename it to a `NEXT_PUBLIC_*` variable.

## Authentication configuration still needed

In Supabase Authentication → URL Configuration, add the local and production application URLs before using signup and login outside local development.

## Before public launch

- Resolve the Anthropic workspace-scoped credential requirement.
- Add rate limiting and per-user usage limits.
- Add a privacy policy and retention rules for lesson content.
- Run the Supabase security and performance advisors after any schema change.
- Run automated tests and a preview deployment before production.
