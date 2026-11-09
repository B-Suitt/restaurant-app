# 04 - Flujo de estados

## Estado de cada plato (order_items.status)

El estado es por plato, no por pedido completo: dos platos de la misma ronda pueden
avanzar a distinto ritmo.

```
recibido ──> en_preparacion ──> listo_para_entregar ──> entregado
    │
    └──> cancelado
```

| Estado (valor) | Etiqueta en pantalla | Quién lo cambia | Desde |
|---|---|---|---|
| `recibido` | Recibido | Sistema, al enviar el pedido | — |
| `en_preparacion` | En preparación | Cocina | `recibido` |
| `listo_para_entregar` | Listo para entregar | Cocina | `en_preparacion` |
| `entregado` | Entregado | Garzón | `listo_para_entregar` |
| `cancelado` | Cancelado | Cliente o garzón | Solo `recibido` |

Reglas:
- No se puede saltar ni retroceder estados.
- Cada cambio crea una fila en `order_item_events` con fecha, hora y usuario.
- Cada estado tiene el mismo color en todas las vistas, según el Figma.

Tiempos que se pueden medir con los eventos:
- Espera en cocina: `recibido` → `en_preparacion`.
- Preparación: `en_preparacion` → `listo_para_entregar`.
- Despacho: `listo_para_entregar` → `entregado`.
- Total: `recibido` → `entregado`.

## Estado de la mesa (vista del garzón)

Se calcula a partir de la sesión y los llamados; no se guarda como columna.

| Estado | Condición |
|---|---|
| Libre | Sin sesión abierta, o sesión sin pedidos ni llamados pendientes |
| Ocupada | Sesión abierta con al menos un pedido, sin llamados pendientes |
| Llamando | Llamado `call` pendiente |
| Pidiendo la cuenta | Llamado `bill` pendiente |

## Sesión de la mesa (table_sessions.status)

```
(sin sesión) ──primer escaneo──> open ──garzón cierra la mesa──> closed
```

- Al cerrar, la mesa vuelve a estar libre y el próximo escaneo abre una sesión nueva.
- Un QR de una sesión cerrada no da acceso a la cuenta anterior.

## Llamados al garzón (waiter_calls)

```
pendiente (attended_at nulo) ──garzón lo atiende──> atendido
```
