"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Utensils } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { InfoNote } from "@/components/ui/InfoNote";
import { Modal } from "@/components/ui/Modal";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format-price";
import { extraLabel } from "@/lib/order-format";
import { createClient } from "@/lib/supabase/client";
import { useOrderId } from "@/lib/use-order-id";
import { ClientNav } from "../ClientNav";
import { WaiterCallActions } from "../WaiterCallActions";
import { linePrice, tableLabel, useClientSession, type CartLine, type MenuDish } from "../ClientSessionProvider";

// Frame "Cliente · Carrito"
export function CartView() {
  const router = useRouter();
  const { basePath, sessionId, tableNumber, cart, dishById, setQuantity, removeLine, clearCart, refreshMenu, rpcError } =
    useClientSession();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderId = useOrderId();

  // Al abrir el carrito se revisa la carta: un plato pudo agotarse mientras tanto.
  useEffect(() => {
    refreshMenu().catch(() => {});
  }, [refreshMenu]);

  const count = cart.reduce((sum, l) => sum + l.quantity, 0);
  const total = cart.reduce((sum, l) => sum + linePrice(l, dishById.get(l.dishId)), 0);
  const unavailable = cart.filter((l) => !dishById.get(l.dishId)?.available);

  async function sendOrder() {
    setSending(true);
    setError(null);
    const items = cart.map((l) => ({ dish_id: l.dishId, quantity: l.quantity, note: l.note, extra_ids: l.extraIds }));
    const { error: placeError } = await createClient().rpc("place_order", {
      p_session_id: sessionId,
      p_items: items,
      p_order_id: orderId.idFor(items),
    });
    if (placeError) {
      setSending(false);
      if (placeError.message === "dish_unavailable") await refreshMenu().catch(() => {});
      setError(rpcError(placeError));
      return;
    }
    orderId.reset();
    clearCart();
    router.push(`${basePath}/pedido`);
  }

  return (
    <>
      <AppHeader
        title="Tu carrito"
        subtitle={`${tableLabel(tableNumber)} · ${count} ${count === 1 ? "producto" : "productos"}`}
        backHref={`${basePath}/menu`}
        action={
          <HeaderIcon>
            <Utensils aria-hidden />
          </HeaderIcon>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        <h2 className="text-[27px] leading-[1.4]">{cart.length ? "¿Todo listo para pedir?" : "Tu carrito está vacío"}</h2>
        <p className="text-base text-muted">
          {cart.length ? "Revisa tus platos antes de enviarlos a cocina." : "Agrega platos desde la carta para hacer tu pedido."}
        </p>

        {cart.length > 0 && (
          <>
            <ul className="flex flex-col">
              {cart.map((line) => (
                <CartRow
                  key={line.key}
                  line={line}
                  dish={dishById.get(line.dishId)}
                  onQuantity={(q) => setQuantity(line.key, q)}
                  onRemove={() => removeLine(line.key)}
                />
              ))}
            </ul>

            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">Total</p>
              <p className="text-[27px] leading-[1.4]">{formatPrice(total)}</p>
            </div>
            <p className="text-sm text-muted">Precios en pesos chilenos · IVA incluido.</p>

            {unavailable.length > 0 && (
              <ErrorNote>
                {unavailable.map((l) => dishById.get(l.dishId)?.name ?? "Un plato").join(", ")}{" "}
                {unavailable.length === 1 ? "se agotó" : "se agotaron"}. Quítalo del carrito para enviar tu pedido.
              </ErrorNote>
            )}
            <ErrorNote>{unavailable.length === 0 && error}</ErrorNote>

            <Button onClick={sendOrder} loading={sending} disabled={unavailable.length > 0}>
              {!sending && <Send className="size-5" aria-hidden />} Enviar pedido
            </Button>
          </>
        )}

        <Link href={`${basePath}/menu`} className={buttonClasses({ variant: cart.length ? "secondary" : "primary" })}>
          {cart.length ? "Seguir explorando" : "Ver menú"}
        </Link>

        {cart.length > 0 && (
          <InfoNote title="Del carrito a la cocina">
            Con tu primer pedido, el garzón confirma la mesa; después todo llega directo a cocina. El pago se realiza fuera de
            la app.
          </InfoNote>
        )}
        <WaiterCallActions />
        <p className="text-center text-sm text-muted">El pago se realiza directamente en el restaurante.</p>
      </main>
      <ClientNav active="menu" />
    </>
  );
}

function CartRow({
  line,
  dish,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  dish: MenuDish | undefined;
  onQuantity: (q: number) => void;
  onRemove: () => void;
}) {
  const extras = dish?.dish_extras.filter((e) => line.extraIds.includes(e.id)) ?? [];
  const details = [
    ...extras.map((e) => extraLabel(e.name, e.price)),
    line.note,
    line.quantity > 1 && dish ? `${formatPrice(dish.price)} c/u` : "",
  ].filter(Boolean);
  const soldOut = !dish?.available;
  const [confirming, setConfirming] = useState(false);
  const name = dish?.name ?? "este plato";

  return (
    <li className="flex flex-col gap-2.5 border-b border-border py-3 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-base", soldOut && "text-muted line-through")}>
          {line.quantity} × {dish?.name ?? "Plato no disponible"}
        </p>
        <p className="text-base tabular-nums">{formatPrice(linePrice(line, dish))}</p>
      </div>
      {details.length > 0 && <p className="text-sm text-muted">{details.join(" · ")}</p>}
      <div className="flex items-center justify-between">
        <QuantityStepper value={line.quantity} onChange={onQuantity} label={`Cantidad de ${dish?.name ?? "plato"}`} />
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="-mr-2 flex min-h-11 cursor-pointer items-center px-2 text-sm text-primary hover:underline"
        >
          Eliminar
        </button>
      </div>
      {confirming && (
        <Modal
          open
          onClose={() => setConfirming(false)}
          icon={<Trash2 aria-hidden />}
          title={`¿Quitar ${name} del carrito?`}
          description="Puedes volver a agregarlo desde la carta."
        >
          <Button onClick={onRemove}>Sí, quitar</Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Mantener
          </Button>
        </Modal>
      )}
    </li>
  );
}
