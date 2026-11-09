"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, ClipboardList, DoorOpen, Plus, ReceiptText, WifiOff } from "lucide-react";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { OrderItemRow } from "@/components/orders/OrderItemRow";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { InfoNote } from "@/components/ui/InfoNote";
import { Modal } from "@/components/ui/Modal";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { TotalRow } from "@/components/ui/TotalRow";
import { tableLabel } from "@/lib/order-format";
import { errorMessage } from "@/lib/rpc-errors";
import { sessionTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { TABLE_STATUS_DISPLAY, tableStatus } from "@/lib/table-status";
import { formatAgo, formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { useNow } from "@/lib/use-now";
import { useProfileName } from "@/lib/use-profile";
import { useRowAction } from "@/lib/use-row-action";
import { WaiterHeader } from "../../WaiterHeader";
import { WaiterNav } from "../../WaiterNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardsSkeleton } from "@/components/ui/Skeleton";

async function loadTable(tableId: string) {
  const supabase = createClient();
  const [table, session] = await Promise.all([
    supabase.from("tables").select("id, number, capacity, zone, active").eq("id", tableId).maybeSingle(),
    supabase
      .from("table_sessions")
      .select(
        `id, opened_at, confirmed_at,
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
      <WaiterHeader title={label} subtitle={[name, table?.zone].filter(Boolean).join(" · ")} backHref="/garzon" />
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
                    Se ocupa con el primer pedido o llamado del cliente. También puedes tomar el pedido tú.
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
                {session.orders.length > 0 && !session.confirmed_at && (
                  <ConfirmSession sessionId={session.id} onChange={reload} />
                )}

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
                          <OrderItemRow
                            key={item.id}
                            item={item}
                            showUnitPrice
                            confirmText={`¿Cancelar ${item.quantity} × ${item.dishes.name}?`}
                            onChange={reload}
                          />
                        ))}
                      </ul>
                    </Card>
                  ))
                )}

                <TotalRow label="Consumo actual" amount={total} />
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

function ConfirmSession({ sessionId, onChange }: { sessionId: string; onChange: () => void }) {
  const { busy, error, run } = useRowAction(onChange);
  const confirm = () => run(() => createClient().rpc("confirm_session", { p_session_id: sessionId }));

  return (
    <Card tone="highlight" className="flex flex-col gap-3">
      <p className="text-base font-bold">¿Hay clientes en esta mesa?</p>
      <p className="text-sm text-muted">
        El pedido llegará a cocina cuando confirmes. Si nadie está sentado aquí, cierra la mesa.
      </p>
      {error && <p className="text-sm text-primary">{error}</p>}
      <Button onClick={confirm} loading={busy}>
        Confirmar mesa
      </Button>
    </Card>
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
  const { busy, error, run } = useRowAction(onChange);
  const isBill = call.type === "bill";
  const attend = () => run(() => createClient().rpc("attend_call", { p_call_id: call.id }));

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
  const [unpaid, setUnpaid] = useState(false);
  // No bloquea el cierre (regla no definida), pero avisa si quedan platos en curso.
  const inProgress = session.orders
    .flatMap((o) => o.order_items)
    .filter((i) => i.status === "recibido" || i.status === "en_preparacion" || i.status === "listo_para_entregar")
    .reduce((sum, i) => sum + i.quantity, 0);

  async function confirm() {
    setBusy(true);
    const { error: rpcError } = await createClient().rpc("close_session", { p_session_id: session.id, p_unpaid: unpaid });
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
      <TotalRow label="Consumo registrado" amount={total} />
      {inProgress > 0 && (
        <p role="alert" className="rounded-sm bg-warning-bg p-3 text-md text-warning-fg">
          Quedan {inProgress} {inProgress === 1 ? "plato" : "platos"} sin entregar.
        </p>
      )}
      <ToggleRow label="Se fue sin pagar" checked={unpaid} onChange={setUnpaid} onLabel="Sí" offLabel="No" />
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
