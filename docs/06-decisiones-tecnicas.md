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

### Particularidades de la web
- Los navegadores bloquean el sonido hasta la primera interacción: botón "Comenzar turno"
  en garzón y cocina para activar las alertas.
- Mantener la pantalla encendida en cocina y garzón (Screen Wake Lock API).
- Sin notificaciones con el celular bloqueado en el MVP; queda para una versión PWA.

## Pendientes
- [ ] Confirmar el stack entre ambos.
- [ ] Definir el hosting: Vercel o VPS.
- [ ] Crear las variables de diseño (colores, tipografía, espaciado) en Figma.
