# 03 - Modelo de datos

Base de datos PostgreSQL en Supabase. Nombres de tablas y columnas en inglés.
Precios en CLP como enteros.

## Relaciones

```
tables 1──N table_sessions 1──N orders 1──N order_items 1──N order_item_events
                     │                           │
                     ├──N waiter_calls           └──N order_item_extras N──1 dish_extras
                     └──N session_guests (celulares de clientes)

categories 1──N dishes 1──N dish_extras
profiles (personal: admin, garzón, cocina)
```

## Tablas

### tables
Mesas del local.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| number | int | Número visible de la mesa, único |
| capacity | int | Cantidad de personas |
| zone | text | Zona del local (Salón, Terraza); filtro en la vista del garzón |
| qr_token | text | Único; va en la URL del QR |
| active | boolean | Una mesa inactiva no acepta pedidos |

### table_sessions
Cada estadía de clientes en una mesa. Agrupa todos los pedidos en una cuenta.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| table_id | uuid | FK → tables |
| status | text | `open` \| `closed` |
| opened_at | timestamptz | |
| confirmed_at | timestamptz | Cuándo confirmó el garzón; nulo = los pedidos aún no llegan a cocina |
| confirmed_by | uuid | FK → profiles (garzón que confirmó) |
| closed_at | timestamptz | Nulo mientras está abierta |
| closed_by | uuid | FK → profiles (garzón que cerró) |
| unpaid | boolean | El garzón marcó que el cliente se fue sin pagar |

Restricción: una sola sesión `open` por mesa.

### session_guests
Celulares de clientes (usuarios anónimos de Supabase Auth) unidos a una sesión.
Permite que RLS y Realtime le muestren a cada cliente solo su mesa.

| Columna | Tipo | Notas |
|---|---|---|
| session_id | uuid | PK, FK → table_sessions |
| user_id | uuid | PK, FK → auth.users |
| joined_at | timestamptz | |

### categories

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| name | text | |
| description | text | |
| sort_order | int | Orden en el menú |
| active | boolean | |

### dishes

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| category_id | uuid | FK → categories |
| name | text | |
| description | text | |
| price | int | CLP |
| photo_url | text | Supabase Storage |
| available | boolean | Falso = agotado |
| featured | boolean | Plato sugerido o destacado |
| sort_order | int | Orden dentro de la categoría |

### dish_extras
Adicionales de un plato.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| dish_id | uuid | FK → dishes |
| name | text | |
| price | int | CLP, puede ser 0 |

### orders
Cada ronda enviada a cocina.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| number | int | Correlativo visible ("Pedido #1042"), desde 1001 |
| session_id | uuid | FK → table_sessions |
| created_by | uuid | FK → profiles; nulo si lo envió el cliente |
| created_at | timestamptz | |

### order_items

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK → orders |
| dish_id | uuid | FK → dishes |
| quantity | int | |
| note | text | Ej.: "sin cebolla" |
| unit_price | int | Precio al momento del pedido |
| status | text | Ver 04-flujo-de-estados |

### order_item_extras

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| order_item_id | uuid | FK → order_items |
| extra_id | uuid | FK → dish_extras |
| price | int | Precio al momento del pedido |

### order_item_events
Historial de cambios de estado (trazabilidad).

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| order_item_id | uuid | FK → order_items |
| status | text | Estado al que pasó |
| changed_by | uuid | FK → profiles; nulo si fue el sistema o el cliente |
| changed_at | timestamptz | |

### waiter_calls

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| session_id | uuid | FK → table_sessions |
| type | text | `call` \| `bill` |
| created_at | timestamptz | |
| attended_at | timestamptz | Nulo mientras está pendiente |
| attended_by | uuid | FK → profiles |

### profiles
Personal del local, vinculado a Supabase Auth.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK, = auth.users.id |
| name | text | |
| email | text | Copia del correo de Auth, para listarlo en el admin |
| role | text | `admin` \| `waiter` \| `kitchen` |
| active | boolean | Desactivado = no puede entrar |

## Cálculos

- Total de la cuenta = suma de (`unit_price` + extras) × `quantity` de todos los ítems
  no cancelados de la sesión.
- Los precios se copian al ítem al pedir, para que un cambio de precio en el menú no
  altere cuentas abiertas ni el historial.

## Escrituras y funciones (RPC)

El esquema vive en `supabase/migrations/`. Las tablas operativas no tienen políticas de
escritura: todo cambio pasa por estas funciones, que validan rol, sesión y precios.

| Función | Quién | Qué hace |
|---|---|---|
| `join_table(qr_token)` | Cliente | Abre la sesión o se une a la abierta. En una sesión sin pedidos saca a los celulares con más de 2 horas. Error `invalid_qr` si el token no existe o la mesa está inactiva |
| `open_table(table_id)` | Garzón | Abre o retoma la sesión de una mesa |
| `confirm_session(session_id)` | Garzón | Confirma que hay clientes: los pedidos pasan a cocina |
| `place_order(session_id, items)` | Cliente de la mesa o garzón | Crea la ronda con precios de la carta, hasta 50 líneas. Un pedido del garzón confirma la mesa. Error `dish_unavailable` si un plato está agotado |
| `set_item_status(item_id, status)` | Cocina, garzón o cliente (solo cancelar) | Avanza el estado; cocina solo en mesas confirmadas. Un trigger impide saltos y registra el evento |
| `call_waiter(session_id, type)` | Cliente de la mesa | Llamado `call` o `bill`; no duplica uno pendiente |
| `attend_call(call_id)` | Garzón | Marca el llamado como atendido |
| `close_session(session_id, unpaid?)` | Garzón | Cierra la mesa, atiende los llamados pendientes y registra si se fue sin pagar |
