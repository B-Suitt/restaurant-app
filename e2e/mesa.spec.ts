import { DESKTOP, expect, guestClient, must, openStaffPage, service, signIn, staffClient, test } from "./fixtures";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });

test("ciclo completo de una mesa: escaneo, llamado, pedido, cierre y recarga", async ({ stage }) => {
  const { table } = stage;
  const client = await stage.newPage("cliente");
  const waiterPage = await stage.newPage("garzón");
  const admin = await stage.newPage("admin", DESKTOP);
  const waiter = await staffClient("garzon");
  await signIn(waiterPage, "garzon", "/garzon");
  await signIn(admin, "admin", "/admin");

  const tile = waiterPage.locator(`a[href="/garzon/mesas/${table.id}"]`);
  const clientBody = client.locator("body");
  const waiterBody = waiterPage.locator("body");
  const adminBody = admin.locator("body");
  const occupied = async () => {
    await expect(adminBody).toContainText(/\d+ \/ \d+/);
    return Number((await adminBody.innerText()).match(/(\d+) \/ \d+/)?.[1]);
  };
  const baseOccupied = await occupied();

  // Escanear crea la sesión, pero la mesa sigue libre.
  await client.goto(`/m/${table.qr_token}?scan=1`);
  await expect.poll(stage.openSessions).toHaveLength(1);
  await expect(client).toHaveURL((url) => !url.search.includes("scan"));
  await expect(clientBody).toContainText(/Mesa|carta|menú/i);
  const [first] = await stage.openSessions();
  await expect(tile).toContainText("Libre");
  await openStaffPage(waiterPage, `/garzon/mesas/${table.id}`);
  await expect(waiterBody).toContainText("Mesa libre");
  await expect(waiterBody).not.toContainText("Cerrar mesa");
  await expect(waiterBody).toContainText("Tomar pedido");
  await admin.goto("/admin");
  expect(await occupied()).toBe(baseOccupied);
  await admin.goto(`/admin/mesas/${table.id}`);
  await expect(adminBody).toContainText(/El estado operativo/);
  await expect(adminBody).not.toContainText("tiene una estadía abierta");

  // Recargar no cambia la sesión.
  await client.reload();
  await expect(clientBody).toContainText(/Mesa|carta|menú/i);
  await expect(clientBody).not.toContainText("Gracias por tu visita");
  expect((await stage.openSessions())[0].id).toBe(first.id);

  // Un llamado ocupa la mesa solo mientras esté pendiente.
  const guest = await guestClient(table.qr_token);
  expect(guest.sessionId).toBe(first.id);
  const callId = must(await guest.supabase.rpc("call_waiter", { p_session_id: first.id, p_type: "call" }));
  await openStaffPage(waiterPage, "/garzon");
  await expect(tile).toContainText("Llamando");
  await openStaffPage(waiterPage, `/garzon/mesas/${table.id}`);
  await expect(waiterBody).toContainText("Aún no hay pedidos");
  must(await waiter.rpc("attend_call", { p_call_id: callId }));
  await openStaffPage(waiterPage, "/garzon");
  await expect(tile).toContainText("Libre");

  // El primer pedido deja la mesa por confirmar; al confirmarla pasa a ocupada en vivo.
  const stale = new Date(Date.now() - 3 * 3600e3).toISOString();
  must(await service.from("table_sessions").update({ opened_at: stale }).eq("id", first.id).select());
  const [dish] = must(await guest.supabase.from("dishes").select("id").eq("available", true).limit(1));
  must(await guest.supabase.rpc("place_order", { p_session_id: first.id, p_items: [{ dish_id: dish.id, quantity: 1, note: "", extra_ids: [] }] }));
  await expect(tile).toContainText("Por confirmar");
  must(await waiter.rpc("confirm_session", { p_session_id: first.id }));
  await expect(tile).toContainText("Ocupada");

  // La hora visible es la del primer pedido, no la de una sesión antigua.
  const orderAt = must(await service.from("orders").select("created_at").eq("session_id", first.id).single()).created_at;
  await openStaffPage(waiterPage, `/garzon/mesas/${table.id}`);
  await expect(waiterBody).toContainText(`Abierta a las ${hhmm(orderAt)}`);
  await client.goto(`/m/${table.qr_token}/cuenta`);
  await expect(clientBody).toContainText(`Hoy · ${hhmm(orderAt)}`);
  await admin.goto("/admin");
  expect(await occupied()).toBe(baseOccupied + 1);
  await admin.goto(`/admin/mesas/${table.id}`);
  await expect(adminBody).toContainText("tiene una estadía abierta");

  // Al cerrar, el cliente va a /gracias y no puede reabrir la mesa sin escanear.
  await openStaffPage(waiterPage, "/garzon");
  await client.goto(`/m/${table.qr_token}/menu`);
  await client.locator('a[href$="/pedido"]').filter({ visible: true }).first().click();
  await expect(client).toHaveURL(/\/pedido$/);
  must(await waiter.rpc("close_session", { p_session_id: first.id }));
  await expect(tile).toContainText("Libre");
  await client.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(client).toHaveURL(/\/gracias$/);
  await expect(clientBody).toContainText("Gracias por tu visita");
  await expect(clientBody).not.toContainText(table.qr_token);
  await client.evaluate(() => history.back());
  await client.waitForTimeout(2000);
  await expect(client).toHaveURL(/\/gracias$/);
  await client.reload();
  await expect(client).toHaveURL(/\/gracias$/);
  await client.goto(`/m/${table.qr_token}`);
  await expect(client).toHaveURL(/\/gracias$/);
  expect(await stage.openSessions()).toHaveLength(0);

  // Un nuevo escaneo abre otra sesión, que el garzón reutiliza al tomar el pedido.
  await client.goto(`/m/${table.qr_token}?scan=1`);
  await expect.poll(stage.openSessions).toHaveLength(1);
  await expect(clientBody).not.toContainText("Gracias por tu visita");
  const [second] = await stage.openSessions();
  expect(second.id).not.toBe(first.id);
  await expect(tile).toContainText("Libre");
  expect(must(await waiter.rpc("open_table", { p_table_id: table.id }))).toBe(second.id);
  must(await waiter.rpc("close_session", { p_session_id: second.id }));

  // Un enlace sin marca y sin visita previa entra como siempre.
  const incognito = await stage.newPage("incógnito");
  await incognito.goto(`/m/${table.qr_token}`);
  await expect.poll(stage.openSessions).toHaveLength(1);
  await expect(incognito.locator("body")).toContainText(/Mesa|carta|menú/i);
  await expect(tile).toContainText("Libre");
});
