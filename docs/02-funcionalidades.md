# 02 - Funcionalidades del MVP

Funciones iniciales acordadas por el equipo, por rol. Sin pagos en línea.

## Cliente

1. Entrar por QR de mesa.
2. Ver menú.
3. Agregar notas al plato.
4. Carrito y enviar pedido.
5. Agregar adicionales al carrito.
6. Ver estado del pedido en tiempo real.
7. Ver su detalle de cuenta.
8. Llamar al garzón y pedir la cuenta.

## Garzón

1. Agregar platos o pedidos a una mesa.
2. Ver platos listos para despachar.
3. Recibir alertas de llamados de clientes y platos listos.
4. Ver mesas y estados de las mesas.
5. Cerrar mesa cuando se paga fuera de la web.

## Cocina

1. Ver pedidos entrantes.
2. Cambiar estados de los pedidos.
3. Alertas cuando lleguen nuevos platos.
4. Tiempo transcurrido por pedido.

## Administrador

1. Agregar, eliminar o modificar mesas.
2. Gestión del menú (platos, categorías, sugerencias).
3. Gestión de usuarios y roles.
4. Ver estado en tiempo real de mesas y pedidos.
5. Ver historial de pedidos.

## Transversales

- Sincronización en tiempo real entre los cuatro roles.
- Registro de fecha, hora y usuario en cada cambio de estado.
- Login para garzón, cocina y administrador, con acceso solo a su vista.
- Estados vacíos, mensajes de error y pantallas de carga.

## Fuera del MVP

- Pagos en línea y dividir la cuenta.
- Notificaciones push con el celular bloqueado (PWA).
- Filtros por alérgenos, menú en varios idiomas.
- Métricas avanzadas y reportes exportables.
- Multi-local.
