"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DishPhoto } from "@/components/ui/DishPhoto";
import { Field, Input } from "@/components/ui/Field";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format-price";
import { loadMenu, type MenuCategory, type MenuDish } from "@/lib/menu";
import { tableLabel } from "@/lib/order-format";
import { errorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { WaiterNav } from "../../../WaiterNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { DishListSkeleton } from "@/components/ui/Skeleton";
import { SearchX } from "lucide-react";

/** Texto sin mayúsculas ni tildes, para buscar "limon" y encontrar "Limón". */
const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Frame "Garzón · Agregar pedido"
export function AddOrder({ tableId }: { tableId: string }) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ categories: MenuCategory[]; dishes: MenuDish[] } | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadMenu(), createClient().from("tables").select("number").eq("id", tableId).single()])
      .then(([m, table]) => {
        if (table.error) throw table.error;
        setMenu(m);
        setTableNumber(table.data.number);
      })
      .catch((e: { message?: string }) => setLoadError(errorMessage(e)));
  }, [tableId]);

  const dishById = new Map(menu?.dishes.map((d) => [d.id, d]));
  const visible =
    menu?.dishes.filter(
      (d) =>
        (!categoryId || d.category_id === categoryId) &&
        (!query.trim() || normalize(`${d.name} ${d.description ?? ""}`).includes(normalize(query.trim()))),
    ) ?? [];
  const lines = Object.entries(quantities)
    .filter(([, q]) => q > 0)
    .map(([dishId, quantity]) => ({ dish: dishById.get(dishId)!, quantity }))
    .filter((l) => l.dish);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.dish.price * l.quantity, 0);

  async function send() {
    setSending(true);
    setError(null);
    const supabase = createClient();
    // Abre la mesa si estaba libre o devuelve la sesión abierta.
    const session = await supabase.rpc("open_table", { p_table_id: tableId });
    const order = session.error
      ? session
      : await supabase.rpc("place_order", {
          p_session_id: session.data,
          p_items: lines.map((l) => ({ dish_id: l.dish.id, quantity: l.quantity, note: note.trim(), extra_ids: [] })),
        });
    setSending(false);
    if (order.error) {
      setError(errorMessage(order.error));
      // Si un plato se agotó, la carta se actualiza para mostrarlo en gris.
      if (order.error.message === "dish_unavailable") loadMenu().then(setMenu).catch(() => {});
      return;
    }
    router.push(`/garzon/mesas/${tableId}`);
  }

  const label = tableNumber ? tableLabel(tableNumber) : "Mesa";

  return (
    <>
      <AppHeader
        title="Agregar pedido"
        subtitle={`${label} · Pedido asistido`}
        backHref={`/garzon/mesas/${tableId}`}
        action={
          <SignOutButton>
            <HeaderIcon>
              <UserRound aria-hidden />
            </HeaderIcon>
          </SignOutButton>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        {loadError ? (
          <p role="alert" className="rounded-sm bg-danger-bg p-3 text-md text-danger-fg">
            {loadError}
          </p>
        ) : !menu ? (
          <DishListSkeleton />
        ) : (
          <>
            <Field label="Buscar en la carta">
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar plato o ingrediente"
              />
            </Field>
            <FilterTabs
              label="Categorías"
              value={categoryId}
              onChange={setCategoryId}
              options={[{ value: null, label: "Todo" }, ...menu.categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <h2 className="text-[21px] leading-[1.4]">¿Qué desea la mesa?</h2>

            {visible.length === 0 ? (
              <EmptyState icon={<SearchX aria-hidden />} title="Sin resultados">
                No encontramos platos con esa búsqueda.
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {visible.map((dish) => (
                  <li key={dish.id} className="flex items-center gap-3">
                    <DishPhoto src={dish.photo_url} alt="" className={cn("size-21.5 shrink-0", !dish.available && "opacity-40")} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className={cn("text-base font-bold", !dish.available && "text-muted")}>{dish.name}</p>
                      {dish.description && <p className="truncate text-sm text-muted">{dish.description}</p>}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <p className="text-base">{formatPrice(dish.price)}</p>
                        {dish.available ? (
                          <QuantityStepper
                            min={0}
                            value={quantities[dish.id] ?? 0}
                            onChange={(q) => setQuantities((current) => ({ ...current, [dish.id]: q }))}
                            label={`Cantidad de ${dish.name}`}
                          />
                        ) : (
                          <Chip tone="neutral">Agotado</Chip>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {count > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4">
                <p className="text-base font-bold">
                  Nuevo pedido · {count} {count === 1 ? "producto" : "productos"}
                </p>
                <ul className="text-sm text-muted">
                  {lines.map((l) => (
                    <li key={l.dish.id}>
                      {l.quantity} × {l.dish.name}
                    </li>
                  ))}
                </ul>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-lg font-bold">Total a agregar</p>
                  <p className="text-2xl">{formatPrice(total)}</p>
                </div>
              </div>
            )}

            <Field label="Nota del pedido" hint={count > 0 && note.trim() ? "Se aplica a cada plato del pedido." : undefined}>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sin notas" maxLength={200} />
            </Field>

            {error && (
              <p role="alert" className="rounded-sm bg-danger-bg p-3 text-md text-danger-fg">
                {error}
              </p>
            )}
            <Button onClick={send} loading={sending} disabled={count === 0}>
              {count === 0 ? "Elige al menos un plato" : `Enviar a cocina · ${formatPrice(total)}`}
            </Button>
            <p className="text-sm text-muted">Se agregará un nuevo pedido a la estadía actual.</p>
          </>
        )}
      </main>
      <WaiterNav active="mesas" />
    </>
  );
}
