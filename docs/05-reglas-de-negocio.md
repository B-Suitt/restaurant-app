# 05 - Reglas de negocio

## Decisiones provisionales

Tomadas para poder avanzar; se pueden cambiar.

| # | Regla |
|---|---|
| 1 | El primer escaneo del QR abre la sesión de la mesa si no hay una abierta; los siguientes se unen a la misma. La mesa sigue libre hasta el primer pedido o llamado. |
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
| 16 | Al cerrarse la mesa, el cliente pasa a una página de agradecimiento (`/gracias`). Recargar o volver atrás no abre otra estadía; para volver a pedir hay que escanear el QR. |
| 17 | El primer pedido de una estadía espera a que el garzón confirme que hay clientes en la mesa; después, los pedidos llegan directo a cocina. Un pedido ingresado por el garzón confirma la mesa. |
| 18 | En una estadía sin pedidos, los celulares que entraron hace más de 2 horas salen cuando alguien vuelve a escanear. |
| 19 | Un pedido admite hasta 50 líneas. |
| 20 | La cuenta muestra una propina sugerida del 10%, informativa y voluntaria. |
| 21 | Un plato enviado no se modifica: se cancela mientras está en Recibido y se pide de nuevo. |
| 22 | Al cerrar la mesa, el garzón puede marcar que el cliente se fue sin pagar; el admin lo ve en el historial. |
| 23 | Una mesa ocupada con 90 minutos sin pedidos ni llamados genera un aviso al garzón. |
| 24 | Un plato se considera atrasado a los 20 minutos desde que llega a cocina. |
