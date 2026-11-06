"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Utensils } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DishPhoto } from "@/components/ui/DishPhoto";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format-price";
import { ClientNav } from "../ClientNav";
import { linePrice, tableLabel, useClientSession, type MenuDish } from "../ClientSessionProvider";

// Frame "Cliente · Menú"
export function MenuView() {
  const { basePath, tableNumber, categories, dishes, cart, dishById } = useClientSession();
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const visible = categoryId ? dishes.filter((d) => d.category_id === categoryId) : dishes;
  const category = categories.find((c) => c.id === categoryId);
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cart.reduce((sum, l) => sum + linePrice(l, dishById.get(l.dishId)), 0);

  return (
    <>
      <AppHeader
        title="Nuestra carta"
        subtitle={`${tableLabel(tableNumber)} · Pide a tu ritmo`}
        action={
          <HeaderIcon>
            <Utensils aria-hidden />
          </HeaderIcon>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        <div className="flex flex-wrap gap-1.75" role="tablist" aria-label="Categorías">
          {[{ id: null, name: "Todo" }, ...categories].map((c) => (
            <button
              key={c.id ?? "all"}
              type="button"
              role="tab"
              aria-selected={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                "cursor-pointer rounded-full px-3.25 py-2.5 text-sm font-semibold transition-colors",
                categoryId === c.id ? "bg-ink text-white" : "bg-surface-muted text-muted hover:text-ink",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[21px] leading-[1.4]">{category?.name ?? "Hecho para disfrutar"}</h2>
          <p className="shrink-0 pt-1 text-sm text-muted">
            {visible.length} {visible.length === 1 ? "plato" : "platos"}
          </p>
        </div>

        {visible.length === 0 ? (
          <p className="py-10 text-center text-base text-muted">No hay platos en esta categoría por ahora.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {visible.map((dish) => (
              <DishRow key={dish.id} dish={dish} href={`${basePath}/plato/${dish.id}`} />
            ))}
          </ul>
        )}

        {cartCount > 0 && (
          <Link href={`${basePath}/carrito`} className={cn(buttonClasses(), "sticky bottom-20 shadow-lg")}>
            Ver carrito · {cartCount} {cartCount === 1 ? "producto" : "productos"} · {formatPrice(cartTotal)}
          </Link>
        )}
        <p className="text-center text-xs text-muted">El pago se realiza directamente en el restaurante.</p>
      </main>
      <ClientNav active="menu" />
    </>
  );
}

function DishRow({ dish, href }: { dish: MenuDish; href: string }) {
  const content = (
    <>
      <DishPhoto
        src={dish.photo_url}
        alt=""
        className={cn("h-30.5 w-28 shrink-0", !dish.available && "opacity-40")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className={cn("text-lg font-bold", !dish.available && "text-muted")}>{dish.name}</p>
        {dish.description && <p className="line-clamp-2 text-sm text-muted">{dish.description}</p>}
        <div className="flex items-center justify-between">
          <p className="text-[15px] leading-[1.4] font-bold">{formatPrice(dish.price)}</p>
          {dish.available ? (
            <span className="flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Plus className="size-6" aria-hidden />
            </span>
          ) : (
            <Chip tone="neutral">Agotado</Chip>
          )}
        </div>
      </div>
    </>
  );

  // Un plato agotado se ve en gris y no se puede abrir para agregarlo.
  return (
    <li>
      {dish.available ? (
        <Link href={href} className="flex items-center gap-3.5" aria-label={`${dish.name}, ${formatPrice(dish.price)}. Agregar`}>
          {content}
        </Link>
      ) : (
        <div className="flex items-center gap-3.5" aria-label={`${dish.name}, agotado`}>
          {content}
        </div>
      )}
    </li>
  );
}
