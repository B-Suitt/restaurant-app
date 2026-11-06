-- Reglas de negocio en la base de datos: transiciones de estado, trazabilidad y
-- acciones (RPC). Las funciones devuelven errores con un código corto en el mensaje
-- (p. ej. 'invalid_qr') para que el frontend muestre el texto en español.

-- ---------------------------------------------------------------------------
-- Estados de los ítems
-- ---------------------------------------------------------------------------

-- No se puede saltar ni retroceder estados; cancelar solo desde 'recibido'.
create function private.check_item_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if (old.status, new.status) not in (
    ('recibido', 'en_preparacion'),
    ('en_preparacion', 'listo_para_entregar'),
    ('listo_para_entregar', 'entregado'),
    ('recibido', 'cancelado')
  ) then
    raise exception 'invalid_transition' using detail = old.status || ' -> ' || new.status;
  end if;
  return new;
end
$$;

create trigger order_items_check_transition
  before update of status on public.order_items
  for each row execute function private.check_item_transition();

-- Cada estado (incluido el inicial) queda en order_item_events con usuario y hora.
create function private.log_item_status()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_item_events (order_item_id, status, changed_by)
    values (
      new.id,
      new.status,
      (select id from public.profiles where id = (select auth.uid())) -- nulo si es cliente
    );
  end if;
  return new;
end
$$;

create trigger order_items_log_status
  after insert or update of status on public.order_items
  for each row execute function private.log_item_status();

-- ---------------------------------------------------------------------------
-- Sesiones de mesa
-- ---------------------------------------------------------------------------

-- Devuelve la sesión abierta de la mesa o abre una nueva (seguro ante escaneos simultáneos).
create function private.open_session(p_table_id uuid, p_guest_count int)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  insert into public.table_sessions (table_id, guest_count)
  values (p_table_id, p_guest_count)
  on conflict (table_id) where status = 'open' do nothing
  returning id into v_session_id;

  if v_session_id is null then
    select id into v_session_id
    from public.table_sessions
    where table_id = p_table_id and status = 'open';
  end if;

  return v_session_id;
end
$$;

-- Cliente: escanea el QR. Abre la sesión si no hay una y une el celular a ella.
create function public.join_table(p_qr_token text, p_guest_count int default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_table_id uuid;
  v_session_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_table_id from public.tables where qr_token = p_qr_token and active;
  if v_table_id is null then
    raise exception 'invalid_qr';
  end if;

  v_session_id := private.open_session(v_table_id, p_guest_count);

  insert into public.session_guests (session_id, user_id)
  values (v_session_id, v_uid)
  on conflict do nothing;

  return v_session_id;
end
$$;

-- Garzón: abre (o retoma) la sesión de una mesa para ingresar pedidos.
create function public.open_table(p_table_id uuid, p_guest_count int default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.has_role('waiter') then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.tables where id = p_table_id and active) then
    raise exception 'table_inactive';
  end if;
  return private.open_session(p_table_id, p_guest_count);
end
$$;

-- Garzón: cierra la mesa al cobrar. Los llamados pendientes quedan atendidos.
create function public.close_session(p_session_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not private.has_role('waiter') then
    raise exception 'forbidden';
  end if;

  update public.table_sessions
  set status = 'closed', closed_at = now(), closed_by = v_uid
  where id = p_session_id and status = 'open';
  if not found then
    raise exception 'session_not_open';
  end if;

  update public.waiter_calls
  set attended_at = now(), attended_by = v_uid
  where session_id = p_session_id and attended_at is null;
end
$$;

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------

-- Cliente o garzón envía una ronda. Los precios se toman de la carta, nunca del cliente.
-- p_items: [{ "dish_id": uuid, "quantity": int, "note": text, "extra_ids": [uuid] }]
create function public.place_order(p_session_id uuid, p_items jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_is_waiter boolean := private.has_role('waiter');
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
  if not exists (select 1 from public.table_sessions where id = p_session_id and status = 'open') then
    raise exception 'session_not_open';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;

  insert into public.orders (session_id, created_by)
  values (p_session_id, case when v_is_waiter then (select auth.uid()) end)
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
      where id = v_extra_id and dish_id = v_dish.id;
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

-- Cambia el estado de un ítem según el rol:
--   cocina: en_preparacion, listo_para_entregar · garzón: entregado, cancelado
--   cliente de la mesa: cancelado
-- El trigger valida que la transición sea la siguiente permitida.
create function public.set_item_status(p_item_id uuid, p_status text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_role text := private.staff_role();
  v_session_id uuid;
  v_allowed boolean;
begin
  select o.session_id into v_session_id
  from public.order_items i
  join public.orders o on o.id = i.order_id
  where i.id = p_item_id
  for update of i; -- evita que dos personas cambien el mismo ítem a la vez
  if not found then
    raise exception 'item_not_found';
  end if;

  v_allowed := case p_status
    when 'en_preparacion' then v_role = 'kitchen'
    when 'listo_para_entregar' then v_role = 'kitchen'
    when 'entregado' then v_role = 'waiter'
    when 'cancelado' then v_role = 'waiter' or private.is_guest(v_session_id)
    else false
  end;
  if not coalesce(v_allowed, false) then
    raise exception 'forbidden';
  end if;

  if not exists (select 1 from public.table_sessions where id = v_session_id and status = 'open') then
    raise exception 'session_not_open';
  end if;

  update public.order_items set status = p_status where id = p_item_id;
end
$$;

-- ---------------------------------------------------------------------------
-- Llamados al garzón
-- ---------------------------------------------------------------------------

-- Cliente: llama al garzón ('call') o pide la cuenta ('bill'). Si ya hay uno pendiente, lo devuelve.
create function public.call_waiter(p_session_id uuid, p_type text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_call_id uuid;
begin
  if not private.is_guest(p_session_id) then
    raise exception 'forbidden';
  end if;
  if p_type not in ('call', 'bill') then
    raise exception 'invalid_call_type';
  end if;

  insert into public.waiter_calls (session_id, type)
  values (p_session_id, p_type)
  on conflict (session_id, type) where attended_at is null do nothing
  returning id into v_call_id;

  if v_call_id is null then
    select id into v_call_id
    from public.waiter_calls
    where session_id = p_session_id and type = p_type and attended_at is null;
  end if;

  return v_call_id;
end
$$;

-- Garzón: marca un llamado como atendido. Si ya estaba atendido no hace nada.
create function public.attend_call(p_call_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.has_role('waiter') then
    raise exception 'forbidden';
  end if;
  update public.waiter_calls
  set attended_at = now(), attended_by = (select auth.uid())
  where id = p_call_id and attended_at is null;
end
$$;

-- Las RPC solo para usuarios con sesión (los clientes anónimos también son 'authenticated').
revoke execute on function
  public.join_table(text, int),
  public.open_table(uuid, int),
  public.close_session(uuid),
  public.place_order(uuid, jsonb),
  public.set_item_status(uuid, text),
  public.call_waiter(uuid, text),
  public.attend_call(uuid)
from public, anon;

grant execute on function
  public.join_table(text, int),
  public.open_table(uuid, int),
  public.close_session(uuid),
  public.place_order(uuid, jsonb),
  public.set_item_status(uuid, text),
  public.call_waiter(uuid, text),
  public.attend_call(uuid)
to authenticated;
