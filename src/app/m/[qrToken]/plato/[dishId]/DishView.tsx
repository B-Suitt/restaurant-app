"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Utensils } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { DishPhoto } from "@/components/ui/DishPhoto";
import { Field, Textarea } from "@/components/ui/Field";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatPrice } from "@/lib/format-price";
import { ClientNav } from "../../ClientNav";
import { linePrice, tableLabel, useClientSession } from "../../ClientSessionProvider";

// Frame "Cliente · Detalle de plato"
export function DishView() {
  const { dishId } = useParams<{ dishId: string }>();
  const router = useRouter();
  const { basePath, tableNumber, dishById, categoryById, addToCart } = useClientSession();
  const dish = dishById.get(dishId);

  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  if (!dish) {
    return (
      <>
        <AppHeader title="Detalle del plato" backHref={`${basePath}/menu`} />
        <main className="flex-1 p-5 text-base text-muted">Este plato ya no está en la carta.</main>
        <ClientNav active="menu" />
      </>
    );
  }

  const total = linePrice({ key: "", dishId: dish.id, quantity, note, extraIds }, dish);
  const toggleExtra = (id: string) =>
    setExtraIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <>
      <AppHeader
        title="Detalle del plato"
        subtitle={`${tableLabel(tableNumber)} · ${categoryById.get(dish.category_id)?.name ?? ""}`}
        backHref={`${basePath}/menu`}
        action={
          <HeaderIcon>
            <Utensils aria-hidden />
          </HeaderIcon>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        <DishPhoto
          src={dish.photo_url}
          alt={dish.name}
          width={350}
          height={255}
          priority
          className="aspect-[350/255] w-full"
        />
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-2xl break-words">{dish.name}</h2>
          <p className="shrink-0 text-xl">{formatPrice(dish.price)}</p>
        </div>
        {dish.description && <p className="text-base text-muted">{dish.description}</p>}

        {dish.dish_extras.length > 0 && (
          <fieldset className="flex flex-col gap-3 border-t border-border pt-4.5">
            <legend className="sr-only">Adicionales</legend>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">Hazla a tu gusto</p>
              <p className="text-sm text-muted">Opcional</p>
            </div>
            {dish.dish_extras.map((extra) => (
              <label key={extra.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
                <input
                  type="checkbox"
                  checked={extraIds.includes(extra.id)}
                  onChange={() => toggleExtra(extra.id)}
                  className="size-5 accent-muted"
                />
                <span className="flex-1">{extra.name}</span>
                <span>{extra.price > 0 ? `+${formatPrice(extra.price)}` : "Sin costo"}</span>
              </label>
            ))}
          </fieldset>
        )}

        <Field label="Nota para cocina" hint="Cuéntanos si necesitas algún ajuste.">
          <Textarea
            name="note"
            autoComplete="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Ej.: sin cebolla…"
          />
        </Field>

        <div className="flex items-center justify-between">
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <p className="text-2xl">{formatPrice(total)}</p>
        </div>

        <Button
          className="sticky bottom-[calc(4.5rem+max(0.5rem,env(safe-area-inset-bottom)))] shadow-lg"
          disabled={!dish.available}
          onClick={() => {
            addToCart({ dishId: dish.id, quantity, note, extraIds });
            router.push(`${basePath}/menu`);
          }}
        >
          {dish.available ? `Agregar al carrito · ${formatPrice(total)}` : "Agotado"}
        </Button>
      </main>
      <ClientNav active="menu" />
    </>
  );
}
