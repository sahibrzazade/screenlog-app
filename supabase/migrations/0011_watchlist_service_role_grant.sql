-- service_role bypasses RLS but still needs table-level grants (separate
-- from RLS); missed for watchlist when 0006/0007/0008/0010 added this same
-- grant for the other log tables.
grant select, insert, delete on public.watchlist to service_role;
