"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BellRing, HandPlatter, ReceiptText, UserRound } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatPrice } from "@/lib/format-price";
import { statusTime, tableLabel } from "@/lib/order-format";
import { errorMessage } from "@/lib/rpc-errors";
import { sessionTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { formatAgo, formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { useNow } from "@/lib/use-now";
import { WaiterNav } from "../WaiterNav";

/** Ventana de avisos ya atendidos que se muestran (un turno). */
const SHIFT_HOURS = 12;

async function loadAlerts() {
  const supabase = createClient();
  const since = new Date(Date.now() - SHIFT_HOURS * 3600_000).toISOString();
  const [ready, calls] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        `id, quantity, dishes(name), order_item_events(status, changed_at),
         orders!inner(number, table_sessions!inner(status, table_id, tables(number, zone)))`,
      )
      .eq("status", "listo_para_entregar")
      .eq("orders.table_sessions.status", "open"),
    supabase
      .from("waiter_calls")
      .select(
        `id, type, created_at, attended_at,
         table_sessions(table_id, tables(number, zone), orders(order_items(quantity, unit_price, status, order_item_extras(price))))`,
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ]);
  if (ready.error || calls.error) throw ready.error ?? calls.error;

  const alerts: Alert[] = [
    ...ready.data.map((item) => {
      const session = item.orders.table_sessions;
      return {
        kind: "ready" as const,
        id: item.id,
        at: statusTime(item.order_item_events, "listo_para_entregar") ?? new Date().toISOString(),
        attended: false,
        tableId: session.table_id,
        table: session.tables,
        orderNumber: item.orders.number,
        text: `${item.quantity} × ${item.dishes.name} espera en cocina.`,
      };
    }),
    ...calls.data.map((call) => ({
      kind: call.type === "bill" ? ("bill" as const) : ("call" as const),
      id: call.id,
      at: call.created_at,
      attended: call.attended_at !== null,
      tableId: call.table_sessions.table_id,
      table: call.table_sessions.tables,
      orderNumber: null,
      text:
        call.type === "bill"
          ? `Consumo de la estadía: ${formatPrice(sessionTotal(call.table_sessions.orders))}.`
          : "La mesa necesita tu ayuda.",
    })),
  ];
  // Primero lo más reciente.
  return alerts.sort((a, b) => b.at.localeCompare(a.at));
}

type Alert = {
  kind: "ready" | "call" | "bill";
  id: string;
  at: string;
  attended: boolean;
  tableId: string;
  table: { number: number; zone: string };
  orderNumber: number | null;
  text: string;
};

type Filter = "todos" | "pendientes" | "atendidos";

// Frame "Garzón · Bandeja de avisos"
export function AlertsInbox() {
  const now = useNow(30_000);
  const [filter, setFilter] = useState<Filter>("pendientes");
  const { data: alerts, live, reload } = useLiveData(
    "waiter-alerts",
    ["order_items", "waiter_calls", "table_sessions"],
    loadAlerts,
  );

  const pendingCount = alerts?.filter((a) => !a.attended).length ?? 0;
  const visible =
    alerts?.filter((a) => filter === "todos" || (filter === "pendientes" ? !a.attended : a.attended)) ?? [];

  return (
    <>
      <AppHeader
        title="Bandeja de avisos"
        subtitle={
          alerts ? `${pendingCount} ${pendingCount === 1 ? "aviso nuevo" : "avisos nuevos"} · Tu turno` : undefined
        }
        action={
          <SignOutButton>
            <HeaderIcon>
              <UserRound aria-hidden />
            </HeaderIcon>
          </SignOutButton>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        <LiveIndicator live={live} />
        <FilterTabs<Filter>
          label="Filtrar avisos"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todos", label: "Todos" },
            { value: "pendientes", label: "Sin atender" },
            { value: "atendidos", label: "Atendidos" },
          ]}
        />

        {alerts === null ? (
          <p className="py-6 text-center text-base text-muted">Cargando avisos…</p>
        ) : visible.length === 0 ? (
          <Card className="flex flex-col gap-2 text-center">
            <p className="text-lg font-bold">{filter === "atendidos" ? "Sin avisos atendidos" : "Todo al día"}</p>
            <p className="text-sm text-muted">
              {filter === "atendidos"
                ? "Los llamados que atiendas durante el turno aparecerán aquí."
                : "Te avisaremos cuando una mesa te llame, pida la cuenta o haya un plato listo."}
            </p>
          </Card>
        ) : (
          visible.map((alert) => (
            <AlertCard key={`${alert.kind}-${alert.id}`} alert={alert} now={now} onChange={reload} />
          ))
        )}
      </main>
      <WaiterNav active="avisos" />
    </>
  );
}

const ALERT_DISPLAY: Record<Alert["kind"], { title: string; icon: ReactNode }> = {
  ready: { title: "Plato listo para entregar", icon: <HandPlatter aria-hidden /> },
  call: { title: "El cliente te llama", icon: <BellRing aria-hidden /> },
  bill: { title: "Solicitan la cuenta", icon: <ReceiptText aria-hidden /> },
};

function AlertCard({ alert, now, onChange }: { alert: Alert; now: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { title, icon } = ALERT_DISPLAY[alert.kind];
  const ago = formatAgo(now - new Date(alert.at).getTime());

  async function attend() {
    setBusy(true);
    const { error: rpcError } = await createClient().rpc("attend_call", { p_call_id: alert.id });
    setBusy(false);
    setError(rpcError ? errorMessage(rpcError) : null);
    onChange();
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span className="text-primary [&_svg]:size-5">{icon}</span>
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-bold">{title}</p>
          <p className="text-sm text-muted">
            {tableLabel(alert.table.number)} ·{" "}
            {alert.orderNumber ? `Pedido #${alert.orderNumber}` : alert.table.zone}
          </p>
        </div>
      </div>
      <p className="text-base">{alert.text}</p>
      <div className="flex items-center justify-between gap-3">
        {alert.attended ? (
          <Chip tone="neutral">Atendido</Chip>
        ) : alert.kind === "ready" ? (
          <StatusChip status="listo_para_entregar" />
        ) : alert.kind === "call" ? (
          <Chip tone="warning">Llamando</Chip>
        ) : (
          <Chip tone="accent">Pidiendo la cuenta</Chip>
        )}
        <p className="text-xs text-muted">
          {ago.charAt(0).toUpperCase() + ago.slice(1)} · {formatClock(alert.at)}
        </p>
      </div>
      {error && <p className="text-sm text-primary">{error}</p>}
      {alert.kind === "ready" ? (
        <Link href="/garzon/despachos" className={buttonClasses({ variant: "secondary" })}>
          Ver despacho
        </Link>
      ) : alert.kind === "bill" ? (
        <Link href={`/garzon/mesas/${alert.tableId}`} className={buttonClasses({ variant: "secondary" })}>
          Ver cuenta de la mesa
        </Link>
      ) : (
        !alert.attended && (
          <Button variant="secondary" onClick={attend} loading={busy}>
            Atender llamado
          </Button>
        )
      )}
    </Card>
  );
}
