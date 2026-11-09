import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const client = (key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!) =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });

/** Acceso total a la base, solo para preparar y limpiar datos de prueba. */
export const service = client(process.env.SUPABASE_SECRET_KEY!);

export const DESKTOP = { width: 1440, height: 900 };
export const KITCHEN = { width: 1280, height: 800 };
export const PHONE = { width: 390, height: 844 };

type Staff = "admin" | "garzon" | "cocina";
const PASSWORD = "restaurante123";

export function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<T>;
}

export const clp = (amount: number) => `$${amount.toLocaleString("es-CL")}`;

export async function staffClient(role: Staff) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({ email: `${role}@restaurante.cl`, password: PASSWORD });
  if (error) throw error;
  return supabase;
}

export async function guestClient(qrToken: string) {
  const supabase = client();
  must(await supabase.auth.signInAnonymously());
  const sessionId = must(await supabase.rpc("join_table", { p_qr_token: qrToken }));
  return { supabase, sessionId };
}

/** Garzón y cocina muestran "Comenzar turno" cada vez que la página se abre o se recarga. */
export async function openStaffPage(page: Page, path: string) {
  await page.goto(path);
  if (path.startsWith("/garzon") || path.startsWith("/cocina")) {
    await page.getByRole("button", { name: "Comenzar turno" }).click();
  }
}

export async function signIn(page: Page, role: Staff, path: string, password = PASSWORD) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(`${role}@restaurante.cl`);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await openStaffPage(page, path);
}

export const inputValues = (page: Page) =>
  page.locator("input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));

// Errores de red que las pruebas provocan a propósito.
const EXPECTED_NOISE = /400|404|Failed to load resource|Failed to fetch|WebSocket|net::ERR/;

type Stage = {
  table: { id: string; number: number; qr_token: string };
  /** Texto de la mesa en pantalla, por ejemplo "Mesa 08". */
  tableLabel: string;
  newPage: (name: string, viewport?: { width: number; height: number }) => Promise<Page>;
  openSessions: () => Promise<{ id: string }[]>;
  onCleanup: (fn: () => PromiseLike<unknown>) => void;
};

/** Reserva una mesa libre, abre navegadores aislados y deja la base como estaba. */
export const test = base.extend<{ stage: Stage }>({
  stage: async ({ browser, baseURL }, provide) => {
    const tables = must(
      await service
        .from("tables")
        .select("id, number, qr_token")
        .eq("active", true)
        .like("qr_token", "mesa-%")
        .order("number", { ascending: false }),
    );
    const open = must(await service.from("table_sessions").select("table_id").eq("status", "open"));
    const table = tables.find((t) => !open.some((s) => s.table_id === t.id));
    if (!table) throw new Error("No hay una mesa libre para la prueba");
    const previous = new Set(must(await service.from("table_sessions").select("id").eq("table_id", table.id)).map((s) => s.id));

    const contexts: BrowserContext[] = [];
    const cleanups: (() => PromiseLike<unknown>)[] = [];
    const problems: string[] = [];

    await provide({
      table,
      tableLabel: `Mesa ${String(table.number).padStart(2, "0")}`,
      newPage: async (name, viewport = PHONE) => {
        const context = await browser.newContext({ baseURL, viewport });
        contexts.push(context);
        const page = await context.newPage();
        page.on("dialog", (dialog) => dialog.accept());
        page.on("pageerror", (error) => problems.push(`${name}: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() === "error" && !EXPECTED_NOISE.test(message.text())) problems.push(`${name}: ${message.text()}`);
        });
        return page;
      },
      openSessions: async () => must(await service.from("table_sessions").select("id").eq("table_id", table.id).eq("status", "open")),
      onCleanup: (fn) => cleanups.push(fn),
    });

    await Promise.all(contexts.map((context) => context.close()));
    for (const cleanup of cleanups) await cleanup();

    const created = must(await service.from("table_sessions").select("id").eq("table_id", table.id))
      .map((s) => s.id)
      .filter((id) => !previous.has(id));
    const items = must(await service.from("order_items").select("id, orders!inner(session_id)").in("orders.session_id", created)).map((i) => i.id);
    must(await service.from("order_item_events").delete().in("order_item_id", items));
    must(await service.from("order_item_extras").delete().in("order_item_id", items));
    must(await service.from("order_items").delete().in("id", items));
    must(await service.from("orders").delete().in("session_id", created));
    must(await service.from("waiter_calls").delete().in("session_id", created));
    must(await service.from("session_guests").delete().in("session_id", created));
    must(await service.from("table_sessions").delete().in("id", created));

    expect(problems, "errores en la consola del navegador").toEqual([]);
  },
});

export { expect };
