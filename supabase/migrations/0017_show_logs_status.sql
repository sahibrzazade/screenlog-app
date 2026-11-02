-- Show status: a show log means "I finished this show" (completed) unless the
-- user marks it dropped. Existing rows become 'completed' via the default.
-- Existing RLS policies and table grants on show_logs cover the new column.

alter table public.show_logs
  add column status text not null default 'completed'
    constraint show_logs_status_check check (status in ('completed', 'dropped'));
