-- Datos de prueba para desarrollo local (se cargan con `supabase db reset`).
-- Usuarios del personal: contraseña "restaurante123" para todos.

-- ---------------------------------------------------------------------------
-- Personal
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('restaurante123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-0000-0000-00000000a001'::uuid, 'admin@restaurante.cl'),
  ('00000000-0000-0000-0000-00000000a002'::uuid, 'garzon@restaurante.cl'),
  ('00000000-0000-0000-0000-00000000a003'::uuid, 'cocina@restaurante.cl')
) as u (id, email);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users
where id in (
  '00000000-0000-0000-0000-00000000a001',
  '00000000-0000-0000-0000-00000000a002',
  '00000000-0000-0000-0000-00000000a003'
);

insert into public.profiles (id, name, email, role) values
  ('00000000-0000-0000-0000-00000000a001', 'Valentina Soto', 'admin@restaurante.cl', 'admin'),
  ('00000000-0000-0000-0000-00000000a002', 'Camila Rojas', 'garzon@restaurante.cl', 'waiter'),
  ('00000000-0000-0000-0000-00000000a003', 'Estación cocina', 'cocina@restaurante.cl', 'kitchen');

-- ---------------------------------------------------------------------------
-- Mesas: QR de desarrollo predecibles → /m/mesa-01 … /m/mesa-08
-- ---------------------------------------------------------------------------
insert into public.tables (number, capacity, zone, qr_token)
select n, case when n % 2 = 0 then 2 else 4 end,
  case when n <= 6 then 'Salón' else 'Terraza' end,
  'mesa-' || lpad(n::text, 2, '0')
from generate_series(1, 8) as n;

-- ---------------------------------------------------------------------------
-- Carta
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, description, sort_order) values
  ('00000000-0000-0000-0000-0000000c0001', 'Para compartir', 'Para abrir el apetito en la mesa', 1),
  ('00000000-0000-0000-0000-0000000c0002', 'Fondos', 'Platos principales', 2),
  ('00000000-0000-0000-0000-0000000c0003', 'Bebidas', 'Jugos, bebidas y cervezas', 3),
  ('00000000-0000-0000-0000-0000000c0004', 'Postres', 'Para terminar', 4);

insert into public.dishes (id, category_id, name, description, price, available, featured, sort_order) values
  ('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000c0001', 'Papas rústicas', 'Crujientes, con alioli de la casa.', 4500, true, true, 1),
  ('00000000-0000-0000-0000-0000000d0002', '00000000-0000-0000-0000-0000000c0001', 'Empanaditas de queso', 'Seis unidades, con pebre.', 5900, true, false, 2),
  ('00000000-0000-0000-0000-0000000d0003', '00000000-0000-0000-0000-0000000c0002', 'Smash burger', 'Doble carne a la plancha, cheddar fundido, pepinillos y salsa de la casa en pan brioche.', 9900, true, true, 1),
  ('00000000-0000-0000-0000-0000000d0004', '00000000-0000-0000-0000-0000000c0002', 'Lomo a lo pobre', 'Con papas fritas, cebolla y huevo.', 12900, true, false, 2),
  ('00000000-0000-0000-0000-0000000d0005', '00000000-0000-0000-0000-0000000c0002', 'Ensalada César', 'Pollo grillado, crutones y parmesano.', 8900, true, false, 3),
  ('00000000-0000-0000-0000-0000000d0006', '00000000-0000-0000-0000-0000000c0003', 'Limonada de la casa', 'Limón fresco, menta y hielo.', 3500, true, true, 1),
  ('00000000-0000-0000-0000-0000000d0007', '00000000-0000-0000-0000-0000000c0003', 'Bebida en lata', 'Coca-Cola, Sprite o Fanta.', 2000, true, false, 2),
  ('00000000-0000-0000-0000-0000000d0008', '00000000-0000-0000-0000-0000000c0003', 'Cerveza artesanal', 'Rubia o roja, 500 cc.', 4500, true, false, 3),
  ('00000000-0000-0000-0000-0000000d0009', '00000000-0000-0000-0000-0000000c0004', 'Brownie tibio', 'Chocolate intenso y helado.', 5200, false, false, 1),
  ('00000000-0000-0000-0000-0000000d0010', '00000000-0000-0000-0000-0000000c0004', 'Tres leches', 'Receta de la casa.', 4900, true, false, 2);

insert into public.dish_extras (dish_id, name, price) values
  ('00000000-0000-0000-0000-0000000d0003', 'Extra cheddar', 1000),
  ('00000000-0000-0000-0000-0000000d0003', 'Tocino crujiente', 1500),
  ('00000000-0000-0000-0000-0000000d0003', 'Palta', 1500),
  ('00000000-0000-0000-0000-0000000d0001', 'Salsa cheddar', 1200),
  ('00000000-0000-0000-0000-0000000d0005', 'Doble pollo', 2500),
  ('00000000-0000-0000-0000-0000000d0006', 'Con jengibre', 0);

-- Fotos de demo (recortadas del Figma, en public/demo). En producción se suben a Storage.
update public.dishes set photo_url = '/demo/' || v.file
from (values
  ('00000000-0000-0000-0000-0000000d0001'::uuid, 'papas-rusticas.jpg'),
  ('00000000-0000-0000-0000-0000000d0003'::uuid, 'smash-burger.jpg'),
  ('00000000-0000-0000-0000-0000000d0006'::uuid, 'limonada.jpg'),
  ('00000000-0000-0000-0000-0000000d0009'::uuid, 'brownie.jpg')
) as v (id, file)
where dishes.id = v.id;
