"use client";

import { Fragment } from "react";
import { Utensils } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { InfoNote } from "@/components/ui/InfoNote";
import { formatPrice } from "@/lib/format-price";
import { includedVat, loadSessionOrders, sessionTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { ClientNav } from "../ClientNav";
import { tableLabel, useClientSession } from "../ClientSessionProvider";
import { WaiterCallActions } from "../WaiterCallActions";
import { CardsSkeleton } from "@/components/ui/Skeleton";

async function loadBill(sessionId: string) {
  const [orders, session] = await Promise.all([
    loadSessionOrders(sessionId),
    createClient().from("table_sessions").select("opened_at").eq("id", sessionId).single(),
  ]);
  if (session.error) throw session.error;
  // La cuenta se lee en el orden en que se pidió y sin lo cancelado.
  const rounds = orders
    .map((o) => ({ ...o, order_items: o.order_items.filter((i) => i.status !== "cancelado") }))
    .filter((o) => o.order_items.length > 0)
    .reverse();
  return { rounds, openedAt: session.data.opened_at };
}

// Frame "Cliente · Cuenta de la mesa"
export function BillView() {
  const { basePath, sessionId, tableNumber, guestCount } = useClientSession();
  const { data } = useLiveData(`client-bill-${sessionId}`, ["orders", "order_items"], () => loadBill(sessionId));
  const total = data ? sessionTotal(data.rounds) : 0;

  return (
    <>
      <AppHeader
        title="Cuenta de la mesa"
        subtitle={`${tableLabel(tableNumber)} · Visita en curso`}
        backHref={`${basePath}/pedido`}
        action={
          <HeaderIcon>
            <Utensils aria-hidden />
          </HeaderIcon>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        <h2 className="text-[27px] leading-[1.4]">Tu sobremesa, sin apuro.</h2>
        <p className="text-base text-muted">Todo lo consumido durante tu visita, en un solo lugar.</p>

        {data === null ? (
          <CardsSkeleton count={1} label="Cargando cuenta…" />
        ) : (
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <p className="text-base font-bold">
                {[tableLabel(tableNumber), guestCount && `${guestCount} personas`].filter(Boolean).join(" · ")}
              </p>
              <p className="text-sm text-muted">Hoy · {formatClock(data.openedAt)}</p>
            </div>

            {data.rounds.length === 0 ? (
              <p className="py-3 text-center text-base text-muted">Aún no hay consumos en la mesa.</p>
            ) : (
              <ul className="flex flex-col gap-3 border-b border-border pb-3">
                {data.rounds.map((order) => (
                  <Fragment key={order.id}>
                    <li className="text-sm text-muted">
                      PEDIDO #{order.number} · {formatClock(order.created_at)}
                    </li>
                    {order.order_items.map((item) => (
                      <Fragment key={item.id}>
                        <BillLine label={`${item.quantity} × ${item.dishes.name}`} amount={item.unit_price * item.quantity} />
                        {item.order_item_extras.map((extra, i) => (
                          <BillLine key={i} label={extra.dish_extras.name} amount={extra.price * item.quantity} />
                        ))}
                      </Fragment>
                    ))}
                  </Fragment>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 border-b border-border pb-3">
              <div className="flex justify-between gap-3 text-base">
                <span className="text-muted">Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm text-muted">
                <span>IVA incluido</span>
                <span>{formatPrice(includedVat(total))}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-bold">Total</p>
              <p className="text-2xl">{formatPrice(total)}</p>
            </div>
          </Card>
        )}

        <InfoNote title="Esta cuenta es informativa">
          No se realizan pagos en la app. Paga directamente con tu garzón; la propina es voluntaria y no está incluida.
        </InfoNote>
        <WaiterCallActions layout="bill-first" />
        <p className="text-center text-xs text-muted">Gracias por compartir tu mesa con nosotros.</p>
      </main>
      <ClientNav active="cuenta" />
    </>
  );
}

function BillLine({ label, amount }: { label: string; amount: number }) {
  return (
    <li className="flex items-start justify-between gap-3 text-base">
      <span>{label}</span>
      <span className="shrink-0 font-bold">{formatPrice(amount)}</span>
    </li>
  );
}
