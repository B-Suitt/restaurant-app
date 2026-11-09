import { DESKTOP, expect, guestClient, KITCHEN, must, signIn, staffClient, test } from "./fixtures";

test("la campana del admin sigue en vivo al navegar sin recargar", async ({ stage }) => {
  const admin = await stage.newPage("admin", DESKTOP);
  const body = admin.locator("body");
  // Next conserva ocultas las páginas ya visitadas: solo cuenta la campana visible.
  const bell = admin.locator('a[aria-label*="atención"], a[aria-label*="pendientes"]').filter({ visible: true });
  await signIn(admin, "admin", "/admin/menu");
  await expect(body).toContainText("Crear plato");
  await admin.locator('a[href="/admin/usuarios"]').filter({ visible: true }).first().click();
  await expect(admin.getByText("Crear usuario").filter({ visible: true })).toBeVisible();
  await admin.locator('a[href="/admin/categorias"]').filter({ visible: true }).first().click();
  await expect(admin.getByText("Agregar categoría").filter({ visible: true })).toBeVisible();
  await admin.waitForTimeout(1500);

  const guest = await guestClient(stage.table.qr_token);
  must(await guest.supabase.rpc("call_waiter", { p_session_id: guest.sessionId, p_type: "call" }));
  await expect(bell).toHaveAttribute("aria-label", /1 mesa espera/);

  await admin.locator('a[href="/admin/menu"]').filter({ visible: true }).first().click();
  await expect(admin.getByText("Crear plato").filter({ visible: true })).toBeVisible();
  await expect(bell).toHaveAttribute("aria-label", /1 mesa espera/);

  const waiter = await staffClient("garzon");
  must(await waiter.rpc("close_session", { p_session_id: guest.sessionId }));
  await expect(bell).toHaveAttribute("aria-label", /Sin solicitudes/);
});

test("sin tiempo real las pantallas igual muestran datos", async ({ stage }) => {
  const waiter = await stage.newPage("garzón");
  await waiter.routeWebSocket(/\/realtime\//, (socket) => socket.close());
  await signIn(waiter, "garzon", "/garzon/despachos");
  await expect(waiter.locator("body")).toContainText("Nada por despachar", { timeout: 30_000 });
  await expect(waiter.locator("body")).toContainText("Sin conexión");

  const kitchen = await stage.newPage("cocina", KITCHEN);
  await kitchen.routeWebSocket(/\/realtime\//, (socket) => socket.close());
  await signIn(kitchen, "cocina", "/cocina");
  await expect(kitchen.locator("main")).toContainText("Sin pedidos por ahora", { timeout: 30_000 });
});
