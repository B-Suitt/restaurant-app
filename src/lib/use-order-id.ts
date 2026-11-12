"use client";

import { useRef } from "react";

/** UUID v4. `crypto.randomUUID` solo existe en HTTPS; en la red local (celular contra `npm run dev`) se arma a mano. */
function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Id del pedido que se va a enviar: el mismo mientras los platos no cambien.
 * Si la respuesta se pierde y la persona reintenta, la base reconoce el id y no duplica el pedido.
 */
export function useOrderId() {
  const current = useRef<{ key: string; id: string } | null>(null);
  return {
    idFor(items: unknown) {
      const key = JSON.stringify(items);
      if (current.current?.key !== key) current.current = { key, id: randomId() };
      return current.current.id;
    },
    /** Tras un envío exitoso: el próximo pedido, aunque tenga los mismos platos, es otro. */
    reset() {
      current.current = null;
    },
  };
}
