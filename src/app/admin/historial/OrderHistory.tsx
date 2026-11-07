"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { InfoNote } from "@/components/ui/InfoNote";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatPrice } from "@/lib/format-price";
import { tableLabel } from "@/lib/order-format";
import { ORDER_ITEM_STATUS_DISPLAY, ORDER_ITEM_STATUSES, orderStatusOf, type OrderItemStatus } from "@/lib/order-status";
import { itemTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { useNow } from "@/lib/use-now";

const PAGE_SIZE = 10;

type Filters = { from: string; to: string; tableId: string; status: OrderItemStatus | "" };

/** Fecha local como "2026-11-06" (valor de <input type="date">). */
function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadHistory({ from, to, tableId }: Filters) {
  const supabase = createClient();
  // Desde las 00:00 del primer día hasta las 00:00 del día siguiente al último (hora local).
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  let query = supabase
    .from("orders")
    .select(
      "id, number, created_at, table_sessions!inner(table_id, tables(number)), order_items(quantity, unit_price, status, order_item_extras(price))",
    )
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false });
  if (tableId) query = query.eq("table_sessions.table_id", tableId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((o) => ({
    id: o.id,
    number: o.number,
    createdAt: o.created_at,
    table: o.table_sessions.tables.number,
    status: orderStatusOf(o.order_items),
    total: o.order_items.filter((i) => i.status !== "cancelado").reduce((sum, i) => sum + itemTotal(i), 0),
  }));
}

// Frame "Administrador · Historial de pedidos"
export function OrderHistory() {
  // La fecha de hoy solo se conoce en el navegador (no durante el prerender).
  const now = useNow(3_600_000);
  if (!now) {
    return (
      <>
        <AdminTopBar crumbs={[{ label: "Historial de pedidos" }]} />
        <p className="py-10 text-center text-base text-muted">Cargando pedidos…</p>
      </>
    );
  }
  return <HistoryView today={isoDay(new Date(now))} />;
}

function HistoryView({ today }: { today: string }) {
  const initial: Filters = { from: today, to: today, tableId: "", status: "" };
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);
  const [tables, setTables] = useState<{ id: string; number: number }[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    createClient()
      .from("tables")
      .select("id, number")
      .order("number")
      .then(({ data }) => setTables(data ?? []));
  }, []);

  const { data: orders, live, reload } = useLiveData(
    "admin-history",
    ["orders", "order_items"],
    () => loadHistory(applied),
  );
  // Al aplicar filtros nuevos, recarga con ellos.
  const appliedKey = JSON.stringify(applied);
  useEffect(() => {
    reload();
  }, [appliedKey, reload]);

  function apply(event: FormEvent) {
    event.preventDefault();
    setApplied({ ...draft, to: draft.to < draft.from ? draft.from : draft.to });
    setPage(1);
  }

  const visible = orders?.filter((o) => !applied.status || o.status === applied.status) ?? [];
  const consumption = visible.reduce((sum, o) => sum + o.total, 0);
  const singleDay = applied.from === applied.to;

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Historial de pedidos" }]} live={live} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title="Cada pedido, en su historia"
          subtitle="Consulta consumos, estados y tiempos registrados durante el servicio."
        />

          <form onSubmit={apply} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-4">
            <Field label="Fecha desde">
              <Input type="date" value={draft.from} max={draft.to} onChange={(e) => setDraft({ ...draft, from: e.target.value })} required />
            </Field>
            <Field label="Fecha hasta">
              <Input type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft({ ...draft, to: e.target.value })} required />
            </Field>
            <Field label="Mesa">
              <Select value={draft.tableId} onChange={(e) => setDraft({ ...draft, tableId: e.target.value })}>
                <option value="">Todas las mesas</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tableLabel(t.number)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OrderItemStatus | "" })}>
                <option value="">Todos los estados</option>
                {ORDER_ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_ITEM_STATUS_DISPLAY[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit">Filtrar</Button>
          </form>

        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-bold">{singleDay ? "Pedidos del día" : "Pedidos del período"}</h2>
          {orders && (
            <p className="text-sm text-muted">
              {visible.length} {visible.length === 1 ? "pedido" : "pedidos"} · {formatPrice(consumption)} de consumo
            </p>
          )}
        </div>

        {!orders ? (
          <p className="py-10 text-center text-base text-muted">Cargando pedidos…</p>
        ) : visible.length === 0 ? (
          <Card className="py-10 text-center text-base text-muted">No hay pedidos con esos filtros.</Card>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Pedido</TableHeader>
                  <TableHeader>Mesa</TableHeader>
                  <TableHeader>{singleDay ? "Hora" : "Fecha y hora"}</TableHeader>
                  <TableHeader>Estado</TableHeader>
                  <TableHeader>Total</TableHeader>
                  <TableHeader>Detalle</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginate(visible, page, PAGE_SIZE).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-base">#{o.number}</TableCell>
                    <TableCell className="text-base">{tableLabel(o.table)}</TableCell>
                    <TableCell className="text-base">
                      {singleDay ? "" : `${new Date(o.createdAt).toLocaleDateString("es-CL")} · `}
                      {formatClock(o.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={o.status} />
                    </TableCell>
                    <TableCell className="text-base">{formatPrice(o.total)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/historial/${o.id}`}
                        className="inline-flex items-center gap-1 text-base text-primary hover:underline"
                      >
                        Ver detalle <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={visible.length} noun="pedidos" onChange={setPage} />
          </>
        )}

        <InfoNote plain title="Estado general del pedido">
          Si los platos tienen estados distintos, se muestra el menos avanzado. El total corresponde al consumo y no acredita un
          pago.
        </InfoNote>
      </main>
    </>
  );
}
