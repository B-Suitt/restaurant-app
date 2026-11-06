-- Permisos con RLS. Lecturas por política; las escrituras operativas (sesiones, pedidos,
-- estados, llamados) solo pasan por las funciones RPC de la siguiente migración.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Rol del usuario actual si es personal activo; nulo si es cliente o está desactivado.
create function private.staff_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid()) and active
$$;

create function private.has_role(variadic roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.staff_role() = any (roles), false)
$$;

-- El usuario actual se unió a esta sesión y sigue abierta.
create function private.is_guest(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.session_guests g
    join public.table_sessions s on s.id = g.session_id
    where g.session_id = p_session_id
      and g.user_id = (select auth.uid())
      and s.status = 'open'
  )
$$;

alter table public.profiles enable row level security;
alter table public.tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.session_guests enable row level security;
alter table public.categories enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_extras enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_extras enable row level security;
alter table public.order_item_events enable row level security;
alter table public.waiter_calls enable row level security;

-- profiles
create policy "profiles: el propio o personal" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.has_role('admin', 'waiter', 'kitchen'));
create policy "profiles: admin administra" on public.profiles
  for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));

-- tables
create policy "tables: personal o cliente de la mesa" on public.tables
  for select to authenticated
  using (
    private.has_role('admin', 'waiter', 'kitchen')
    or exists (
      select 1 from public.table_sessions s
      where s.table_id = tables.id and private.is_guest(s.id)
    )
  );
create policy "tables: admin administra" on public.tables
  for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));

-- Carta: pública para leer; solo admin escribe.
create policy "categories: lectura" on public.categories
  for select to anon, authenticated
  using (active or private.has_role('admin'));
create policy "categories: admin administra" on public.categories
  for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));

create policy "dishes: lectura" on public.dishes
  for select to anon, authenticated using (true);
create policy "dishes: admin administra" on public.dishes
  for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));

create policy "dish_extras: lectura" on public.dish_extras
  for select to anon, authenticated using (true);
create policy "dish_extras: admin administra" on public.dish_extras
  for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));

-- Operación: el personal ve todo; el cliente solo su sesión abierta.
create policy "table_sessions: personal o cliente" on public.table_sessions
  for select to authenticated
  using (private.has_role('admin', 'waiter', 'kitchen') or private.is_guest(id));

create policy "session_guests: propio o personal" on public.session_guests
  for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role('admin', 'waiter', 'kitchen'));

create policy "orders: personal o cliente" on public.orders
  for select to authenticated
  using (private.has_role('admin', 'waiter', 'kitchen') or private.is_guest(session_id));

create policy "order_items: personal o cliente" on public.order_items
  for select to authenticated
  using (
    private.has_role('admin', 'waiter', 'kitchen')
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and private.is_guest(o.session_id)
    )
  );

-- Visible si el ítem es visible (la subconsulta aplica la política de order_items).
create policy "order_item_extras: según el ítem" on public.order_item_extras
  for select to authenticated
  using (exists (select 1 from public.order_items i where i.id = order_item_extras.order_item_id));

create policy "order_item_events: personal" on public.order_item_events
  for select to authenticated
  using (private.has_role('admin', 'waiter', 'kitchen'));

create policy "waiter_calls: personal o cliente" on public.waiter_calls
  for select to authenticated
  using (private.has_role('admin', 'waiter', 'kitchen') or private.is_guest(session_id));
