-- Decisiones tras la auditoría: confirmación del garzón, cierre sin pago, límites y permisos.

-- ---------------------------------------------------------------------------
-- Sesiones
-- ---------------------------------------------------------------------------

alter table public.table_sessions
  add column confirmed_at timestamptz,
  add column confirmed_by uuid references public.profiles (id),
  add column unpaid boolean not null default false,
  drop column guest_count;

-- Lo ya existente estaba en operación: no vuelve a pedir confirmación.
update public.table_sessions set confirmed_at = opened_at;

drop function public.join_table(text, int);
drop function public.open_table(uuid, int);
drop function public.close_session(uuid);
drop function private.open_session(uuid, int);

create function private.open_session(p_table_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  insert into public.table_sessions (table_id)
  values (p_table_id)
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

-- Cliente: escanea el QR. Una sesión sin pedidos puede venir de otra visita:
-- los celulares que entraron hace más de 2 horas salen antes de que llegue el nuevo cliente.
create function public.join_table(p_qr_token text)
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

  v_session_id := private.open_session(v_table_id);

  if not exists (select 1 from public.orders where session_id = v_session_id) then
    delete from public.session_guests
    where session_id = v_session_id and joined_at < now() - interval '2 hours';
  end if;

  insert into public.session_guests (session_id, user_id)
  values (v_session_id, v_uid)
  on conflict do nothing;

  return v_session_id;
end
$$;

create function public.open_table(p_table_id uuid)
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
  return private.open_session(p_table_id);
end
$$;

-- Garzón: confirma que hay clientes en la mesa. Desde ese momento los pedidos llegan a cocina.
create function public.confirm_session(p_session_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.has_role('waiter') then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.table_sessions where id = p_session_id and status = 'open') then
    raise exception 'session_not_open';
  end if;

  update public.table_sessions
  set confirmed_at = now(), confirmed_by = (select auth.uid())
  where id = p_session_id and confirmed_at is null;
end
$$;

-- Garzón: cierra la mesa. Los llamados pendientes quedan atendidos.
create function public.close_session(p_session_id uuid, p_unpaid boolean default false)
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
  set status = 'closed', closed_at = now(), closed_by = v_uid, unpaid = coalesce(p_unpaid, false)
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

-- Bloquea la sesión hasta terminar: un cierre simultáneo no deja pedidos en una mesa cerrada.
-- Un pedido del garzón confirma la mesa, porque él ya está ahí.
create or replace function public.place_order(p_session_id uuid, p_items jsonb)
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

-- Igual que antes, pero cocina solo trabaja platos de mesas confirmadas.
create or replace function public.set_item_status(p_item_id uuid, p_status text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_role text := private.staff_role();
  v_session_id uuid;
  v_allowed boolean;
  v_confirmed_at timestamptz;
begin
  select o.session_id into v_session_id
  from public.order_items i
  join public.orders o on o.id = i.order_id
  where i.id = p_item_id
  for update of i;
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

  select confirmed_at into v_confirmed_at
  from public.table_sessions
  where id = v_session_id and status = 'open'
  for share;
  if not found then
    raise exception 'session_not_open';
  end if;
  if v_confirmed_at is null and p_status in ('en_preparacion', 'listo_para_entregar') then
    raise exception 'session_not_confirmed';
  end if;

  update public.order_items set status = p_status where id = p_item_id;
end
$$;

revoke execute on function
  public.join_table(text),
  public.open_table(uuid),
  public.confirm_session(uuid),
  public.close_session(uuid, boolean)
from public, anon;

grant execute on function
  public.join_table(text),
  public.open_table(uuid),
  public.confirm_session(uuid),
  public.close_session(uuid, boolean)
to authenticated;

-- ---------------------------------------------------------------------------
-- Regla 14: una mesa con una estadía en curso no se desactiva
-- ---------------------------------------------------------------------------

create function private.check_table_deactivation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.active and not new.active and exists (
    select 1
    from public.table_sessions s
    where s.table_id = new.id
      and s.status = 'open'
      and (
        exists (select 1 from public.orders o where o.session_id = s.id)
        or exists (select 1 from public.waiter_calls c where c.session_id = s.id and c.attended_at is null)
      )
  ) then
    raise exception 'table_has_open_session';
  end if;
  return new;
end
$$;

create trigger tables_check_deactivation
  before update of active on public.tables
  for each row execute function private.check_table_deactivation();

-- ---------------------------------------------------------------------------
-- RLS: el rol se calcula una vez por consulta, no una vez por fila
-- ---------------------------------------------------------------------------

drop policy "table_sessions: personal o cliente" on public.table_sessions;
create policy "table_sessions: personal o cliente" on public.table_sessions
  for select to authenticated
  using ((select private.has_role('admin', 'waiter', 'kitchen')) or private.is_guest(id));

drop policy "session_guests: propio o personal" on public.session_guests;
create policy "session_guests: propio o personal" on public.session_guests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin', 'waiter', 'kitchen')));

drop policy "orders: personal o cliente" on public.orders;
create policy "orders: personal o cliente" on public.orders
  for select to authenticated
  using ((select private.has_role('admin', 'waiter', 'kitchen')) or private.is_guest(session_id));

drop policy "order_items: personal o cliente" on public.order_items;
create policy "order_items: personal o cliente" on public.order_items
  for select to authenticated
  using (
    (select private.has_role('admin', 'waiter', 'kitchen'))
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and private.is_guest(o.session_id)
    )
  );

drop policy "order_item_events: personal" on public.order_item_events;
create policy "order_item_events: personal" on public.order_item_events
  for select to authenticated
  using ((select private.has_role('admin', 'waiter', 'kitchen')));

drop policy "waiter_calls: personal o cliente" on public.waiter_calls;
create policy "waiter_calls: personal o cliente" on public.waiter_calls
  for select to authenticated
  using ((select private.has_role('admin', 'waiter', 'kitchen')) or private.is_guest(session_id));
