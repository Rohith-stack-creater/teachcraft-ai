alter table public.usage_events add column if not exists duration_ms integer check (duration_ms is null or duration_ms >= 0);
alter table public.usage_events add column if not exists success boolean not null default true;
alter table public.usage_events add column if not exists error_code text;
create index if not exists usage_events_generation_day_idx on public.usage_events(user_id, event_type, created_at desc);
