-- Saves a list's new order in one statement, so a failed save changes nothing
-- and a long move doesn't cost a request per row. An upsert can't do this: the
-- 0019 limit trigger fires before insert even on a conflict, so a full list
-- would fail. Runs as the caller, so RLS limits it to the list's owner.
create function public.reorder_list_items(p_list_id uuid, p_item_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.list_items as item
  set position = (ordered.ordinality - 1)::integer
  from unnest(p_item_ids) with ordinality as ordered (id, ordinality)
  where item.id = ordered.id
    and item.list_id = p_list_id
    and item.position <> ordered.ordinality - 1;
$$;

revoke execute on function public.reorder_list_items(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_list_items(uuid, uuid[]) to authenticated, service_role;
