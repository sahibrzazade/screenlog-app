-- Feature 8: profile showcase — up to 4 favourite movies, up to 4 favourite
-- shows, and a single "currently watching" show, all picked freely from TMDB
-- (independent of what the user has actually logged). RLS/grants are
-- unchanged here — these columns stay owner-only-readable until Feature 9
-- (migration 0014) makes profiles publicly readable.

alter table public.profiles
  add column top_movie_ids int[] not null default '{}',
  add column top_show_ids int[] not null default '{}',
  add column now_watching_show_id int;

alter table public.profiles
  add constraint profiles_top_movie_ids_max4 check (array_length(top_movie_ids, 1) is null or array_length(top_movie_ids, 1) <= 4),
  add constraint profiles_top_show_ids_max4 check (array_length(top_show_ids, 1) is null or array_length(top_show_ids, 1) <= 4);
