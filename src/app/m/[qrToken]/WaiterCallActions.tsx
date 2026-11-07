"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BellRing, ReceiptText } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { formatPrice } from "@/lib/format-price";
import { loadSessionOrders, sessionTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { tableLabel, useClientSession } from "./ClientSessionProvider";

type CallType = "call" | "bill";

/**
 * Botones "Llamar al garzón" y "Pedir la cuenta" con sus modales de confirmación.
 * `layout="pair"`: dos botones secundarios lado a lado (menú, carrito, pedidos).
 * `layout="bill-first"`: "Pedir la cuenta" destacado y "Llamar al garzón" debajo (cuenta).
 */
export function WaiterCallActions({ layout = "pair" }: { layout?: "pair" | "bill-first" }) {
  const { sessionId, tableNumber, basePath, rpcError } = useClientSession();
  const pathname = usePathname();
  const [busy, setBusy] = useState<CallType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<CallType | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  async function send(type: CallType) {
    setBusy(type);
    setError(null);
    const supabase = createClient();
    // Un llamado pendiente del mismo tipo no se duplica: la función devuelve el existente.
    const [call, orders] = await Promise.all([
      supabase.rpc("call_waiter", { p_session_id: sessionId, p_type: type }),
      type === "bill" ? loadSessionOrders(sessionId).catch(() => null) : null,
    ]);
    setBusy(null);
    if (call.error) {
      setError(rpcError(call.error));
      return;
    }
    setTotal(orders ? sessionTotal(orders) : null);
    setOpen(type);
  }

  const table = tableLabel(tableNumber).toLowerCase();
  const close = () => setOpen(null);
  const callButton = (
    <Button variant="secondary" onClick={() => send("call")} loading={busy === "call"} disabled={busy !== null}>
      Llamar al garzón
    </Button>
  );

  return (
    <>
      {layout === "pair" ? (
        <div className="grid grid-cols-2 gap-2.5">
          {callButton}
          <Button variant="secondary" onClick={() => send("bill")} loading={busy === "bill"} disabled={busy !== null}>
            Pedir la cuenta
          </Button>
        </div>
      ) : (
        <>
          <Button onClick={() => send("bill")} loading={busy === "bill"} disabled={busy !== null}>
            {busy !== "bill" && <ReceiptText className="size-5" aria-hidden />} Pedir la cuenta
          </Button>
          {callButton}
        </>
      )}
      {error && (
        <p role="alert" className="text-center text-sm text-primary">
          {error}
        </p>
      )}

      {/* Frame "Cliente · Modal Llamar al garzón" */}
      <Modal
        open={open === "call"}
        onClose={close}
        icon={<BellRing aria-hidden />}
        title="Tu garzón está avisado"
        description={`Enviamos tu solicitud al equipo de sala. En un momento se acercará a la ${table} para ayudarte.`}
      >
        <Chip tone="warning">Llamando</Chip>
        <Button onClick={close}>Entendido</Button>
        <BackLink href={`${basePath}/pedido`} current={pathname} onClose={close}>
          Volver a mis pedidos
        </BackLink>
      </Modal>

      {/* Frame "Cliente · Modal Pedir la cuenta" */}
      <Modal
        open={open === "bill"}
        onClose={close}
        icon={<ReceiptText aria-hidden />}
        title="Ya pedimos tu cuenta"
        description={`Tu garzón llevará la cuenta a la ${table}. El pago se realiza directamente en el restaurante.`}
      >
        <Chip tone="accent">Pidiendo la cuenta</Chip>
        {total !== null && (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-bold">Consumo</p>
              <p className="text-2xl">{formatPrice(total)}</p>
            </div>
            <p className="text-sm text-muted">Sin cobro en la app. Propina no incluida.</p>
          </div>
        )}
        <Button onClick={close}>Entendido</Button>
        <BackLink href={`${basePath}/cuenta`} current={pathname} onClose={close}>
          Volver a la cuenta
        </BackLink>
      </Modal>
    </>
  );
}

/** Botón secundario del modal: si ya estamos en esa pantalla, solo cierra. */
function BackLink({
  href,
  current,
  onClose,
  children,
}: {
  href: string;
  current: string;
  onClose: () => void;
  children: string;
}) {
  if (decodeURIComponent(current) === decodeURIComponent(href)) {
    return (
      <Button variant="secondary" onClick={onClose}>
        {children}
      </Button>
    );
  }
  return (
    <Link href={href} className={buttonClasses({ variant: "secondary" })}>
      {children}
    </Link>
  );
}
