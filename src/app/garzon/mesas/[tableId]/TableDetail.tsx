"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, DoorOpen, Plus, ReceiptText, UserRound } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { InfoNote } from "@/components/ui/InfoNote";
import { Modal } from "@/components/ui/Modal";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatPrice } from "@/lib/format-price";
import { extrasText, tableLabel } from "@/lib/order-format";
import type { OrderItemStatus } from "@/lib/order-status";
import { errorMessage } from "@/lib/rpc-errors";
import { sessionTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { TABLE_STATUS_DISPLAY, tableStatus } from "@/lib/table-status";
import { formatAgo, formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { useNow } from "@/lib/use-now";
import { useProfileName } from "@/lib/use-profile";
import { WaiterNav } from "../../WaiterNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardsSkeleton } from "@/components/ui/Skeleton";
import { ClipboardList, WifiOff } from "lucide-react";

async function loadTable(tableId: string) {
  const supabase = createClient();
  const [table, session] = await Promise.all([
    supabase.from("tables").select("id, number, capacity, zone, active").eq("id", tableId).maybeSingle(),
    supabase
      .from("table_sessions")
      .select(
        `id, guest_count, opened_at,
         waiter_calls(id, type, created_at, attended_at),
         orders(id, number, created_at, order_items(id, quantity, note, unit_price, status, dishes(name), order_item_extras(price, dish_extras(name))))`,
      )
      .eq("table_id", tableId)
      .eq("status", "open")
      .maybeSingle(),
  ]);
  if (table.error || session.error) throw table.error ?? session.error;
  if (session.data) {
    session.data.orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
    for (const order of session.data.orders) {
      order.order_items.sort((a, b) => a.dishes.name.localeCompare(b.dishes.name, "es"));
    }
  }
  // Una sesión sin pedidos ni llamados es una mesa libre: al tomar el pedido se reutiliza.
  return { table: table.data, session: tableStatus(session.data) === "libre" ? null : session.data };
}

type Session = NonNullable<Awaited<ReturnType<typeof loadTable>>["session"]>;
type Item = Session["orders"][number]["order_items"][number];

// Frame "Garzón · Detalle de mesa"
export function TableDetail({ tableId }: { tableId: string }) {
  const router = useRouter();
  const name = useProfileName();
  const now = useNow(30_000);
  const { data, error: loadError, live, reload } = useLiveData(
    `waiter-table-${tableId}`,
    ["table_sessions", "waiter_calls", "orders", "order_items"],
    () => loadTable(tableId),
  );
  const [closing, setClosing] = useState(false);

  const table = data?.table;
  const session = data?.session;
  const label = table ? tableLabel(table.number) : "Mesa";
  const status = TABLE_STATUS_DISPLAY[tableStatus(session)];
  const total = session ? sessionTotal(session.orders) : 0;
  const pendingCalls = session?.waiter_calls.filter((c) => c.attended_at === null) ?? [];

  return (
    <>
      <AppHeader
        title={label}
        subtitle={[name, table?.zone].filter(Boolean).join(" · ")}
        backHref="/garzon"
        action={
          <SignOutButton>
            <HeaderIcon>
              <UserRound aria-hidden />
            </HeaderIcon>
          </SignOutButton>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        {data === null ? (
          loadError ? (
            <EmptyState icon={<WifiOff aria-hidden />} title="No pudimos cargar la mesa">
              Revisa tu conexión. Reintentaremos automáticamente.
            </EmptyState>
          ) : (
            <CardsSkeleton count={2} label="Cargando mesa…" />
          )
        ) : !table ? (
          <Card className="flex flex-col gap-2 text-center">
            <p className="text-lg font-bold">Mesa no encontrada</p>
            <Link href="/garzon" className="text-sm text-primary hover:underline">
              Volver a las mesas
            </Link>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <Chip tone={status.tone}>{status.label}</Chip>
              <LiveIndicator live={live} />
            </div>
            <h2 className="text-[27px] leading-[1.4]">
              {session ? "Una mesa bien atendida." : "Lista para recibir."}
            </h2>
            <p className="text-base text-muted">
              {session
                ? [
                    session.guest_count && `${session.guest_count} personas`,
                    table.zone,
                    // La sesión pudo crearse mucho antes de que llegaran estos clientes.
                    `Abierta a las ${formatClock(session.orders.at(-1)?.created_at ?? session.opened_at)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : `${table.capacity} lugares · ${table.zone}`}
            </p>

            {!session ? (
              <>
                <Card className="flex flex-col gap-2 text-center">
                  <p className="text-lg font-bold">Mesa libre</p>
                  <p className="text-sm text-muted">
                    Se abre sola cuando un cliente escanea el QR. También puedes tomar el pedido tú: la mesa se abre al enviarlo.
                  </p>
                </Card>
                {table.active && (
                  <Link href={`/garzon/mesas/${tableId}/agregar`} className={buttonClasses()}>
                    <Plus className="size-5" aria-hidden /> Tomar pedido
                  </Link>
                )}
              </>
            ) : (
              <>
                {pendingCalls.map((call) => (
                  <PendingCall key={call.id} call={call} now={now} onChange={reload} />
                ))}

                {session.orders.length === 0 ? (
                  <EmptyState icon={<ClipboardList aria-hidden />} title="Aún no hay pedidos">
                    Los pedidos de la mesa aparecerán aquí. También puedes agregarlos tú.
                  </EmptyState>
                ) : (
                  session.orders.map((order) => (
                    <Card key={order.id} className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-bold">Pedido #{order.number}</p>
                        <p className="text-sm text-muted">{formatClock(order.created_at)}</p>
                      </div>
                      <ul className="flex flex-col gap-4">
                        {order.order_items.map((item) => (
                          <ItemRow key={item.id} item={item} onChange={reload} />
                        ))}
                      </ul>
                    </Card>
                  ))
                )}

                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-lg font-bold">Consumo actual</p>
                  <p className="text-2xl">{formatPrice(total)}</p>
                </div>
                <Link href={`/garzon/mesas/${tableId}/agregar`} className={buttonClasses()}>
                  <Plus className="size-5" aria-hidden /> Agregar pedido
                </Link>
                <Button variant="secondary" onClick={() => setClosing(true)}>
                  Cerrar mesa
                </Button>
                <InfoNote title="Sin cobro en la app">
                  El pago se gestiona fuera de la app. Cierra la mesa únicamente cuando la atención haya finalizado.
                </InfoNote>

                <CloseTableModal
                  open={closing}
                  onClose={() => setClosing(false)}
                  session={session}
                  label={label}
                  total={total}
                  onClosed={() => router.push("/garzon")}
                />
              </>
            )}
          </>
        )}
      </main>
      <WaiterNav active="mesas" />
    </>
  );
}

function PendingCall({
  call,
  now,
  onChange,
}: {
  call: Session["waiter_calls"][number];
  now: number;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBill = call.type === "bill";

  async function attend() {
    setBusy(true);
    const { error: rpcError } = await createClient().rpc("attend_call", { p_call_id: call.id });
    setBusy(false);
    setError(rpcError ? errorMessage(rpcError) : null);
    onChange();
  }

  return (
    <Card tone="highlight" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        {isBill ? (
          <ReceiptText className="size-5 text-primary" aria-hidden />
        ) : (
          <BellRing className="size-5 text-primary" aria-hidden />
        )}
        <p className="flex-1 text-base font-bold">{isBill ? "Solicitan la cuenta" : "El cliente te llama"}</p>
        <p className="text-sm text-muted">{formatAgo(now - new Date(call.created_at).getTime())}</p>
      </div>
      <Chip tone={isBill ? "accent" : "warning"}>{isBill ? "Pidiendo la cuenta" : "Llamando"}</Chip>
      {error && <p className="text-sm text-primary">{error}</p>}
      <Button variant="secondary" onClick={attend} loading={busy}>
        {isBill ? "Cuenta entregada" : "Atender llamado"}
      </Button>
    </Card>
  );
}

function ItemRow({ item, onChange }: { item: Item; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const details = [
    ...extrasText(item.order_item_extras),
    item.note,
    item.quantity > 1 ? `${formatPrice(item.unit_price)} c/u` : "",
  ].filter(Boolean);

  async function cancel() {
    if (!window.confirm(`¿Cancelar ${item.quantity} × ${item.dishes.name}?`)) return;
    setBusy(true);
    const { error: rpcError } = await createClient().rpc("set_item_status", { p_item_id: item.id, p_status: "cancelado" });
    setBusy(false);
    setError(rpcError ? errorMessage(rpcError) : null);
    onChange();
  }

  return (
    <li className="flex flex-col gap-2.25 border-b border-border pb-4">
      <p className={item.status === "cancelado" ? "text-base text-muted line-through" : "text-base"}>
        {item.quantity} × {item.dishes.name}
      </p>
      {details.length > 0 && <p className="text-sm text-muted">{details.join(" · ")}</p>}
      <div className="flex items-center justify-between gap-3">
        <StatusChip status={item.status as OrderItemStatus} />
        {/* Solo se puede cancelar mientras el plato está en Recibido. */}
        {item.status === "recibido" && (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="cursor-pointer text-sm text-primary hover:underline disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
      {error && <p className="text-sm text-primary">{error}</p>}
    </li>
  );
}

// Frame "Garzón · Modal cerrar mesa"
function CloseTableModal({
  open,
  onClose,
  session,
  label,
  total,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  session: Session;
  label: string;
  total: number;
  onClosed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // No bloquea el cierre (regla no definida), pero avisa si quedan platos en curso.
  const inProgress = session.orders
    .flatMap((o) => o.order_items)
    .filter((i) => i.status === "recibido" || i.status === "en_preparacion" || i.status === "listo_para_entregar")
    .reduce((sum, i) => sum + i.quantity, 0);

  async function confirm() {
    setBusy(true);
    const { error: rpcError } = await createClient().rpc("close_session", { p_session_id: session.id });
    setBusy(false);
    if (rpcError) {
      setError(errorMessage(rpcError));
      return;
    }
    onClosed();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<DoorOpen aria-hidden />}
      title={`¿Cerrar la ${label.toLowerCase()}?`}
      description="Cierra la estadía solo cuando hayas finalizado la atención y gestionado el pago fuera de la app."
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-bold">Consumo registrado</p>
        <p className="text-2xl">{formatPrice(total)}</p>
      </div>
      {inProgress > 0 && (
        <p role="alert" className="rounded-sm bg-warning-bg p-3 text-md text-warning-fg">
          Quedan {inProgress} {inProgress === 1 ? "plato" : "platos"} sin entregar.
        </p>
      )}
      <p className="text-sm text-muted">
        La mesa quedará Libre. El historial se conservará. Esta acción no realiza ningún cobro.
      </p>
      {error && <p className="text-sm text-primary">{error}</p>}
      <Button onClick={confirm} loading={busy}>
        Confirmar cierre
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Seguir atendiendo
      </Button>
    </Modal>
  );
}
