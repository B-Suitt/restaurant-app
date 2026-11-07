"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/rpc-errors";
import { loadMenu, type MenuCategory, type MenuDish } from "@/lib/menu";
export type { MenuCategory, MenuDish, MenuExtra } from "@/lib/menu";
export { tableLabel } from "@/lib/order-format";
import { InvalidQrScreen, LoadingScreen } from "./ClientScreens";

export type CartLine = { key: string; dishId: string; quantity: number; note: string; extraIds: string[] };

type SessionData = {
  sessionId: string;
  tableNumber: number;
  zone: string;
  guestCount: number | null;
  categories: MenuCategory[];
  dishes: MenuDish[];
};

type ClientSession = SessionData & {
  basePath: string;
  dishById: Map<string, MenuDish>;
  categoryById: Map<string, MenuCategory>;
  cart: CartLine[];
  addToCart: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  /** Vuelve a leer la carta (p. ej. para detectar platos agotados antes de enviar). */
  refreshMenu: () => Promise<void>;
};

const Context = createContext<ClientSession | null>(null);

export function useClientSession() {
  const value = useContext(Context);
  if (!value) throw new Error("useClientSession fuera de ClientSessionProvider");
  return value;
}

/** Precio de una línea del carrito con sus adicionales. */
export function linePrice(line: CartLine, dish: MenuDish | undefined) {
  if (!dish) return 0;
  const extras = dish.dish_extras.filter((e) => line.extraIds.includes(e.id)).reduce((sum, e) => sum + e.price, 0);
  return (dish.price + extras) * line.quantity;
}

// Una sola entrada por QR aunque React monte el efecto dos veces en desarrollo.
const joins = new Map<string, Promise<SessionData>>();

function joinTable(qrToken: string) {
  let promise = joins.get(qrToken);
  if (!promise) {
    promise = (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
      const { data: sessionId, error } = await supabase.rpc("join_table", { p_qr_token: qrToken });
      if (error) throw error;

      const [session, menu] = await Promise.all([
        supabase.from("table_sessions").select("guest_count, tables(number, zone)").eq("id", sessionId).single(),
        loadMenu(),
      ]);
      if (session.error) throw session.error;
      return {
        sessionId,
        tableNumber: session.data.tables.number,
        zone: session.data.tables.zone,
        guestCount: session.data.guest_count,
        ...menu,
      };
    })();
    joins.set(qrToken, promise);
    promise.catch(() => joins.delete(qrToken)); // permite reintentar
  }
  return promise;
}

const cartKey = (sessionId: string) => `cart:${sessionId}`;

export function ClientSessionProvider({ qrToken, children }: { qrToken: string; children: ReactNode }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    joinTable(qrToken)
      .then((session) => {
        setData(session);
        try {
          setCart(JSON.parse(localStorage.getItem(cartKey(session.sessionId)) ?? "[]"));
        } catch {
          setCart([]);
        }
      })
      .catch((e: { message?: string }) => setError(e.message ?? "error"));
  }, [qrToken]);

  // Guarda el carrito en el navegador (sobrevive a recargas, no se comparte entre celulares).
  const sessionId = data?.sessionId;
  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(cartKey(sessionId), JSON.stringify(cart));
    } catch {
      // Navegación privada o almacenamiento bloqueado: el carrito vive solo en memoria.
    }
  }, [cart, sessionId]);

  const addToCart = useCallback((line: Omit<CartLine, "key">) => {
    const key = [line.dishId, [...line.extraIds].sort().join("+"), line.note.trim()].join("|");
    setCart((current) => {
      const existing = current.find((l) => l.key === key);
      if (existing) {
        return current.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l));
      }
      return [...current, { ...line, note: line.note.trim(), key }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setCart((current) => current.map((l) => (l.key === key ? { ...l, quantity } : l)));
  }, []);
  const removeLine = useCallback((key: string) => setCart((current) => current.filter((l) => l.key !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const refreshMenu = useCallback(async () => {
    const menu = await loadMenu();
    setData((current) => (current ? { ...current, ...menu } : current));
  }, []);

  const value = useMemo<ClientSession | null>(() => {
    if (!data) return null;
    return {
      ...data,
      basePath: `/m/${encodeURIComponent(qrToken)}`,
      dishById: new Map(data.dishes.map((d) => [d.id, d])),
      categoryById: new Map(data.categories.map((c) => [c.id, c])),
      cart,
      addToCart,
      setQuantity,
      removeLine,
      clearCart,
      refreshMenu,
    };
  }, [data, qrToken, cart, addToCart, setQuantity, removeLine, clearCart, refreshMenu]);

  if (error) return <InvalidQrScreen message={errorMessage({ message: error })} />;
  if (!value) return <LoadingScreen />;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
