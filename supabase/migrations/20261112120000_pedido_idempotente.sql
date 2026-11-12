-- Pedidos idempotentes: el navegador manda un id propio del pedido. Si la conexión se corta
-- después de guardarlo y el cliente reintenta, no se crea una ronda duplicada.
-- p_order_id es opcional: las llamadas antiguas (sin id) siguen funcionando.

drop function public.place_order(uuid, jsonb);

create function public.place_order(p_session_id uuid, p_items jsonb, p_order_id uuid default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_is_waiter boolean := private.has_role('waiter');
  v_table_active boolean;
  v_order_id uuid;
  v_item jsonb;
  v_quantity int;
  v_dish public.dishes%rowtype;
  v_item_id uuid;
  v_extra_id uuid;
  v_extra_price int;
begin
  if not (v_is_waiter or private.is_guest(p_session_id)) then
    raise exception 'forbidden';
  end if;

  select t.active into v_table_active
  from public.table_sessions s
  join public.tables t on t.id = s.table_id
  where s.id = p_session_id and s.status = 'open'
  for no key update of s;
  if not found then
    raise exception 'session_not_open';
  end if;
  if not v_table_active then
    raise exception 'table_inactive';
  end if;

  -- Reintento de un pedido que ya llegó (la respuesta se perdió): devuelve el mismo.
  -- El bloqueo de la sesión de arriba evita que dos reintentos simultáneos lo creen dos veces.
  if p_order_id is not null and exists (select 1 from public.orders where id = p_order_id) then
    if not exists (select 1 from public.orders where id = p_order_id and session_id = p_session_id) then
      raise exception 'forbidden';
    end if;
    return p_order_id;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'too_many_items';
  end if;

  if v_is_waiter then
    update public.table_sessions
    set confirmed_at = now(), confirmed_by = (select auth.uid())
    where id = p_session_id and confirmed_at is null;
  end if;

  insert into public.orders (id, session_id, created_by)
  values (coalesce(p_order_id, gen_random_uuid()), p_session_id, case when v_is_waiter then (select auth.uid()) end)
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::int;
    if v_quantity is null or v_quantity not between 1 and 50 then
      raise exception 'invalid_quantity';
    end if;

    select d.* into v_dish
    from public.dishes d
    join public.categories c on c.id = d.category_id
    where d.id = (v_item ->> 'dish_id')::uuid and c.active;
    if not found then
      raise exception 'dish_not_found';
    end if;
    if not v_dish.available then
      raise exception 'dish_unavailable' using detail = v_dish.id::text;
    end if;

    insert into public.order_items (order_id, dish_id, quantity, note, unit_price)
    values (v_order_id, v_dish.id, v_quantity, nullif(trim(v_item ->> 'note'), ''), v_dish.price)
    returning id into v_item_id;

    for v_extra_id in
      select distinct value::uuid
      from jsonb_array_elements_text(coalesce(v_item -> 'extra_ids', '[]'::jsonb))
    loop
      select price into v_extra_price
      from public.dish_extras
      where id = v_extra_id and dish_id = v_dish.id and active;
      if not found then
        raise exception 'extra_not_found';
      end if;
      insert into public.order_item_extras (order_item_id, extra_id, price)
      values (v_item_id, v_extra_id, v_extra_price);
    end loop;
  end loop;

  return v_order_id;
end
$$;

revoke execute on function public.place_order(uuid, jsonb, uuid) from public, anon;
grant execute on function public.place_order(uuid, jsonb, uuid) to authenticated;
