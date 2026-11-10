import { DESKTOP, expect, guestClient, must, openStaffPage, service, signIn, staffClient, test } from "./fixtures";

const firstDish = async () => must(await service.from("dishes").select("id").eq("available", true).limit(1).single()).id;

test("avisa cuando una mesa ocupada lleva 90 minutos sin actividad", async ({ stage }) => {
  const guest = await guestClient(stage.table.qr_token);
  must(await guest.supabase.rpc("place_order", { p_session_id: guest.sessionId, p_items: [{ dish_id: await firstDish(), quantity: 1, note: "", extra_ids: [] }] }));
  const waiter = await staffClient("garzon");
  must(await waiter.rpc("confirm_session", { p_session_id: guest.sessionId }));

  const page = await stage.newPage("garzón");
  await signIn(page, "garzon", "/garzon");
  const tile = page.locator(`a[href="/garzon/mesas/${stage.table.id}"]`);
  await expect(tile).toContainText("Ocupada");
  await expect(tile).not.toContainText("Sin actividad");

  must(await service.from("orders").update({ created_at: new Date(Date.now() - 2 * 3600e3).toISOString() }).eq("session_id", guest.sessionId).select());
  await page.reload();
  await page.getByRole("button", { name: "Comenzar turno" }).click();
  await expect(tile).toContainText("Sin actividad");
  await openStaffPage(page, "/garzon/avisos");
  await expect(page.locator("body")).toContainText("Mesa sin actividad");
  await expect(page.getByRole("link", { name: "Ir a la mesa" })).toHaveAttribute("href", `/garzon/mesas/${stage.table.id}`);
});

test("un formulario abierto antes del primer pedido no desactiva la mesa", async ({ stage }) => {
  const admin = await stage.newPage("admin", DESKTOP);
  await signIn(admin, "admin", `/admin/mesas/${stage.table.id}`);
  const active = admin.getByRole("switch");
  await expect(active).toBeEnabled();

  const guest = await guestClient(stage.table.qr_token);
  must(await guest.supabase.rpc("place_order", { p_session_id: guest.sessionId, p_items: [{ dish_id: await firstDish(), quantity: 1, note: "", extra_ids: [] }] }));

  await active.click();
  await admin.getByRole("button", { name: /Guardar/ }).click();
  await expect(admin.locator("body")).toContainText("La mesa tiene una estadía abierta");
  expect(must(await service.from("tables").select("active").eq("id", stage.table.id).single()).active).toBe(true);
});

test("el historial trae más de 1.000 pedidos", async ({ stage }) => {
  const guest = await guestClient(stage.table.qr_token);
  must(await service.from("orders").insert(Array.from({ length: 1100 }, () => ({ session_id: guest.sessionId }))).select("id"));

  const admin = await stage.newPage("admin", DESKTOP);
  await signIn(admin, "admin", "/admin/historial");
  await expect
    .poll(async () => Number((await admin.locator("body").innerText()).match(/([\d.]+) pedidos ·/)?.[1].replace(".", "") ?? 0), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(1100);
});

test("un fallo al cargar no se confunde con un registro inexistente", async ({ stage }) => {
  const admin = await stage.newPage("admin", DESKTOP);
  const body = admin.locator("body");
  await signIn(admin, "admin", "/admin");

  await admin.route("**/rest/v1/tables*", (route) => route.abort());
  for (const path of [`/admin/mesas/${stage.table.id}`, `/admin/mesas/${stage.table.id}/qr`, "/admin/mesas/nueva"]) {
    await admin.goto(path);
    await expect(body, path).toContainText("No pudimos cargar la mesa");
    await expect(body, path).not.toContainText("No encontramos");
  }
  await admin.unroute("**/rest/v1/tables*");

  await admin.route("**/rest/v1/orders*", (route) => route.abort());
  await admin.goto("/admin/historial/00000000-0000-4000-8000-000000000000");
  await expect(body).toContainText("No pudimos cargar el pedido");
  await admin.unroute("**/rest/v1/orders*");
  await admin.goto("/admin/historial/00000000-0000-4000-8000-000000000000");
  await expect(body).toContainText("No encontramos ese pedido");
});

test("el garzón confirma la mesa directo desde Avisos", async ({ stage }) => {
  const guest = await guestClient(stage.table.qr_token);
  must(await guest.supabase.rpc("place_order", { p_session_id: guest.sessionId, p_items: [{ dish_id: await firstDish(), quantity: 1, note: "", extra_ids: [] }] }));

  const page = await stage.newPage("garzón");
  await signIn(page, "garzon", "/garzon/avisos");
  await expect(page.locator("body")).toContainText("Mesa por confirmar");
  await page.getByRole("button", { name: "Confirmar mesa" }).click();
  await expect.poll(async () => must(await service.from("table_sessions").select("confirmed_at").eq("id", guest.sessionId).single()).confirmed_at).not.toBeNull();
  await expect(page.locator("body")).not.toContainText("Mesa por confirmar");
});

test("cada rol ve su propia pantalla de acceso", async ({ stage }) => {
  const phone = await stage.newPage("garzón");
  await phone.goto("/garzon");
  await expect(phone.getByRole("heading", { name: "Un gran servicio empieza contigo." })).toBeVisible();

  const kitchen = await stage.newPage("cocina", DESKTOP);
  await kitchen.goto("/cocina");
  await expect(kitchen.locator("main")).toContainText("Ingresa con la cuenta asignada a tu estación.");
  await expect(kitchen.locator("main")).toContainText("¿No puedes ingresar? Contacta al administrador.");

  const admin = await stage.newPage("admin", DESKTOP);
  await admin.goto("/admin");
  await expect(admin.getByRole("heading", { name: "Hola de nuevo." })).toBeVisible();
  expect((await admin.locator("aside").boundingBox())?.width).toBe(660);
});

test("el producto se llama AltiroQR", async ({ stage }) => {
  const page = await stage.newPage("visitante");
  await page.goto("/");
  await expect(page).toHaveTitle("AltiroQR");
  await expect(page.getByRole("heading", { name: "AltiroQR" })).toBeVisible();
});
