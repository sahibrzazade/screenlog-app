-- Enforce one season_logs row per (user, show, season): required for
-- upsert-based logging (Task 10) to update an existing log instead of
-- creating a duplicate. The unique constraint's implicit index replaces
-- the plain index from 0004.
drop index if exists public.season_logs_user_show_season_idx;

alter table public.season_logs
  add constraint season_logs_user_show_season_unique unique (user_id, tmdb_show_id, season_number);

grant select, insert, update, delete on public.season_logs to service_role;
