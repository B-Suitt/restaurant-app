"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Utensils } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { Button, buttonClasses } from "@/components/ui/Button";
import { InfoNote } from "@/components/ui/InfoNote";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format-price";
import { createClient } from "@/lib/supabase/client";
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
    const { error: placeError } = await createClient().rpc("place_order", {
      p_session_id: sessionId,
      p_items: cart.map((l) => ({ dish_id: l.dishId, quantity: l.quantity, note: l.note, extra_ids: l.extraIds })),
    });
    if (placeError) {
      setSending(false);
      if (placeError.message === "dish_unavailable") await refreshMenu().catch(() => {});
      setError(rpcError(placeError));
      return;
    }
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
              <p role="alert" className="rounded-sm bg-danger-bg p-3 text-md text-danger-fg">
                {unavailable.map((l) => dishById.get(l.dishId)?.name ?? "Un plato").join(", ")}{" "}
                {unavailable.length === 1 ? "se agotó" : "se agotaron"}. Quítalo del carrito para enviar tu pedido.
              </p>
            )}
            {error && unavailable.length === 0 && (
              <p role="alert" className="rounded-sm bg-danger-bg p-3 text-md text-danger-fg">
                {error}
              </p>
            )}

            <Button onClick={sendOrder} loading={sending} disabled={unavailable.length > 0}>
              {!sending && <Send className="size-5" aria-hidden />} Enviar pedido
            </Button>
          </>
        )}

        <Link href={`${basePath}/menu`} className={buttonClasses({ variant: cart.length ? "secondary" : "primary" })}>
          {cart.length ? "Seguir explorando" : "Ver menú"}
        </Link>

        {cart.length > 0 && (
          <InfoNote title="Un pedido, directo a cocina">
            Tu garzón también recibirá el pedido. El pago se realiza fuera de la app.
          </InfoNote>
        )}
        <WaiterCallActions />
        <p className="text-center text-xs text-muted">El pago se realiza directamente en el restaurante.</p>
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
    ...extras.map((e) => (e.price > 0 ? `${e.name} +${formatPrice(e.price)}` : e.name)),
    line.note,
    line.quantity > 1 && dish ? `${formatPrice(dish.price)} c/u` : "",
  ].filter(Boolean);
  const soldOut = !dish?.available;

  return (
    <li className="flex flex-col gap-2.5 border-b border-border py-3 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-base", soldOut && "text-muted line-through")}>
          {line.quantity} × {dish?.name ?? "Plato no disponible"}
        </p>
        <p className="text-base">{formatPrice(linePrice(line, dish))}</p>
      </div>
      {details.length > 0 && <p className="text-sm text-muted">{details.join(" · ")}</p>}
      <div className="flex items-center justify-between">
        <QuantityStepper value={line.quantity} onChange={onQuantity} label={`Cantidad de ${dish?.name ?? "plato"}`} />
        <button type="button" onClick={onRemove} className="cursor-pointer text-sm text-primary hover:underline">
          Eliminar
        </button>
      </div>
    </li>
  );
}
