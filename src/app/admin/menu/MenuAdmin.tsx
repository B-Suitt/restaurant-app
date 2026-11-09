"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, SearchX, Star, UtensilsCrossed } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { buttonClasses } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DishPhoto } from "@/components/ui/DishPhoto";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { Field, Input, Select } from "@/components/ui/Field";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { InfoNote } from "@/components/ui/InfoNote";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatPrice } from "@/lib/format-price";
import { extraLabel } from "@/lib/order-format";
import { dbErrorMessage } from "@/lib/rpc-errors";
import { matchesText } from "@/lib/search";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

async function loadDishes() {
  const supabase = createClient();
  const [categories, dishes] = await Promise.all([
    supabase.from("categories").select("id, name, sort_order, active").order("sort_order"),
    supabase
      .from("dishes")
      .select("id, category_id, name, description, price, photo_url, available, featured, sort_order, dish_extras(id, name, price, active)")
      .order("sort_order"),
  ]);
  if (categories.error || dishes.error) throw categories.error ?? dishes.error;
  const order = new Map(categories.data.map((c, i) => [c.id, i]));
  return {
    categories: categories.data,
    dishes: dishes.data.sort(
      (a, b) => (order.get(a.category_id) ?? 99) - (order.get(b.category_id) ?? 99) || a.sort_order - b.sort_order,
    ),
  };
}

type Data = Awaited<ReturnType<typeof loadDishes>>;
type Dish = Data["dishes"][number];

// Frame "Administrador · Gestión del menú"
export function MenuAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<"" | "available" | "sold_out">("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const reload = useCallback(() => {
    loadDishes()
      .then(setData)
      .catch((e) => setError(dbErrorMessage(e)));
  }, []);
  useEffect(reload, [reload]);

  const categoryById = new Map(data?.categories.map((c) => [c.id, c]));
  const matches = (d: Dish) =>
    matchesText(`${d.name} ${d.description ?? ""}`, query) &&
    (!availability || d.available === (availability === "available"));
  const visible = data?.dishes.filter((d) => matches(d) && (!categoryId || d.category_id === categoryId)) ?? [];
  const countIn = (id: string | null) => data?.dishes.filter((d) => matches(d) && (!id || d.category_id === id)).length ?? 0;

  async function toggleAvailable(dish: Dish) {
    const { error: updateError } = await createClient()
      .from("dishes")
      .update({ available: !dish.available })
      .eq("id", dish.id);
    if (updateError) setError(dbErrorMessage(updateError));
    reload();
  }

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Menú" }]} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title="Una carta que abre el apetito"
          subtitle="Gestiona platos, disponibilidad, adicionales y destacados."
          action={
            <Link href="/admin/menu/nuevo" className={buttonClasses()}>
              <Plus className="size-5" aria-hidden /> Crear plato
            </Link>
          }
        />

        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-4">
          <Field label="Buscar plato">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o ingrediente" />
          </Field>
          <Field label="Disponibilidad">
            <Select value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)}>
              <option value="">Todos los estados</option>
              <option value="available">Disponible</option>
              <option value="sold_out">Agotado</option>
            </Select>
          </Field>
          <Link href="/admin/categorias" className={buttonClasses({ variant: "secondary" })}>
            Gestionar categorías
          </Link>
        </div>

        {data && (
          <FilterTabs
            label="Categorías"
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: null, label: `Todos (${countIn(null)})` },
              ...data.categories.map((c) => ({ value: c.id, label: `${c.name} (${countIn(c.id)})` })),
            ]}
          />
        )}

        <ErrorNote>{error}</ErrorNote>

        {!data ? (
          <TableSkeleton cols={6} label="Cargando carta…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={data.dishes.length === 0 ? <UtensilsCrossed aria-hidden /> : <SearchX aria-hidden />}
            title={data.dishes.length === 0 ? "La carta está vacía" : "Sin resultados"}
          >
            {data.dishes.length === 0 ? "Crea el primer plato para que tus clientes puedan pedir." : "No hay platos con esos filtros."}
          </EmptyState>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader className="w-44">Plato</TableHeader>
                <TableHeader>Precio</TableHeader>
                <TableHeader>Disponibilidad</TableHeader>
                <TableHeader>Adicionales</TableHeader>
                <TableHeader>Destacado</TableHeader>
                <TableHeader>Acciones</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((dish) => {
                const category = categoryById.get(dish.category_id);
                return (
                  <TableRow key={dish.id}>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1.5">
                        <DishPhoto src={dish.photo_url} alt="" className="h-20 w-32.5" />
                        <p className="text-base font-bold">{dish.name}</p>
                        <p className="text-xs text-muted">
                          {category?.name}
                          {category && !category.active && " (oculta)"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-base">{formatPrice(dish.price)}</TableCell>
                    <TableCell>
                      {dish.available ? <Chip tone="success">Disponible</Chip> : <Chip tone="neutral">Agotado</Chip>}
                    </TableCell>
                    <TableCell className="text-muted">
                      {dish.dish_extras.some((e) => e.active)
                        ? dish.dish_extras.filter((e) => e.active).map((e) => extraLabel(e.name, e.price)).join(" · ")
                        : "Sin adicionales"}
                    </TableCell>
                    <TableCell>
                      {dish.featured ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 fill-current" aria-hidden /> Destacado
                        </span>
                      ) : (
                        "No destacado"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2.5">
                        <Link href={`/admin/menu/${dish.id}`} className="text-base text-primary hover:underline">
                          Editar plato
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleAvailable(dish)}
                          className="cursor-pointer text-md text-muted hover:text-ink hover:underline"
                        >
                          {dish.available ? "Marcar agotado" : "Marcar disponible"}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <InfoNote plain title="Disponibilidad visible al instante">
          Un plato agotado sigue en la carta en gris, pero no puede agregarse a nuevos pedidos. Los pedidos existentes se
          conservan.
        </InfoNote>
      </main>
    </>
  );
}
