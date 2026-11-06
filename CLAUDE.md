# [nombre-proyecto]

Plataforma web de autogestión de pedidos y administración de mesas para restaurantes.
El cliente escanea un QR en su mesa, pide desde el celular y los pedidos llegan en
tiempo real a cocina y al garzón. Objetivo: eliminar tiempos de espera y medir el
ciclo completo de cada pedido.

MVP desarrollado por un equipo de 2 personas. Todo es web (no hay app nativa).

## Diseño (fuente de verdad visual)

- Archivo Figma: https://www.figma.com/design/mGJooq4UkXcrvnwKOimjwL/Restaurant-app--copia-?node-id=0-1
- Hay una sola página con una sección por rol: Cliente, Garzón, Cocina y Administrador.
- Antes de construir una pantalla, usar el Figma MCP: `get_metadata` para ubicar el frame,
  `get_design_context` para su estructura y estilos, y `get_screenshot` para compararla.
- El código que entrega Figma es una referencia: adaptarlo a los componentes y tokens del
  proyecto, nunca pegarlo tal cual.
- Los diseños no tienen variables de Figma: extraer colores, tipografías, radios y
  espaciados de los frames y centralizarlos en `tailwind.config` / variables CSS.
- Paleta: rojo (color principal y acciones), negro y blanco; grises neutros para fondos y bordes.
- Iconos: Lucide (los nombres de capa en Figma ya son nombres de Lucide: `utensils`,
  `qr-code`, `bell`, `users`, `history`, `layers`, `plus`, `grip-vertical`, `image-plus`, `info`).

### Pantallas por rol

**Cliente (móvil, 390 px):** bienvenida a la mesa · menú con categorías · detalle del plato
(adicionales y nota) · carrito · seguimiento del pedido · cuenta de la mesa · modal
"Llamar al garzón" · modal "Pedir la cuenta".

**Garzón (móvil, 390 px):** login · grilla de mesas con estados · detalle de mesa ·
agregar pedido a una mesa · platos listos para despachar · bandeja de avisos · modal cerrar mesa.

**Cocina (pantalla ancha / tablet horizontal):** login · tablero kanban
(Recibido / En preparación / Listo para entregar).

**Administrador (escritorio, 1440 px, menú lateral):** login · dashboard en vivo ·
mesas y QR · editar mesa · código QR de la mesa · gestión del menú · editar plato ·
categorías · usuarios y roles · editar usuario · historial de pedidos · detalle histórico
(con línea de tiempo de estados).

### No está en Figma pero hay que implementarlo

Seguir el mismo estilo visual para:
- Estados vacíos: sin pedidos, sin platos listos, cocina sin pedidos, menú sin platos.
- Errores: QR inválido o de mesa cerrada, plato agotado mientras está en el carrito,
  pérdida de conexión (aviso visible y reconexión automática).
- Estados de carga (skeletons).

## Stack

<!-- Cambiar aquí si el equipo decide otro stack -->
- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Supabase: PostgreSQL, Auth, Realtime y Storage (fotos de platos)
- Lucide React para iconos
- Hosting: por definir (Vercel o VPS). No agregar configuración específica de ningún
  proveedor hasta que se decida.

## Comandos

- Instalar: `npm install`
- Desarrollo: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Supabase local (requiere Docker Desktop abierto): `npx supabase start` · `npx supabase stop`
- Reiniciar base con migraciones y datos de prueba: `npx supabase db reset`
- Tests de base de datos: `npm run db:test`
- Regenerar tipos tras cambiar el esquema: `npm run db:types`
- Usuarios de prueba (contraseña `restaurante123`): `admin@`, `garzon@`, `cocina@restaurante.cl`.
  QR de prueba: `/m/mesa-01` … `/m/mesa-08`.

## Rutas

| Ruta | Rol | Acceso |
|---|---|---|
| `/m/[qrToken]` | Cliente | Público, vía QR |
| `/garzon` | Garzón | Login, rol `waiter` |
| `/cocina` | Cocina | Login, rol `kitchen` |
| `/admin` | Administrador | Login, rol `admin` |
| `/login` | Personal | Público |

Cada rol solo ve su sección. Los permisos se validan con políticas RLS de Supabase,
nunca solo en el frontend.

## Modelo de datos

Detalle completo de columnas y tipos en `docs/03-modelo-de-datos.md` (fuente de verdad).

Tablas: `tables`, `table_sessions`, `categories`, `dishes`, `dish_extras`, `orders`,
`order_items`, `order_item_extras`, `order_item_events`, `waiter_calls`, `profiles`.
Roles en `profiles.role`: `admin` | `waiter` | `kitchen`.

Precios en pesos chilenos (CLP), enteros, sin decimales. Formato de pantalla: `$22.400`.

## Estados del pedido

Por ítem (cada plato tiene su propio estado). Usar siempre estos valores y en este orden:

1. `recibido`: al enviar el pedido.
2. `en_preparacion`: lo cambia cocina.
3. `listo_para_entregar`: lo cambia cocina.
4. `entregado`: lo cambia el garzón.

Además, `cancelado`: solo desde `recibido`, por el cliente o el garzón.
Detalle en `docs/04-flujo-de-estados.md`.

Cada cambio se registra en `order_item_events` con fecha, hora y usuario (trazabilidad).
Etiquetas en pantalla: Recibido, En preparación, Listo para entregar, Entregado; cada
estado con el mismo color en todas las vistas, según Figma.

## Tiempo real

Con Supabase Realtime:
- Cocina recibe pedidos nuevos al instante, con alerta visual y sonora.
- Garzón recibe platos listos y llamados del cliente.
- Cliente ve el estado de sus platos sin recargar.
- Admin ve el dashboard actualizado.

## Reglas de negocio (provisionales)

- El primer escaneo del QR abre la sesión de la mesa si no hay una abierta; los
  siguientes escaneos se unen a esa misma sesión.
- Todas las rondas de pedidos de una sesión suman a una sola cuenta.
- Un ítem solo se puede cancelar mientras está en `recibido`.
- El pago es fuera de la app: el garzón cierra la mesa y la sesión queda `cerrada`.
- Un QR de una mesa inactiva o un token inválido muestra una pantalla de error.
- Un plato no disponible se muestra en gris y no se puede agregar al carrito.

Si una tarea depende de una regla que no está aquí, preguntar antes de suponer.

## Fuera de alcance (no implementar)

- Pagos en línea o pasarelas de pago.
- Dividir la cuenta.
- Multi-local.
- App nativa.

## Orden de construcción

1. Proyecto base: Next.js, Tailwind, tokens de diseño extraídos de Figma, componentes base
   (botón, campo, tarjeta, chip de estado, modal, tabla).
2. Supabase: esquema, políticas RLS, datos de prueba (un menú y 8 mesas).
3. Flujo mínimo completo: cliente pide → cocina ve y cambia estado → garzón entrega.
4. Llamados al garzón, cuenta y cierre de mesa.
5. Panel de administrador.
6. Estados vacíos, errores y carga.

Terminar y probar cada fase antes de pasar a la siguiente.

## Convenciones

- Código (variables, funciones, archivos, tablas) en inglés; textos visibles en español de Chile.
- Componentes en PascalCase; utilidades en kebab-case.
- Diseño mobile-first para cliente y garzón.
- Ramas: `feature/nombre-corto`, `fix/nombre-corto`. Commits cortos en español.

## Cómo trabajar

- Antes de cada fase, proponer un plan breve y esperar aprobación.
- Cambios pequeños, una funcionalidad a la vez.
- No instalar dependencias nuevas ni cambiar el esquema de la base de datos sin avisar.
- Al terminar una pantalla, compararla con su frame de Figma (`get_screenshot`) y ajustar
  diferencias visibles.

## Documentación

Detalle del producto en `/docs`:
`01-definicion-producto.md` · `02-funcionalidades.md` · `03-modelo-de-datos.md` ·
`04-flujo-de-estados.md` · `05-reglas-de-negocio.md` · `06-decisiones-tecnicas.md`
