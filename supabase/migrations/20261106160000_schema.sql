-- Esquema inicial. Detalle de cada tabla en docs/03-modelo-de-datos.md.
-- Precios en CLP como enteros.

-- Personal del local (admin, garzón, cocina), vinculado a Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  email text not null,
  role text not null check (role in ('admin', 'waiter', 'kitchen')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number > 0),
  capacity int not null check (capacity > 0),
  zone text not null default 'Salón',
  qr_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables (id),
  status text not null default 'open' check (status in ('open', 'closed')),
  guest_count int check (guest_count between 1 and 50),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles (id),
  constraint closed_at_matches_status check ((status = 'closed') = (closed_at is not null))
);

-- Una sola sesión abierta por mesa.
create unique index table_sessions_one_open_per_table
  on public.table_sessions (table_id) where status = 'open';

-- Celulares (usuarios anónimos) unidos a una sesión de mesa.
create table public.session_guests (
  session_id uuid not null references public.table_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index session_guests_user_idx on public.session_guests (user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  name text not null,
  description text,
  price int not null check (price >= 0),
  photo_url text,
  available boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 0
);
create index dishes_category_idx on public.dishes (category_id);

create table public.dish_extras (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes (id) on delete cascade,
  name text not null,
  price int not null default 0 check (price >= 0)
);
create index dish_extras_dish_idx on public.dish_extras (dish_id);

-- Cada ronda enviada a cocina. "number" es el correlativo visible: Pedido #1042.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number int generated always as identity (start with 1001) unique,
  session_id uuid not null references public.table_sessions (id),
  created_by uuid references public.profiles (id), -- nulo si lo envió el cliente
  created_at timestamptz not null default now()
);
create index orders_session_idx on public.orders (session_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  dish_id uuid not null references public.dishes (id),
  quantity int not null check (quantity between 1 and 50),
  note text check (length(note) <= 200),
  unit_price int not null check (unit_price >= 0), -- precio al momento del pedido
  status text not null default 'recibido' check (
    status in ('recibido', 'en_preparacion', 'listo_para_entregar', 'entregado', 'cancelado')
  )
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_active_idx on public.order_items (status)
  where status in ('recibido', 'en_preparacion', 'listo_para_entregar');

create table public.order_item_extras (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  extra_id uuid not null references public.dish_extras (id),
  price int not null check (price >= 0) -- precio al momento del pedido
);
create index order_item_extras_item_idx on public.order_item_extras (order_item_id);

-- Trazabilidad: una fila por cada cambio de estado de un ítem.
create table public.order_item_events (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  status text not null,
  changed_by uuid references public.profiles (id), -- nulo si fue el cliente
  changed_at timestamptz not null default now()
);
create index order_item_events_item_idx on public.order_item_events (order_item_id, changed_at);

create table public.waiter_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.table_sessions (id),
  type text not null check (type in ('call', 'bill')),
  created_at timestamptz not null default now(),
  attended_at timestamptz,
  attended_by uuid references public.profiles (id)
);

-- Un solo llamado pendiente por tipo y sesión (evita llamados repetidos).
create unique index waiter_calls_one_pending
  on public.waiter_calls (session_id, type) where attended_at is null;
