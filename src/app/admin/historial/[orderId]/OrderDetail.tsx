"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { InfoNote } from "@/components/ui/InfoNote";
import { LinkNotice } from "@/components/ui/LinkNotice";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { TotalRow } from "@/components/ui/TotalRow";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format-price";
import { extrasText, tableLabel } from "@/lib/order-format";
import { ORDER_ITEM_STATUS_DISPLAY, type OrderItemStatus } from "@/lib/order-status";
import { isLoadFailure } from "@/lib/rpc-errors";
import { itemTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time-format";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

async function loadOrder(orderId: string) {
  const supabase = createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `id, number, created_at, created_by,
       table_sessions(status, closed_at, closed_by, unpaid, tables(number, zone)),
       order_items(id, quantity, note, unit_price, status, dishes(name),
         order_item_extras(price, dish_extras(name)),
         order_item_events(status, changed_at, changed_by))`,
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  // Nombres de quienes hicieron cada cambio (los clientes no tienen perfil).
  const ids = new Set<string>();
  if (order.created_by) ids.add(order.created_by);
  if (order.table_sessions.closed_by) ids.add(order.table_sessions.closed_by);
  for (const i of order.order_items) for (const e of i.order_item_events) if (e.changed_by) ids.add(e.changed_by);
  const { data: people } = ids.size
    ? await supabase.from("profiles").select("id, name").in("id", [...ids])
    : { data: [] as { id: string; name: string }[] };
  return { order, names: new Map((people ?? []).map((p) => [p.id, p.name])) };
}

type Loaded = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;
type Step = { status: OrderItemStatus; at: string; text: string };

/** Hitos del pedido: cuándo entró el primer plato a cada estado y cuándo lo completó el último. */
function timeline({ order, names }: Loaded): Step[] {
  const items = order.order_items;
  const active = items.filter((i) => i.status !== "cancelado");
  const events = (status: string, list = items) =>
    list.flatMap((i) => i.order_item_events.filter((e) => e.status === status)).sort((a, b) => a.changed_at.localeCompare(b.changed_at));
  const name = (id: string | null) => (id ? names.get(id) : null);
  const steps: Step[] = [];

  const received = events("recibido")[0];
  if (received) {
    const by = name(order.created_by);
    steps.push({ status: "recibido", at: received.changed_at, text: by ? `Pedido ingresado por ${by}.` : "Pedido enviado desde el QR de la mesa." });
  }
  const started = events("en_preparacion")[0];
  if (started) steps.push({ status: "en_preparacion", at: started.changed_at, text: "Cocina inicia la preparación de los platos." });

  const reached = (status: string) => active.length > 0 && active.every((i) => i.order_item_events.some((e) => e.status === status));
  const ready = events("listo_para_entregar", active).at(-1);
  if (ready) {
    steps.push({
      status: "listo_para_entregar",
      at: ready.changed_at,
      text: reached("listo_para_entregar") ? "Último plato listo. Se notifica a sala." : "Primeros platos listos. Se notifica a sala.",
    });
  }
  const delivered = events("entregado", active).at(-1);
  if (delivered) {
    const by = name(delivered.changed_by) ?? "Sala";
    steps.push({
      status: "entregado",
      at: delivered.changed_at,
      text: reached("entregado") ? `${by} confirma la entrega de todos los platos.` : `${by} entrega parte de los platos.`,
    });
  }
  for (const e of events("cancelado")) {
    const item = items.find((i) => i.order_item_events.includes(e))!;
    const by = name(e.changed_by);
    steps.push({ status: "cancelado", at: e.changed_at, text: `${item.quantity} × ${item.dishes.name} cancelado ${by ? `por ${by}` : "por el cliente"}.` });
  }
  return steps.sort((a, b) => a.at.localeCompare(b.at));
}

const longDay = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const shortDay = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const DOT: Record<OrderItemStatus, string> = {
  recibido: "bg-warning-fg",
  en_preparacion: "bg-info-fg",
  listo_para_entregar: "bg-success-fg",
  entregado: "bg-neutral-fg",
  cancelado: "bg-danger-fg",
};

// Frame "Administrador · Detalle histórico"
export function OrderDetail({ orderId }: { orderId: string }) {
  const [data, setData] = useState<Loaded | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadOrder(orderId)
      .then(setData)
      .catch((e) => (isLoadFailure(e) ? setError(true) : setData(null)));
  }, [orderId]);

  const order = data?.order;
  const title = order ? `Pedido #${order.number}` : "Pedido";

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Historial de pedidos", href: "/admin/historial" }, { label: title }]} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title={title}
          subtitle={order ? `Historial / ${title} · ${capitalize(longDay.format(new Date(order.created_at)))}` : undefined}
        />

        {error ? (
          <ErrorNote>No pudimos cargar el pedido. Revisa tu conexión y recarga la página.</ErrorNote>
        ) : data === null ? (
          <LinkNotice text="No encontramos ese pedido." href="/admin/historial" linkLabel="Volver al historial" />
        ) : !data || !order ? (
          <div className="flex flex-col gap-6">
            <StatsSkeleton count={3} />
            <TableSkeleton rows={3} cols={4} label="Cargando pedido…" />
          </div>
        ) : (
          <Detail data={data} />
        )}
      </main>
    </>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Detail({ data }: { data: Loaded }) {
  const { order, names } = data;
  const session = order.table_sessions;
  const steps = timeline(data);
  const active = order.order_items.filter((i) => i.status !== "cancelado");
  const total = active.reduce((sum, i) => sum + itemTotal(i), 0);
  const count = active.reduce((sum, i) => sum + i.quantity, 0);

  // Quién atendió: quien ingresó el pedido o, si lo envió el cliente, quien entregó.
  const delivererId = order.order_items
    .flatMap((i) => i.order_item_events)
    .filter((e) => e.status === "entregado" && e.changed_by)
    .at(-1)?.changed_by;
  const attendant = (order.created_by && names.get(order.created_by)) || (delivererId && names.get(delivererId)) || null;

  const first = steps[0]?.at ?? order.created_at;
  const done = steps.find((s) => s.status === "entregado" && s.text.includes("todos"));
  const minutes = done ? Math.round((new Date(done.at).getTime() - new Date(first).getTime()) / 60000) : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Card className="flex flex-col gap-2 p-5">
          <p className="text-2xl">{tableLabel(session.tables.number)}</p>
          <p className="text-sm text-muted">
            {session.tables.zone} · {session.status === "closed" ? "Estadía cerrada" : "Estadía abierta"}
          </p>
          {session.unpaid && <Chip tone="danger">Se fue sin pagar</Chip>}
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <p className="text-2xl">{attendant ?? "Sin asignar"}</p>
          <p className="text-sm text-muted">{order.created_by ? "Ingresó el pedido" : "Garzón que entregó"}</p>
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <p className="flex items-center gap-2 text-2xl">
            {formatClock(first)}
            {done && (
              <>
                <ArrowRight className="size-5" aria-hidden /> {formatClock(done.at)}
              </>
            )}
          </p>
          <p className="text-sm text-muted">{minutes !== null ? `${minutes} min hasta entrega final` : "Pedido en curso"}</p>
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_428px] items-start gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold">Platos del pedido</h2>
            <p className="text-sm text-muted">
              {count} {count === 1 ? "producto" : "productos"}
            </p>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader className="w-[38%]">Plato / adicionales</TableHeader>
                <TableHeader>Cantidad</TableHeader>
                <TableHeader>Importe</TableHeader>
                <TableHeader>Estado</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.order_items.map((item) => {
                const extras = extrasText(item.order_item_extras);
                const cancelled = item.status === "cancelado";
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className={cn("text-base", cancelled && "text-muted line-through")}>{item.dishes.name}</p>
                      {extras.length > 0 && <p className="text-xs text-muted">{extras.join(" · ")}</p>}
                      {item.note && <p className="text-xs text-muted">Nota: {item.note}</p>}
                    </TableCell>
                    <TableCell className="text-base">{item.quantity}</TableCell>
                    <TableCell className={cn("text-base", cancelled && "text-muted line-through")}>
                      {formatPrice(itemTotal(item))}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={item.status as OrderItemStatus} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Card className="flex flex-col gap-3 p-5">
            <TotalRow label="Total" amount={total} />
            <p className="text-sm text-muted">IVA incluido · Propina no incluida</p>
          </Card>
          <InfoNote plain title="Registro de consumo">
            Pago realizado fuera de la app. El cierre de mesa no es un comprobante de pago.
          </InfoNote>
        </div>

        <Card className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Secuencia de estados</h2>
            <p className="text-sm text-muted">Hora de cada cambio · {shortDay.format(new Date(order.created_at))}</p>
          </div>
          <ol className="flex flex-col">
            {steps.map((step, i) => (
              <li key={i} className="relative flex gap-4 pb-8 last:pb-0">
                {i < steps.length - 1 && <span className="absolute top-3 left-[4px] h-full w-px bg-border" aria-hidden />}
                <span className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full", DOT[step.status])} aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <StatusChip status={step.status} />
                    <span className="text-sm tabular-nums">{formatClock(step.at)}</span>
                  </div>
                  <p className="text-sm text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {steps.length === 0 && <p className="text-sm text-muted">Sin cambios de estado registrados.</p>}
          {session.status === "closed" && session.closed_at && (
            <p className="text-sm text-muted">
              Mesa cerrada a las {formatClock(session.closed_at)}
              {session.closed_by && names.get(session.closed_by) ? ` por ${names.get(session.closed_by)}` : ""}.
            </p>
          )}
          <span className="sr-only">{steps.map((s) => ORDER_ITEM_STATUS_DISPLAY[s.status].label).join(", ")}</span>
        </Card>
      </div>
    </>
  );
}
