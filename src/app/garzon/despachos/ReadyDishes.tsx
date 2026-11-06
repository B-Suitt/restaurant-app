"use client";

import { useEffect, useRef, useState } from "react";
import { Check, UserRound } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InfoNote } from "@/components/ui/InfoNote";
import { StatusChip } from "@/components/ui/StatusChip";
import { extrasText, statusTime, tableLabel } from "@/lib/order-format";
import { errorMessage } from "@/lib/rpc-errors";
import { playChime } from "@/lib/shift-alerts";
import { createClient } from "@/lib/supabase/client";
import { formatAgo, formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { useNow } from "@/lib/use-now";
import { WaiterNav } from "../WaiterNav";

async function loadReady() {
  const { data, error } = await createClient()
    .from("order_items")
    .select(
      `id, quantity, note,
       dishes(name),
       order_item_extras(price, dish_extras(name)),
       order_item_events(status, changed_at),
       orders!inner(number, table_sessions!inner(status, tables(number)))`,
    )
    .eq("status", "listo_para_entregar")
    .eq("orders.table_sessions.status", "open");
  if (error) throw error;
  // Primero lo que lleva más tiempo esperando.
  return data
    .map((item) => ({ ...item, readyAt: statusTime(item.order_item_events, "listo_para_entregar") ?? "" }))
    .sort((a, b) => a.readyAt.localeCompare(b.readyAt));
}

type ReadyItem = Awaited<ReturnType<typeof loadReady>>[number];

// Frame "Garzón · Platos listos"
export function ReadyDishes() {
  const now = useNow(30_000);
  const { data: items, live, reload } = useLiveData("waiter-ready", ["order_items"], loadReady);

  // Suena cuando aparece un plato listo que no estaba en la carga anterior.
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!items) return;
    const hasNew = known.current !== null && items.some((i) => !known.current!.has(i.id));
    known.current = new Set(items.map((i) => i.id));
    if (hasNew) playChime();
  }, [items]);

  const count = items?.length ?? 0;

  return (
    <>
      <AppHeader
        title="Listos para despachar"
        subtitle={items ? `${count} ${count === 1 ? "plato espera" : "platos esperan"} por ti` : undefined}
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
        <h2 className="text-[27px] leading-[1.4]">De cocina a la mesa.</h2>
        <p className="text-base text-muted">Confirma la entrega cuando el plato llegue al comensal.</p>

        {items && items.length === 0 && (
          <Card className="flex flex-col gap-2 text-center">
            <p className="text-lg font-bold">Nada por despachar</p>
            <p className="text-sm text-muted">Te avisaremos cuando cocina marque un plato como listo.</p>
          </Card>
        )}
        {items?.map((item) => <ReadyCard key={item.id} item={item} now={now} onChange={reload} />)}

        <InfoNote title="Entrega a cargo de sala">
          Cocina marca los platos como listos. Solo el garzón confirma la entrega final.
        </InfoNote>
      </main>
      <WaiterNav active="despachos" />
    </>
  );
}

function ReadyCard({ item, now, onChange }: { item: ReadyItem; now: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extras = extrasText(item.order_item_extras);
  const details = [extras.length ? extras.join(" · ") : "Sin adicionales", item.note || "Sin notas"];

  async function deliver() {
    setBusy(true);
    const { error: rpcError } = await createClient().rpc("set_item_status", {
      p_item_id: item.id,
      p_status: "entregado",
    });
    setBusy(false);
    setError(rpcError ? errorMessage(rpcError) : null);
    onChange();
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[23px] leading-[1.4]">{tableLabel(item.orders.table_sessions.tables.number)}</p>
        <p className="pt-1 text-sm text-muted">
          #{item.orders.number}
          {item.readyAt && ` · ${formatClock(item.readyAt)}`}
        </p>
      </div>
      <StatusChip status="listo_para_entregar" />
      <p className="text-[17px] leading-[1.4] font-bold">
        {item.quantity} × {item.dishes.name}
      </p>
      <p className="text-md text-muted">{details.join(" · ")}</p>
      {item.readyAt && (
        <p className="text-sm text-success-fg">Listo {formatAgo(now - new Date(item.readyAt).getTime())}</p>
      )}
      {error && <p className="text-sm text-primary">{error}</p>}
      <Button onClick={deliver} loading={busy}>
        {!busy && <Check className="size-5" aria-hidden />} Marcar como entregado
      </Button>
    </Card>
  );
}
