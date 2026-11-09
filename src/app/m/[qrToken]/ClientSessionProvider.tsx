"use client";

import { useRouter } from "next/navigation";
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
  /**
   * Mensaje para un error de RPC. Si sugiere que la mesa se cerró (forbidden / session_not_open),
   * lo comprueba y, de ser así, muestra la pantalla de mesa cerrada.
   */
  rpcError: (error: { message?: string }) => string;
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

/** Página a la que va el cliente cuando su mesa se cierra. */
const THANKS_PATH = "/gracias";

/** Sesión de la última estadía de este celular en la mesa: permite reconocer una recarga después del cierre. */
const visitKey = (qrToken: string) => `visit:${qrToken}`;

function readVisit(qrToken: string) {
  try {
    return localStorage.getItem(visitKey(qrToken));
  } catch {
    return null;
  }
}

function saveVisit(qrToken: string, sessionId: string) {
  try {
    localStorage.setItem(visitKey(qrToken), sessionId);
  } catch {
    // Navegación privada o almacenamiento bloqueado: se comporta como un escaneo.
  }
}

/** El QR impreso lleva `?scan=1`. Se quita al entrar para que una recarga no cuente como escaneo. */
function consumeScanMark() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("scan")) return false;
  url.searchParams.delete("scan");
  window.history.replaceState(null, "", url);
  return true;
}

// Una sola entrada por QR aunque React monte el efecto dos veces en desarrollo.
const joins = new Map<string, Promise<SessionData | null>>();

/** Entra a la mesa. Devuelve `null` si este celular vuelve a una estadía que ya terminó. */
function joinTable(qrToken: string) {
  let promise = joins.get(qrToken);
  if (!promise) {
    promise = (async (): Promise<SessionData | null> => {
      const scanned = consumeScanMark();
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }

      // Recargar después del cierre no abre otra estadía: hay que volver a escanear.
      const visit = scanned ? null : readVisit(qrToken);
      if (visit && !(await isSessionOpen(visit))) return null;

      const { data: sessionId, error } = await supabase.rpc("join_table", { p_qr_token: qrToken });
      if (error) throw error;

      const [session, menu] = await Promise.all([
        supabase.from("table_sessions").select("tables(number, zone)").eq("id", sessionId).single(),
        loadMenu(),
      ]);
      if (session.error) throw session.error;
      saveVisit(qrToken, sessionId);
      return {
        sessionId,
        tableNumber: session.data.tables.number,
        zone: session.data.tables.zone,
        ...menu,
      };
    })();
    joins.set(qrToken, promise);
    promise.catch(() => joins.delete(qrToken)); // permite reintentar
  }
  return promise;
}

const cartKey = (sessionId: string) => `cart:${sessionId}`;

/** Cada cuánto se comprueba que la mesa siga abierta (Realtime no avisa: al cerrarse, RLS deja de mostrarla). */
const SESSION_CHECK_MS = 30_000;

/** La sesión sigue abierta si el cliente todavía puede leerla (RLS solo muestra sesiones abiertas). */
async function isSessionOpen(sessionId: string) {
  const { data, error } = await createClient().from("table_sessions").select("id").eq("id", sessionId);
  return error ? true : data.length > 0; // ante un error de red, no asumir que se cerró
}

export function ClientSessionProvider({ qrToken, children }: { qrToken: string; children: ReactNode }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [closed, setClosed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    joinTable(qrToken)
      .then((session) => {
        if (!session) {
          router.replace(THANKS_PATH);
          return;
        }
        setData(session);
        try {
          setCart(JSON.parse(localStorage.getItem(cartKey(session.sessionId)) ?? "[]"));
        } catch {
          setCart([]);
        }
      })
      .catch((e: { message?: string }) => setError(e.message ?? "error"));
  }, [qrToken, router]);

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

  // Detecta el cierre de la mesa: cada cierto tiempo y al volver a la pestaña.
  const checkSession = useCallback(async () => {
    if (!sessionId) return;
    if (await isSessionOpen(sessionId)) return;
    setClosed(true);
    try {
      localStorage.removeItem(cartKey(sessionId));
    } catch {
      // Sin almacenamiento: nada que limpiar.
    }
    joins.delete(qrToken); // al volver atrás debe comprobar la estadía, no reusar la entrada guardada
    router.replace(THANKS_PATH);
  }, [sessionId, qrToken, router]);
  useEffect(() => {
    if (!sessionId || closed) return;
    const id = setInterval(checkSession, SESSION_CHECK_MS);
    const onVisible = () => document.visibilityState === "visible" && checkSession();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkSession);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkSession);
    };
  }, [sessionId, closed, checkSession]);

  const rpcError = useCallback(
    (error: { message?: string }) => {
      if (error.message === "forbidden" || error.message === "session_not_open") checkSession();
      return errorMessage(error);
    },
    [checkSession],
  );

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
      rpcError,
    };
  }, [data, qrToken, cart, addToCart, setQuantity, removeLine, clearCart, refreshMenu, rpcError]);

  if (error) return <InvalidQrScreen message={errorMessage({ message: error })} />;
  if (closed) return null; // ya va camino a la página de agradecimiento
  if (!value) return <LoadingScreen />;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
