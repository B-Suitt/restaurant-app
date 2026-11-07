"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Armchair, ArrowRight, ChartNoAxesCombined, ClipboardList, Timer, TriangleAlert } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatPrice } from "@/lib/format-price";
import { statusTime, tableLabel } from "@/lib/order-format";
import { ORDER_ITEM_STATUSES, type OrderItemStatus } from "@/lib/order-status";
import { KITCHEN_TARGET_MINUTES } from "@/lib/restaurant";
import { itemTotal, sessionTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { TABLE_STATUS_DISPLAY, tableStatus } from "@/lib/table-status";
import { formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { useNow } from "@/lib/use-now";

const FEED_SIZE = 5;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function loadDashboard() {
  const supabase = createClient();
  const since = startOfToday();
  const [tables, sessions, orders, calls] = await Promise.all([
    supabase.from("tables").select("id, number, zone").eq("active", true).order("number"),
    supabase
      .from("table_sessions")
      .select(
        "id, table_id, waiter_calls(type, attended_at), orders(order_items(quantity, unit_price, status, order_item_extras(price)))",
      )
      .eq("status", "open"),
    // Pedidos de hoy (el local no atiende pasada la medianoche).
    supabase
      .from("orders")
      .select(
        `id, number, created_at, table_sessions(tables(number)),
         order_items(quantity, unit_price, status, dishes(name), order_item_extras(price), order_item_events(status, changed_at))`,
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("waiter_calls")
      .select("id, type, created_at, table_sessions(tables(number, zone), orders(order_items(quantity, unit_price, status, order_item_extras(price))))")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(FEED_SIZE),
  ]);
  for (const r of [tables, sessions, orders, calls]) if (r.error) throw r.error;
  return { tables: tables.data!, sessions: sessions.data!, orders: orders.data!, calls: calls.data! };
}

type Data = Awaited<ReturnType<typeof loadDashboard>>;
type Order = Data["orders"][number];

/** Estado del pedido: el del plato menos avanzado (sin contar cancelados). */
function orderStatus(order: Order): OrderItemStatus {
  const items = order.order_items.filter((i) => i.status !== "cancelado");
  if (items.length === 0) return "cancelado";
  return items.reduce<OrderItemStatus>((least, i) => {
    const s = i.status as OrderItemStatus;
    return ORDER_ITEM_STATUSES.indexOf(s) < ORDER_ITEM_STATUSES.indexOf(least) ? s : least;
  }, "entregado");
}

function summarize(data: Data, now: number) {
  const occupied = data.sessions.length;
  const totalTables = data.tables.length;

  const byStatus: Record<OrderItemStatus, number> = {
    recibido: 0,
    en_preparacion: 0,
    listo_para_entregar: 0,
    entregado: 0,
    cancelado: 0,
  };
  for (const order of data.orders) byStatus[orderStatus(order)]++;
  const inProgress = byStatus.recibido + byStatus.en_preparacion + byStatus.listo_para_entregar;

  // Preparación: de Recibido a Listo para entregar, en los platos que llegaron a Listo hoy.
  const prepTimes = data.orders.flatMap((o) =>
    o.order_items.flatMap((i) => {
      const start = statusTime(i.order_item_events, "recibido");
      const ready = statusTime(i.order_item_events, "listo_para_entregar");
      return start && ready ? [new Date(ready).getTime() - new Date(start).getTime()] : [];
    }),
  );
  const avgPrep = prepTimes.length ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length / 60000) : null;

  const billable = data.orders.filter((o) => orderStatus(o) !== "cancelado");
  const revenue = data.orders.reduce(
    (sum, o) => sum + o.order_items.filter((i) => i.status !== "cancelado").reduce((s, i) => s + itemTotal(i), 0),
    0,
  );

  // Pedidos con platos sin terminar que superan el objetivo de cocina.
  const late = data.orders
    .filter((o) => o.order_items.some((i) => i.status === "recibido" || i.status === "en_preparacion"))
    .map((o) => ({ order: o, minutes: Math.floor((now - new Date(o.created_at).getTime()) / 60000) }))
    .filter((l) => now > 0 && l.minutes > KITCHEN_TARGET_MINUTES)
    .sort((a, b) => b.minutes - a.minutes);

  const tableById = new Map(data.tables.map((t) => [t.id, t]));
  const attention = data.sessions
    .map((s) => ({ session: s, table: tableById.get(s.table_id), status: tableStatus(s), total: sessionTotal(s.orders) }))
    .filter((r) => r.table)
    .sort(
      (a, b) =>
        Number(b.status !== "ocupada") - Number(a.status !== "ocupada") || a.table!.number - b.table!.number,
    );

  return { occupied, totalTables, byStatus, inProgress, avgPrep, billable: billable.length, revenue, late, attention };
}

type FeedEntry = { at: string; title: string; detail: string };

function buildFeed(data: Data): FeedEntry[] {
  const entries: FeedEntry[] = [];
  for (const o of data.orders) {
    const table = tableLabel(o.table_sessions.tables.number);
    const count = o.order_items.reduce((s, i) => s + i.quantity, 0);
    entries.push({
      at: o.created_at,
      title: `Nuevo pedido #${o.number}`,
      detail: `${table} · ${count} ${count === 1 ? "plato" : "platos"}`,
    });
    for (const i of o.order_items) {
      const ready = statusTime(i.order_item_events, "listo_para_entregar");
      if (ready) entries.push({ at: ready, title: `${i.dishes.name}: listo`, detail: `${table} · ${i.quantity} ${i.quantity === 1 ? "unidad" : "unidades"}` });
      const delivered = statusTime(i.order_item_events, "entregado");
      if (delivered) entries.push({ at: delivered, title: `${i.dishes.name}: entregado`, detail: `${table} · ${i.quantity} ${i.quantity === 1 ? "unidad" : "unidades"}` });
    }
  }
  for (const c of data.calls) {
    const t = c.table_sessions.tables;
    entries.push(
      c.type === "bill"
        ? { at: c.created_at, title: "Solicitud de cuenta", detail: `${tableLabel(t.number)} · ${formatPrice(sessionTotal(c.table_sessions.orders))}` }
        : { at: c.created_at, title: "Llamado al garzón", detail: `${tableLabel(t.number)} · ${t.zone}` },
    );
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, FEED_SIZE);
}

const today = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

// Frame "Administrador · Panel general"
export function AdminDashboard() {
  const now = useNow(30_000);
  const { data, live } = useLiveData(
    "admin-dashboard",
    ["table_sessions", "waiter_calls", "orders", "order_items"],
    loadDashboard,
  );
  const s = data ? summarize(data, now) : null;
  const feed = data ? buildFeed(data) : [];
  const dateText = now ? today.format(new Date(now)) : "";

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Panel general" }]} live={live} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title="El servicio, de un vistazo"
          subtitle={dateText && dateText.charAt(0).toUpperCase() + dateText.slice(1)}
        />

        {!s ? (
          <p className="py-10 text-center text-base text-muted">Cargando servicio…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Metric
                label="Mesas ocupadas"
                icon={<Armchair aria-hidden />}
                value={`${s.occupied} / ${s.totalTables}`}
                detail={`${s.totalTables - s.occupied} mesas libres · ${s.totalTables ? Math.round((s.occupied / s.totalTables) * 100) : 0}% de ocupación`}
              />
              <Metric
                label="Pedidos en curso"
                icon={<ClipboardList aria-hidden />}
                value={String(s.inProgress)}
                detail={`${s.byStatus.recibido} recibidos · ${s.byStatus.en_preparacion} en preparación · ${s.byStatus.listo_para_entregar} ${s.byStatus.listo_para_entregar === 1 ? "listo" : "listos"}`}
              />
              <Metric
                label="Preparación promedio"
                icon={<Timer aria-hidden />}
                value={s.avgPrep === null ? "—" : `${s.avgPrep} min`}
                detail={`Objetivo de servicio: ${KITCHEN_TARGET_MINUTES} min`}
              />
              <Metric
                label="Consumo registrado hoy"
                icon={<ChartNoAxesCombined aria-hidden />}
                value={formatPrice(s.revenue)}
                detail={`${s.billable} ${s.billable === 1 ? "pedido" : "pedidos"} · No representa cobros`}
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_395px]">
              <div className="flex flex-col gap-6">
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Pedidos por estado</h2>
                    <p className="text-sm text-muted">En tiempo real</p>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {(["recibido", "en_preparacion", "listo_para_entregar", "entregado"] as const).map((st) => (
                      <div key={st} className="flex flex-col gap-3">
                        <StatusChip status={st} />
                        <p className="text-[27px] leading-[1.2] tabular-nums">{s.byStatus[st]}</p>
                        <p className="text-xs text-muted">{st === "entregado" ? "Finalizados hoy" : "En curso"}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted">Pedidos con platos mixtos: se muestra el estado menos avanzado.</p>
                </Card>

                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Mesas y atención</h2>
                    <p className="text-sm text-muted">
                      {(() => {
                        const n = s.attention.filter((r) => r.status !== "ocupada").length;
                        return `${n} ${n === 1 ? "solicitud activa" : "solicitudes activas"}`;
                      })()}
                    </p>
                  </div>
                  {s.attention.length === 0 ? (
                    <Card className="py-8 text-center text-base text-muted">No hay mesas ocupadas en este momento.</Card>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Mesa</TableHeader>
                          <TableHeader>Estado</TableHeader>
                          <TableHeader>Consumo</TableHeader>
                          <TableHeader>Acción</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {s.attention.map(({ session, table, status, total }) => {
                          const display = TABLE_STATUS_DISPLAY[status];
                          return (
                            <TableRow key={session.id}>
                              <TableCell className="text-base">{tableLabel(table!.number)}</TableCell>
                              <TableCell>
                                <Chip tone={display.tone}>{display.label}</Chip>
                              </TableCell>
                              <TableCell className="text-base">{formatPrice(total)}</TableCell>
                              <TableCell>
                                <Link
                                  href={`/admin/mesas/${table!.id}`}
                                  className="inline-flex items-center gap-1 text-base text-primary hover:underline"
                                >
                                  {status === "pidiendo_cuenta" ? "Ver cuenta" : "Ver mesa"}
                                  <ArrowRight className="size-4" aria-hidden />
                                </Link>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </section>

                {s.late.map(({ order, minutes }) => (
                  <p
                    key={order.id}
                    role="alert"
                    className="flex items-center gap-2.5 rounded-lg bg-primary-soft px-6 py-4 text-base text-primary"
                  >
                    <TriangleAlert className="size-5 shrink-0" aria-hidden />
                    Pedido #{order.number} · {tableLabel(order.table_sessions.tables.number)} · {minutes} min en
                    preparación
                  </p>
                ))}
              </div>

              <Card className="flex flex-col gap-5 p-5">
                <h2 className="text-lg font-bold">Ahora en el local</h2>
                {feed.length === 0 ? (
                  <p className="text-sm text-muted">Aún no hay movimiento hoy.</p>
                ) : (
                  <ol className="flex flex-col gap-5">
                    {feed.map((entry, i) => (
                      <li key={i} className="flex gap-6">
                        <span className="w-9 shrink-0 text-sm text-muted tabular-nums">{formatClock(entry.at)}</span>
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="text-base">{entry.title}</p>
                          <p className="text-sm text-muted">{entry.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <Link href="/admin/historial" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Ver historial completo <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Card>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Metric({ label, icon, value, detail }: { label: string; icon: ReactNode; value: string; detail: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-md text-muted">{label}</p>
        <span className="text-ink [&_svg]:size-4.5">{icon}</span>
      </div>
      <p className="text-[34px] leading-[1.2] tabular-nums">{value}</p>
      <p className="text-xs text-muted">{detail}</p>
    </Card>
  );
}
