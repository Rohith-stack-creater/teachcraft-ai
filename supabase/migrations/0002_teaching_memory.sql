alter table public.lessons add column if not exists status text not null default 'Draft' check (status in ('Draft', 'Ready', 'Taught', 'Needs Revision', 'Archived'));
alter table public.lessons add column if not exists version integer not null default 1 check (version > 0);

create table if not exists public.teaching_sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_context text,
  cohort text,
  planned_duration integer not null check (planned_duration between 1 and 480),
  actual_duration integer check (actual_duration between 1 and 480),
  session_date date not null default current_date,
  status text not null default 'Planned' check (status in ('Planned', 'Started', 'In Progress', 'Completed')),
  started_at timestamptz,
  completed_at timestamptz,
  checkpoint_observations jsonb not null default '[]'::jsonb,
  timing_changes jsonb not null default '[]'::jsonb,
  adaptations_used jsonb not null default '[]'::jsonb,
  difficult_concepts jsonb not null default '[]'::jsonb,
  activity_engagement text,
  understanding_observation text,
  lecturer_confidence text,
  reflection jsonb,
  improvement_suggestions jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content jsonb not null,
  change_summary text not null,
  change_reason text,
  created_at timestamptz not null default now(),
  unique (lesson_id, version_number)
);

create index if not exists teaching_sessions_user_id_idx on public.teaching_sessions(user_id);
create index if not exists teaching_sessions_lesson_id_idx on public.teaching_sessions(lesson_id);
create index if not exists teaching_sessions_date_idx on public.teaching_sessions(user_id, session_date desc);
create index if not exists lesson_versions_lesson_id_idx on public.lesson_versions(lesson_id, version_number desc);

alter table public.teaching_sessions enable row level security;
alter table public.lesson_versions enable row level security;

drop policy if exists "Users can view their own teaching sessions" on public.teaching_sessions;
drop policy if exists "Users can create their own teaching sessions" on public.teaching_sessions;
drop policy if exists "Users can update their own teaching sessions" on public.teaching_sessions;
drop policy if exists "Users can delete their own teaching sessions" on public.teaching_sessions;
drop policy if exists "Users can view their own lesson versions" on public.lesson_versions;
drop policy if exists "Users can create their own lesson versions" on public.lesson_versions;
drop policy if exists "Users can update their own lesson versions" on public.lesson_versions;
drop policy if exists "Users can delete their own lesson versions" on public.lesson_versions;

create policy "Users can view their own teaching sessions" on public.teaching_sessions for select using (auth.uid() = user_id);
create policy "Users can create their own teaching sessions" on public.teaching_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their own teaching sessions" on public.teaching_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own teaching sessions" on public.teaching_sessions for delete using (auth.uid() = user_id);
create policy "Users can view their own lesson versions" on public.lesson_versions for select using (auth.uid() = user_id);
create policy "Users can create their own lesson versions" on public.lesson_versions for insert with check (auth.uid() = user_id);
create policy "Users can update their own lesson versions" on public.lesson_versions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own lesson versions" on public.lesson_versions for delete using (auth.uid() = user_id);

create or replace function public.touch_teaching_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teaching_sessions_updated_at on public.teaching_sessions;
create trigger teaching_sessions_updated_at before update on public.teaching_sessions for each row execute procedure public.touch_teaching_memory_updated_at();
