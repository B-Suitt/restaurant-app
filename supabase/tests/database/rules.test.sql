-- Reglas de negocio y permisos. Correr con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- ---------------------------------------------------------------------------
-- Preparación (como postgres)
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to authenticated;

-- Simula una sesión de Supabase Auth para el usuario dado.
create function tests.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

insert into auth.users (id, email, aud, role, is_anonymous) values
  ('10000000-0000-0000-0000-000000000001', 'w@test.cl', 'authenticated', 'authenticated', false),
  ('10000000-0000-0000-0000-000000000002', 'k@test.cl', 'authenticated', 'authenticated', false),
  ('10000000-0000-0000-0000-000000000003', 'x@test.cl', 'authenticated', 'authenticated', false),
  ('10000000-0000-0000-0000-0000000000a1', null, 'authenticated', 'authenticated', true),
  ('10000000-0000-0000-0000-0000000000a2', null, 'authenticated', 'authenticated', true),
  ('10000000-0000-0000-0000-0000000000a3', null, 'authenticated', 'authenticated', true);

insert into public.profiles (id, name, email, role, active) values
  ('10000000-0000-0000-0000-000000000001', 'Garzón', 'w@test.cl', 'waiter', true),
  ('10000000-0000-0000-0000-000000000002', 'Cocina', 'k@test.cl', 'kitchen', true),
  ('10000000-0000-0000-0000-000000000003', 'Garzón inactivo', 'x@test.cl', 'waiter', false);

insert into public.tables (number, capacity, qr_token, active) values
  (101, 4, 'tok-1', true), (102, 4, 'tok-2', true), (103, 4, 'tok-3', false);

insert into public.categories (id, name) values ('20000000-0000-0000-0000-000000000001', 'Test');
insert into public.dishes (id, category_id, name, price, available) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Disponible', 9900, true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Agotado', 5000, false);
insert into public.dish_extras (id, dish_id, name, price) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Extra', 1000);

-- ---------------------------------------------------------------------------
-- Entrar por QR
-- ---------------------------------------------------------------------------
select tests.login('10000000-0000-0000-0000-0000000000a1');
select set_config('t.s1', public.join_table('tok-1', 2)::text, true);
select ok(current_setting('t.s1') is not null, 'el primer escaneo abre la sesión');
select throws_ok($$ select public.join_table('no-existe') $$, 'P0001', 'invalid_qr', 'un token inválido da error');
select throws_ok($$ select public.join_table('tok-3') $$, 'P0001', 'invalid_qr', 'una mesa inactiva da error');

select tests.login('10000000-0000-0000-0000-0000000000a2');
select is(public.join_table('tok-1')::text, current_setting('t.s1'), 'el segundo escaneo se une a la misma sesión');

select tests.login('10000000-0000-0000-0000-0000000000a3');
select set_config('t.s2', public.join_table('tok-2')::text, true);

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
select tests.login('10000000-0000-0000-0000-0000000000a1');
select set_config('t.o1', public.place_order(
  current_setting('t.s1')::uuid,
  '[{"dish_id":"30000000-0000-0000-0000-000000000001","quantity":2,"note":"sin cebolla","unit_price":1,
     "extra_ids":["40000000-0000-0000-0000-000000000001"]},
    {"dish_id":"30000000-0000-0000-0000-000000000001","quantity":1}]'::jsonb
)::text, true);

select is(
  (select array_agg(unit_price) from public.order_items where order_id = current_setting('t.o1')::uuid),
  array[9900, 9900],
  'el precio sale de la carta, no del cliente'
);
select is(
  (select price from public.order_item_extras limit 1), 1000, 'el adicional guarda su precio'
);
select is(
  (select count(*)::int from public.order_items where order_id = current_setting('t.o1')::uuid and status = 'recibido'),
  2, 'los ítems nacen en recibido'
);
select throws_ok(
  format($$ select public.place_order(%L, '[{"dish_id":"30000000-0000-0000-0000-000000000002","quantity":1}]') $$, current_setting('t.s1')),
  'P0001', 'dish_unavailable', 'no se puede pedir un plato agotado'
);
select throws_ok(
  format($$ select public.place_order(%L, '[]') $$, current_setting('t.s1')),
  'P0001', 'empty_order', 'no se puede enviar un pedido vacío'
);

-- Guardar los ids de los ítems para las pruebas de estado.
select set_config('t.i1', (select id::text from public.order_items where order_id = current_setting('t.o1')::uuid and note is not null), true);
select set_config('t.i2', (select id::text from public.order_items where order_id = current_setting('t.o1')::uuid and note is null), true);

-- Otra mesa no ve ni puede pedir en esta sesión.
select tests.login('10000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.orders where session_id = current_setting('t.s1')::uuid), 0,
  'un cliente no ve los pedidos de otra mesa');
select is((select count(*)::int from public.order_items), 0, 'un cliente no ve ítems de otra mesa');
select throws_ok(
  format($$ select public.place_order(%L, '[{"dish_id":"30000000-0000-0000-0000-000000000001","quantity":1}]') $$, current_setting('t.s1')),
  'P0001', 'forbidden', 'un cliente no puede pedir en otra mesa'
);

-- ---------------------------------------------------------------------------
-- Estados
-- ---------------------------------------------------------------------------
select tests.login('10000000-0000-0000-0000-000000000002'); -- cocina
select lives_ok(format($$ select public.set_item_status(%L, 'en_preparacion') $$, current_setting('t.i1')),
  'cocina pasa a en preparación');
select throws_ok(format($$ select public.set_item_status(%L, 'entregado') $$, current_setting('t.i1')),
  'P0001', 'forbidden', 'cocina no puede marcar entregado');
select throws_ok(format($$ select public.set_item_status(%L, 'listo_para_entregar') $$, current_setting('t.i2')),
  'P0001', 'invalid_transition', 'no se puede saltar estados');

-- Sin política de update, una escritura directa no afecta filas.
update public.order_items set status = 'entregado' where id = current_setting('t.i1')::uuid;
select is((select status from public.order_items where id = current_setting('t.i1')::uuid), 'en_preparacion',
  'no se puede cambiar el estado sin pasar por la función');

select lives_ok(format($$ select public.set_item_status(%L, 'listo_para_entregar') $$, current_setting('t.i1')),
  'cocina marca listo para entregar');

select tests.login('10000000-0000-0000-0000-000000000001'); -- garzón
select throws_ok(format($$ select public.set_item_status(%L, 'cancelado') $$, current_setting('t.i1')),
  'P0001', 'invalid_transition', 'no se cancela un plato que ya no está en recibido');
select lives_ok(format($$ select public.set_item_status(%L, 'entregado') $$, current_setting('t.i1')),
  'el garzón entrega');

select results_eq(
  format($$ select status, changed_by from public.order_item_events where order_item_id = %L order by changed_at, array_position(array['recibido','en_preparacion','listo_para_entregar','entregado','cancelado'], status) $$, current_setting('t.i1')),
  $$ values ('recibido', null::uuid),
            ('en_preparacion', '10000000-0000-0000-0000-000000000002'::uuid),
            ('listo_para_entregar', '10000000-0000-0000-0000-000000000002'::uuid),
            ('entregado', '10000000-0000-0000-0000-000000000001'::uuid) $$,
  'cada cambio queda registrado con su usuario'
);

select tests.login('10000000-0000-0000-0000-0000000000a2'); -- cliente de la mesa
select lives_ok(format($$ select public.set_item_status(%L, 'cancelado') $$, current_setting('t.i2')),
  'el cliente cancela un plato en recibido');

-- ---------------------------------------------------------------------------
-- Llamados y cierre
-- ---------------------------------------------------------------------------
select set_config('t.c1', public.call_waiter(current_setting('t.s1')::uuid, 'bill')::text, true);
select is(public.call_waiter(current_setting('t.s1')::uuid, 'bill')::text, current_setting('t.c1'),
  'pedir la cuenta dos veces no duplica el llamado');

select tests.login('10000000-0000-0000-0000-000000000003'); -- garzón desactivado
select is((select count(*)::int from public.table_sessions), 0, 'un usuario desactivado no ve las mesas');
select throws_ok(format($$ select public.close_session(%L) $$, current_setting('t.s1')),
  'P0001', 'forbidden', 'un usuario desactivado no puede cerrar mesas');

select tests.login('10000000-0000-0000-0000-000000000001'); -- garzón
select lives_ok(format($$ select public.close_session(%L) $$, current_setting('t.s1')), 'el garzón cierra la mesa');
select ok(
  (select attended_at is not null from public.waiter_calls where id = current_setting('t.c1')::uuid),
  'al cerrar, los llamados pendientes quedan atendidos'
);

select tests.login('10000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.orders), 0, 'con la mesa cerrada el cliente ya no ve la cuenta anterior');
select throws_ok(
  $$ insert into public.categories (name) values ('Hack') $$,
  '42501', null, 'un cliente no puede modificar la carta'
);

-- ---------------------------------------------------------------------------
-- Adicionales retirados
-- ---------------------------------------------------------------------------
reset role;
update public.dish_extras set active = false where id = '40000000-0000-0000-0000-000000000001';
select tests.login('10000000-0000-0000-0000-0000000000a3');
select throws_ok(
  format($$ select public.place_order(%L, '[{"dish_id":"30000000-0000-0000-0000-000000000001","quantity":1,"extra_ids":["40000000-0000-0000-0000-000000000001"]}]') $$, current_setting('t.s2')),
  'P0001', 'extra_not_found', 'un adicional retirado no se puede pedir'
);
select lives_ok(
  format($$ select public.place_order(%L, '[{"dish_id":"30000000-0000-0000-0000-000000000001","quantity":1}]') $$, current_setting('t.s2')),
  'el plato se sigue pidiendo sin el adicional retirado'
);

select * from finish();
rollback;
