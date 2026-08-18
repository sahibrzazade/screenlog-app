-- Enforce one movie_logs row per (user, movie): required for upsert-based
-- logging (Task 7) to update an existing log instead of creating a duplicate.
-- The unique constraint's implicit index replaces the plain index from 0002.
drop index if exists public.movie_logs_user_movie_idx;

alter table public.movie_logs
  add constraint movie_logs_user_movie_unique unique (user_id, tmdb_movie_id);

-- service_role bypasses RLS but still needs table-level grants (separate from RLS);
-- missing since 0002, only surfaced now that e2e tests query this table directly.
grant select, insert, update, delete on public.movie_logs to service_role;
