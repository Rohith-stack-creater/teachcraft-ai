-- Keep RLS auth lookups stable per statement and cover user-owned foreign keys.
create index if not exists lessons_user_id_idx on public.lessons(user_id);
create index if not exists usage_events_user_id_idx on public.usage_events(user_id);
create index if not exists lesson_versions_user_id_idx on public.lesson_versions(user_id);

alter function public.touch_teaching_memory_updated_at() set search_path = public;

-- Recreate user-owned policies with statement-scoped auth.uid() evaluation.
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can view their own lessons" on public.lessons;
drop policy if exists "Users can create their own lessons" on public.lessons;
drop policy if exists "Users can update their own lessons" on public.lessons;
drop policy if exists "Users can delete their own lessons" on public.lessons;
drop policy if exists "Users can view their own usage" on public.usage_events;
drop policy if exists "Users can view their own teaching sessions" on public.teaching_sessions;
drop policy if exists "Users can create their own teaching sessions" on public.teaching_sessions;
drop policy if exists "Users can update their own teaching sessions" on public.teaching_sessions;
drop policy if exists "Users can delete their own teaching sessions" on public.teaching_sessions;
drop policy if exists "Users can view their own lesson versions" on public.lesson_versions;
drop policy if exists "Users can create their own lesson versions" on public.lesson_versions;
drop policy if exists "Users can update their own lesson versions" on public.lesson_versions;
drop policy if exists "Users can delete their own lesson versions" on public.lesson_versions;

create policy "Users can view their own profile" on public.profiles for select using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users can view their own lessons" on public.lessons for select using ((select auth.uid()) = user_id);
create policy "Users can create their own lessons" on public.lessons for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their own lessons" on public.lessons for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own lessons" on public.lessons for delete using ((select auth.uid()) = user_id);
create policy "Users can view their own usage" on public.usage_events for select using ((select auth.uid()) = user_id);
create policy "Users can view their own teaching sessions" on public.teaching_sessions for select using ((select auth.uid()) = user_id);
create policy "Users can create their own teaching sessions" on public.teaching_sessions for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their own teaching sessions" on public.teaching_sessions for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own teaching sessions" on public.teaching_sessions for delete using ((select auth.uid()) = user_id);
create policy "Users can view their own lesson versions" on public.lesson_versions for select using ((select auth.uid()) = user_id);
create policy "Users can create their own lesson versions" on public.lesson_versions for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their own lesson versions" on public.lesson_versions for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own lesson versions" on public.lesson_versions for delete using ((select auth.uid()) = user_id);
