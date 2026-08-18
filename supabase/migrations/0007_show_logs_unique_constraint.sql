-- Enforce one show_logs row per (user, show): required for upsert-based
-- logging (Task 8) to update an existing log instead of creating a duplicate.
-- The unique constraint's implicit index replaces the plain index from 0003.
drop index if exists public.show_logs_user_show_idx;

alter table public.show_logs
  add constraint show_logs_user_show_unique unique (user_id, tmdb_show_id);

grant select, insert, update, delete on public.show_logs to service_role;
