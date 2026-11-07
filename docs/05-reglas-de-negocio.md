# 05 - Reglas de negocio

## Decisiones provisionales

Tomadas para poder avanzar; se pueden cambiar.

| # | Regla |
|---|---|
| 1 | El primer escaneo del QR abre la sesión de la mesa si no hay una abierta; los siguientes se unen a la misma. |
| 2 | Todas las rondas de una sesión suman a una sola cuenta. |
| 3 | El estado es por plato, no por pedido completo. |
| 4 | Un plato solo se puede cancelar mientras está en Recibido. |
| 5 | El pago es fuera de la app; el garzón cierra la mesa al cobrar. |
| 6 | El garzón puede cerrar una mesa manualmente aunque el cliente no haya pedido la cuenta. |
| 7 | Un QR inválido o de una mesa inactiva muestra una pantalla de error. |
| 8 | Un plato no disponible se ve en gris y no se puede agregar al carrito. |
| 9 | Si un plato se agota con el pedido en el carrito, se avisa al cliente antes de enviar. |
| 10 | Los precios se fijan al momento de pedir; cambiar el menú no altera cuentas abiertas. |
| 11 | El garzón puede ingresar pedidos en nombre del cliente. |
| 12 | Un usuario desactivado no puede iniciar sesión, pero su historial se conserva. |
| 13 | Cerrar una mesa con platos sin entregar no se bloquea: el modal avisa cuántos quedan. Al cerrar, los llamados pendientes quedan atendidos. |
| 14 | Una mesa con historial no se elimina: se desactiva. Una mesa con una estadía abierta no se elimina ni se desactiva (sí se puede editar su número, zona o capacidad). |
| 15 | El historial de pedidos incluye los de mesas abiertas y cerradas. |

## Preguntas abiertas

- [ ] ¿Cómo evitamos pedidos desde fuera del local con una foto del QR? (código corto en la
      mesa, validación del garzón al abrir la mesa, o QR que cambia por sesión)
- [ ] ¿Se muestra propina sugerida en la cuenta? ¿Qué porcentaje?
- [ ] ¿Se puede modificar un plato ya enviado (cantidad, nota) o solo cancelarlo?
- [ ] ¿Qué pasa si el cliente se va sin pagar? ¿Se marca de alguna forma al cerrar?
- [ ] ¿Cuánto tiempo sin actividad antes de avisar que una mesa sigue abierta?
- [ ] ¿Desde cuántos minutos un pedido se considera atrasado en cocina?
