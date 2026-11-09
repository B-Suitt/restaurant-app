import { clp, DESKTOP, expect, guestClient, inputValues, KITCHEN, must, openStaffPage, service, signIn, staffClient, test } from "./fixtures";

const itemStatus = (id: string) => async () => must(await service.from("order_items").select("status").eq("id", id).single()).status;
const NOT_FOUND = /No encontramos/;

test("un pedido recorre todas las pantallas", async ({ stage }) => {
  const { table, tableLabel } = stage;
  const dishes = must(await service.from("dishes").select("id, name, price").eq("available", true).order("name"));
  const [dishA, dishB, dishC, dishD] = dishes;
  const accented = dishes.find((d) => /[áéíóúñ]/i.test(d.name)) ?? dishD;
  const plainName = accented.name.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

  // Login: una clave mala muestra el error y la correcta entra.
  const waiterPage = await stage.newPage("garzón");
  await waiterPage.goto("/login");
  await waiterPage.waitForLoadState("networkidle");
  await waiterPage.locator('input[type="email"]').fill("garzon@restaurante.cl");
  await waiterPage.locator('input[type="password"]').fill("clave-incorrecta");
  await waiterPage.locator('form button[type="submit"]').click();
  await expect(waiterPage.locator('form [role="alert"]')).toContainText("incorrectos");
  await signIn(waiterPage, "garzon", "/garzon");

  // El cliente pide desde su celular.
  const client = await stage.newPage("cliente");
  const clientBody = client.locator("body");
  await client.goto(`/m/${table.qr_token}?scan=1`);
  await expect.poll(stage.openSessions).toHaveLength(1);
  const [{ id: sessionId }] = await stage.openSessions();
  await expect(clientBody).toContainText(/Mesa|carta|menú/i);
  await client.goto(`/m/${table.qr_token}/plato/${dishA.id}`);
  await client.getByRole("button", { name: /Agregar al carrito/ }).click();
  await client.waitForTimeout(800);
  await client.goto(`/m/${table.qr_token}/carrito`);
  await expect(clientBody).toContainText(dishA.name);
  await expect(clientBody).toContainText(clp(dishA.price));
  await client.getByRole("button", { name: /Enviar pedido/ }).click();
  await expect(clientBody).toContainText(/Pedido #\d+/);
  await expect(clientBody).toContainText("Esperando al garzón");
  await client.waitForTimeout(1500); // la suscripción en vivo tarda un momento en activarse
  const first = must(await service.from("order_items").select("id, orders!inner(session_id)").eq("orders.session_id", sessionId).single());

  // Un segundo celular suma platos y se cancelan algunos.
  const guest = await guestClient(table.qr_token);
  must(
    await guest.supabase.rpc("place_order", {
      p_session_id: sessionId,
      p_items: [
        { dish_id: dishB.id, quantity: 2, note: "nota de prueba", extra_ids: [] },
        { dish_id: dishC.id, quantity: 1, note: "", extra_ids: [] },
      ],
    }),
  );
  const items = must(await service.from("order_items").select("id, dish_id, orders!inner(session_id)").eq("orders.session_id", sessionId));
  const itemOf = (dish: { id: string }) => items.find((i) => i.dish_id === dish.id)!.id;
  await expect(clientBody).toContainText(dishB.name);
  await client.locator("li", { hasText: dishA.name }).getByRole("button", { name: "Cancelar" }).click();
  await expect.poll(itemStatus(first.id)).toBe("cancelado");
  await expect(clientBody).toContainText("Pedido cancelado");

  // Cocina no ve nada hasta que el garzón confirma la mesa.
  const kitchen = await stage.newPage("cocina", KITCHEN);
  await signIn(kitchen, "cocina", "/cocina");
  const board = kitchen.locator("main");
  await expect(board).toContainText("Recibido");
  await expect(board).not.toContainText(tableLabel);

  const avisos = await stage.newPage("garzón avisos");
  await signIn(avisos, "garzon", "/garzon/avisos");
  await expect(avisos.locator("body")).toContainText("Mesa por confirmar");
  await openStaffPage(waiterPage, "/garzon");
  await expect(waiterPage.locator(`a[href="/garzon/mesas/${table.id}"]`)).toContainText("Por confirmar");

  const waiterBody = waiterPage.locator("body");
  await openStaffPage(waiterPage, `/garzon/mesas/${table.id}`);
  await waiterPage.getByRole("button", { name: "Confirmar mesa" }).click();
  await expect(board).toContainText(tableLabel);
  await expect(clientBody).not.toContainText("Esperando al garzón");
  await expect(avisos.locator("body")).not.toContainText("Mesa por confirmar");

  // El garzón ve el detalle y cancela un plato.
  await expect(waiterBody).toContainText(dishB.name);
  await expect(waiterBody).toContainText(`${clp(dishB.price)} c/u`);
  await expect(waiterBody).toContainText("nota de prueba");
  await waiterPage.locator("li", { hasText: dishC.name }).getByRole("button", { name: "Cancelar" }).click();
  await expect.poll(itemStatus(itemOf(dishC))).toBe("cancelado");
  const consumption = dishB.price * 2;
  await expect(waiterBody).toContainText(new RegExp(`Consumo actual.*\\${clp(consumption)}`));

  // Pedido asistido, con búsqueda que ignora tildes y mayúsculas.
  await openStaffPage(waiterPage, `/garzon/mesas/${table.id}/agregar`);
  const search = waiterPage.getByPlaceholder("Buscar plato o ingrediente");
  await search.fill(plainName);
  await expect(waiterBody).toContainText(accented.name);
  await search.fill("zzzz-nada");
  await expect(waiterBody).not.toContainText(accented.name);
  await search.fill(dishD.name);
  await expect(waiterBody).toContainText(dishD.name);
  await waiterPage.getByRole("button", { name: "Agregar uno" }).first().click();
  await expect(waiterBody).toContainText("Total a agregar");
  await waiterPage.getByRole("button", { name: /Enviar a cocina/ }).click();
  await expect
    .poll(async () => must(await service.from("order_items").select("id, orders!inner(session_id)").eq("dish_id", dishD.id).eq("orders.session_id", sessionId)).length)
    .toBeGreaterThan(0);

  // Cocina avanza el plato.
  const cardOf = (name: string) => board.locator("div:has(> button)", { hasText: name }).filter({ hasText: tableLabel });
  await cardOf(dishB.name).getByRole("button", { name: /Comenzar preparación/ }).click();
  await expect.poll(itemStatus(itemOf(dishB))).toBe("en_preparacion");
  await cardOf(dishB.name).getByRole("button", { name: /Marcar listo/ }).click();
  await expect.poll(itemStatus(itemOf(dishB))).toBe("listo_para_entregar");

  // Despachos y avisos en vivo.
  await openStaffPage(waiterPage, "/garzon/despachos");
  await expect(waiterBody).toContainText(dishB.name);
  await expect(avisos.locator("body")).toContainText("Plato listo para entregar");
  const callId = must(await guest.supabase.rpc("call_waiter", { p_session_id: sessionId, p_type: "call" }));
  await expect(avisos.locator("body")).toContainText("El cliente te llama");
  await avisos.getByRole("button", { name: "Atender llamado" }).click();
  await expect.poll(async () => must(await service.from("waiter_calls").select("attended_at").eq("id", callId).single()).attended_at).not.toBeNull();
  await waiterPage.locator("div:has(> button)", { hasText: dishB.name }).getByRole("button", { name: /Marcar como entregado/ }).click();
  await expect.poll(itemStatus(itemOf(dishB))).toBe("entregado");

  // La cuenta suma lo no cancelado y sugiere una propina del 10%.
  const billId = must(await guest.supabase.rpc("call_waiter", { p_session_id: sessionId, p_type: "bill" }));
  await openStaffPage(waiterPage, `/garzon/mesas/${table.id}`);
  await expect(waiterBody).toContainText("Solicitan la cuenta");
  await waiterPage.getByRole("button", { name: "Cuenta entregada" }).click();
  await expect.poll(async () => must(await service.from("waiter_calls").select("attended_at").eq("id", billId).single()).attended_at).not.toBeNull();
  const bill = consumption + dishD.price;
  const tip = Math.round(bill * 0.1);
  await client.goto(`/m/${table.qr_token}/cuenta`);
  await expect(clientBody).toContainText(clp(bill));
  await expect(clientBody).toContainText(/Propina sugerida \(10%, voluntaria\)/);
  await expect(clientBody).toContainText(clp(tip));
  await expect(clientBody).toContainText(clp(bill + tip));

  // Tras abrir la página directamente, cocina y cliente siguen recibiendo en vivo.
  await client.goto(`/m/${table.qr_token}/pedido`);
  await expect(clientBody).toContainText(/Pedido #\d+/);
  await client.waitForTimeout(1500);
  const orderCount = ((await clientBody.innerText()).match(/Pedido #\d+/g) ?? []).length;
  must(
    await guest.supabase.rpc("place_order", {
      p_session_id: sessionId,
      p_items: [
        { dish_id: dishB.id, quantity: 1, note: "", extra_ids: [] },
        { dish_id: dishC.id, quantity: 1, note: "", extra_ids: [] },
      ],
    }),
  );
  const [last] = must(await service.from("orders").select("id, number").eq("session_id", sessionId).order("number", { ascending: false }).limit(1));
  await expect(board).toContainText(`#${last.number}`);
  await expect.poll(async () => ((await clientBody.innerText()).match(/Pedido #\d+/g) ?? []).length).toBeGreaterThan(orderCount);

  // Cerrar con platos pendientes los quita de cocina y despachos sin recargar.
  const cook = await staffClient("cocina");
  const readyItem = must(await service.from("order_items").select("id").eq("order_id", last.id).eq("dish_id", dishB.id).single()).id;
  must(await cook.rpc("set_item_status", { p_item_id: readyItem, p_status: "en_preparacion" }));
  must(await cook.rpc("set_item_status", { p_item_id: readyItem, p_status: "listo_para_entregar" }));
  await openStaffPage(avisos, "/garzon/despachos");
  await expect(avisos.locator("body")).toContainText(tableLabel);
  await openStaffPage(waiterPage, `/garzon/mesas/${table.id}`);
  await waiterPage.getByRole("button", { name: "Cerrar mesa" }).click();
  await expect(waiterBody).toContainText("Consumo registrado");
  await expect(waiterBody).toContainText(/Quedan \d+ platos? sin entregar/);
  await waiterPage.getByRole("switch", { name: "Se fue sin pagar" }).click();
  await waiterPage.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(board).not.toContainText(tableLabel);
  await expect(avisos.locator("body")).not.toContainText(tableLabel);
  await client.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(client).toHaveURL(/\/gracias$/);
  expect(must(await service.from("table_sessions").select("unpaid").eq("id", sessionId).single()).unpaid).toBe(true);

  // Administrador.
  const admin = await stage.newPage("admin", DESKTOP);
  const adminBody = admin.locator("body");
  await signIn(admin, "admin", "/admin");
  await expect(adminBody).toContainText(/\d+ \/ \d+/);
  if (Number((await adminBody.innerText()).match(/(\d+) \/ \d+/)?.[1]) === 0) {
    await expect(adminBody).toContainText("Cuando una mesa haga su primer pedido o llame al garzón");
  }

  const extra = must(await service.from("dish_extras").insert({ dish_id: dishA.id, name: "PruebaGratis", price: 0 }).select().single());
  stage.onCleanup(() => service.from("dish_extras").delete().eq("id", extra.id));
  await admin.goto("/admin/menu");
  await expect(adminBody).toContainText("PruebaGratis");
  await expect(adminBody).not.toContainText(/\+\s*\$0(?!\d|\.)/);
  await admin.getByPlaceholder("Nombre o ingrediente").fill(plainName);
  await expect(adminBody).toContainText(accented.name);

  const missing = "00000000-0000-4000-8000-000000000000";
  await admin.goto(`/admin/menu/${dishA.id}`);
  await expect.poll(() => inputValues(admin)).toContain(dishA.name);
  await admin.getByRole("button", { name: /Guardar/ }).click();
  await expect(admin).toHaveURL(/\/admin\/menu$/);
  await admin.goto(`/admin/menu/${missing}`);
  await expect(adminBody).toContainText(NOT_FOUND);
  await admin.goto("/admin/menu/no-es-uuid");
  await expect(adminBody).toContainText(NOT_FOUND);
  await expect(adminBody).not.toContainText("Revisa tu conexión");
  await admin.route("**/rest/v1/dishes*", (route) => route.abort());
  await admin.goto(`/admin/menu/${dishA.id}`);
  await expect(adminBody).toContainText("No pudimos cargar el plato");
  await admin.unroute("**/rest/v1/dishes*");

  await admin.goto(`/admin/mesas/${table.id}`);
  await admin.getByRole("button", { name: /Guardar/ }).click();
  await expect(admin).toHaveURL(/\/admin\/mesas$/);
  await admin.goto(`/admin/mesas/${table.id}/qr`);
  await expect(admin.locator('main img[alt^="Código QR"]')).toBeVisible();

  await admin.goto("/admin/usuarios");
  await expect(adminBody).toContainText("garzon@restaurante.cl");
  await admin.getByPlaceholder("Nombre o correo").fill("COCINA@");
  await expect(adminBody).not.toContainText("garzon@restaurante.cl");
  await expect(adminBody).toContainText("cocina@restaurante.cl");
  const garzon = must(await service.from("profiles").select("id, name").eq("email", "garzon@restaurante.cl").single());
  await admin.goto(`/admin/usuarios/${garzon.id}`);
  await expect.poll(() => inputValues(admin)).toContain(garzon.name);
  await admin.getByRole("button", { name: /Guardar/ }).click();
  await expect(admin).toHaveURL(/\/admin\/usuarios$/);
  await admin.goto(`/admin/usuarios/${missing}`);
  await expect(adminBody).toContainText(NOT_FOUND);
  await admin.goto("/admin/usuarios/no-es-uuid");
  await expect(adminBody).toContainText(NOT_FOUND);
  await expect(adminBody).not.toContainText("Revisa tu conexión");
  await admin.route("**/rest/v1/profiles*", (route) => route.abort());
  await admin.goto(`/admin/usuarios/${garzon.id}`);
  await expect(adminBody).toContainText("No pudimos cargar el usuario");
  await admin.unroute("**/rest/v1/profiles*");

  // Si fallan las fechas, que son informativas, el usuario se puede editar igual.
  const page = `**/admin/usuarios/${garzon.id}`;
  await admin.route(page, (route) => (route.request().headers()["next-action"] ? route.abort() : route.fallback()));
  await admin.goto(`/admin/usuarios/${garzon.id}`);
  await expect.poll(() => inputValues(admin)).toContain(garzon.name);
  await expect(adminBody).not.toContainText("No pudimos cargar el usuario");
  await admin.unroute(page);

  await admin.goto("/admin/categorias");
  await expect(adminBody).toContainText("Agregar categoría");
  const [order] = must(await service.from("orders").select("id, number").eq("session_id", sessionId).order("number").limit(1));
  await admin.goto("/admin/historial");
  await expect(adminBody).toContainText(`#${order.number}`);
  await expect(adminBody).toContainText("Sin pagar");
  await admin.goto(`/admin/historial/${order.id}`);
  await expect(adminBody).toContainText("Recibido");
  await expect(adminBody).toContainText("Se fue sin pagar");

  // Ninguna ruta se cae.
  for (const path of ["/admin", "/admin/mesas", "/admin/mesas/nueva", "/admin/menu", "/admin/menu/nuevo", "/admin/usuarios", "/admin/usuarios/nuevo", "/admin/categorias", "/admin/historial"]) {
    await admin.goto(path);
    await expect(adminBody, path).not.toContainText(/Application error|could not be found/);
  }
  for (const path of ["/garzon", "/garzon/avisos", "/garzon/despachos"]) {
    await openStaffPage(waiterPage, path);
    await expect(waiterBody, path).not.toContainText(/Application error|could not be found/);
  }
  const removed = await admin.goto("/dev/componentes");
  expect(removed?.status()).toBe(404);
});
