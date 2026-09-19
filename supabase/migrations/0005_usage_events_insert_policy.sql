-- Generation telemetry is written by the authenticated server client using the user's session.
-- Without an INSERT policy, every generation stops before the provider call with a limit-check error.
drop policy if exists "Users can create their own usage events" on public.usage_events;
create policy "Users can create their own usage events"
on public.usage_events
for insert
with check ((select auth.uid()) = user_id);
