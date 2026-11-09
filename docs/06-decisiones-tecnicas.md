# 06 - Decisiones técnicas

Registro de decisiones con fecha y motivo, para no volver a discutirlas.

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-06 | Todo es web, sin app nativa | El cliente no instala nada; un solo código para los cuatro roles |
| 2026-11-06 | Next.js + React + TypeScript | Un solo proyecto con rutas por rol; mucha documentación y ejemplos |
| 2026-11-06 | Tailwind CSS | Traducir rápido los diseños de Figma |
| 2026-11-06 | Supabase (PostgreSQL, Auth, Realtime, Storage) | Evita mantener un servidor propio; equipo de 2 personas |
| 2026-11-06 | Tiempo real con Supabase Realtime, sin WebSockets propios | Realtime ya usa WebSockets por debajo; menos código que mantener |
| 2026-11-06 | Permisos con políticas RLS | Seguridad en la base de datos, no solo en el frontend |
| 2026-11-06 | Sin pagos en el MVP | Reducir alcance; el cobro se hace fuera de la app |
| 2026-11-06 | Estado por plato, no por pedido | Cocina prepara platos a distinto ritmo; mejor trazabilidad |
| 2026-11-06 | Cliente con Supabase Anonymous Sign-In + tabla `session_guests` | RLS y Realtime filtran por mesa sin código extra; el cliente no se registra |
| 2026-11-06 | Escrituras operativas solo por funciones RPC | Precios, roles y transiciones se validan en la base de datos, no en el frontend |
| 2026-11-06 | Sin garzón asignado por mesa en el MVP | Los llamados llegan a todos los garzones; se registra quién atendió |
| 2026-11-06 | Supabase local con Docker para desarrollo | Gratis, se resetea con un comando y los tests no tocan datos reales |
| 2026-11-06 | Vistas de cada rol como componentes cliente; `proxy.ts` solo redirige por rol | Dependen de la sesión del navegador y de Realtime; la seguridad sigue en RLS |
| 2026-11-06 | Vista del cliente con `instant = false` | Necesita la sesión anónima y la mesa antes de mostrar algo; dentro, la navegación es instantánea |
| 2026-11-06 | Un solo `/login` para todo el personal | Móvil con el diseño de "Garzón · Acceso"; pantalla ancha con el diseño dividido de "Cocina · Acceso" |
| 2026-11-06 | Carrito guardado en el navegador por sesión de mesa | Sobrevive a recargas; cada celular arma su propio carrito |
| 2026-11-09 | La mesa se ve ocupada desde el primer pedido o llamado, no desde el escaneo | Abrir o recargar el enlace no debe ocupar una mesa; la sesión vacía se reutiliza |
| 2026-11-09 | El QR impreso lleva `?scan=1` y la app lo quita al entrar | Distingue un escaneo de una recarga para no abrir otra estadía tras el cierre. No es seguridad: una foto del QR sigue funcionando |

## Notas de implementación

### Tiempo real
- Activar Realtime en `order_items`, `orders`, `waiter_calls` y `table_sessions`.
- Suscribirse con filtros: cliente a su sesión, cocina a ítems activos, garzón a platos
  listos y llamados.
- Realtime respeta RLS: si un rol no puede leer una fila, no recibe su cambio.
- Al reconectar, recargar el estado actual; los cambios ocurridos sin conexión no se reenvían.
- Cargar los datos *después* de que el canal quede `SUBSCRIBED`: en las pruebas, cambios
  hechos justo al suscribirse se perdieron.

### Auth
- El registro por correo queda habilitado en Supabase porque el inicio anónimo lo
  necesita. No es un riesgo: una cuenta sin fila en `profiles` no tiene permisos de personal.

- `useLiveData` (`src/lib/use-live-data.ts`) aplica estas reglas: se suscribe, carga al quedar
  `SUBSCRIBED`, recarga ante cualquier cambio y al reconectar, y expone `live` para el aviso
  "Sin conexión · reconectando…" (`null` mientras conecta por primera vez: muestra "Conectando…").
- `OfflineBanner` (layout raíz) avisa en todas las vistas cuando el dispositivo pierde internet.
- La vista del cliente comprueba cada 30 s (y al volver a la pestaña) que su sesión siga abierta:
  al cerrarse la mesa, RLS deja de mostrarla y Realtime no avisa. Al detectarlo lo lleva a `/gracias`.

### Panel de administrador
- Crear usuarios requiere la API de administración de Supabase: se usa `SUPABASE_SECRET_KEY`
  solo en el servidor (Server Actions), nunca con prefijo `NEXT_PUBLIC_`.
- Campos del Figma que no están en el esquema y quedan fuera del MVP: alérgenos del plato,
  "sugerir junto a este plato", nombre visible y descripción interna de la mesa, y apellido
  del usuario (`profiles.name` guarda el nombre completo). "Destacar en la carta" usa `dishes.featured`.
- Códigos QR generados en el navegador con la librería `qrcode`.
- Al cambiar la foto de un plato se borra la anterior de Storage (política SELECT de admin).
- Un adicional que ya se pidió no se borra (lo referencia `order_item_extras`): se retira con
  `dish_extras.active = false`. La carta no lo ofrece y `place_order` lo rechaza.

### Particularidades de la web
- Los navegadores bloquean el sonido hasta la primera interacción: botón "Comenzar turno"
  en garzón y cocina para activar las alertas.
- Mantener la pantalla encendida en cocina y garzón (Screen Wake Lock API).
- Sin notificaciones con el celular bloqueado en el MVP; queda para una versión PWA.

## Pendientes
- [ ] Confirmar el stack entre ambos.
- [ ] Definir el hosting: Vercel o VPS.
- [ ] Crear las variables de diseño (colores, tipografía, espaciado) en Figma.
