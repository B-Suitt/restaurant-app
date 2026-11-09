"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, Layers, Plus } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { InfoNote } from "@/components/ui/InfoNote";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { cn } from "@/lib/cn";
import { dbErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type Category = { id: string; name: string; description: string | null; active: boolean; dishCount: number };

async function loadCategories(): Promise<Category[]> {
  const { data, error } = await createClient()
    .from("categories")
    .select("id, name, description, active, sort_order, dishes(count)")
    .order("sort_order");
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    active: c.active,
    dishCount: c.dishes[0]?.count ?? 0,
  }));
}

/** Guarda el orden de la lista: posición 1, 2, 3… */
async function saveOrder(ids: string[]) {
  const supabase = createClient();
  const results = await Promise.all(ids.map((id, i) => supabase.from("categories").update({ sort_order: i + 1 }).eq("id", id)));
  return results.find((r) => r.error)?.error ?? null;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Frame "Administrador · Categorías"
export function CategoriesAdmin() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [position, setPosition] = useState(1);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"order" | "form" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    loadCategories()
      .then((data) => {
        setItems(data);
        setSavedOrder(data.map((c) => c.id));
      })
      .catch((e) => setError(dbErrorMessage(e)));
  }, []);
  useEffect(reload, [reload]);

  const dirty = items !== null && items.map((c) => c.id).join() !== savedOrder.join();
  const totalDishes = items?.reduce((sum, c) => sum + c.dishCount, 0) ?? 0;
  const current = items?.find((c) => c.id === selected);

  function select(category: Category | "new") {
    setError(null);
    if (category === "new") {
      setSelected("new");
      setName("");
      setDescription("");
      setActive(true);
      setPosition((items?.length ?? 0) + 1);
    } else {
      setSelected(category.id);
      setName(category.name);
      setDescription(category.description ?? "");
      setActive(category.active);
      setPosition((items?.indexOf(category) ?? 0) + 1);
    }
  }

  function move(id: string, to: number) {
    setItems((all) => {
      if (!all) return all;
      const from = all.findIndex((c) => c.id === id);
      if (from < 0 || to < 0 || to >= all.length) return all;
      const next = [...all];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  async function persistOrder() {
    if (!items) return;
    setBusy("order");
    const err = await saveOrder(items.map((c) => c.id));
    setBusy(null);
    if (err) return setError(dbErrorMessage(err));
    setSavedOrder(items.map((c) => c.id));
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!items || !selected) return;
    if (!name.trim()) return setError("Indica el nombre de la categoría.");
    setBusy("form");
    setError(null);
    const supabase = createClient();
    const values = { name: name.trim(), description: description.trim() || null, active };
    const saved =
      selected === "new"
        ? await supabase.from("categories").insert({ ...values, sort_order: items.length + 1 }).select("id").single()
        : await supabase.from("categories").update(values).eq("id", selected).select("id").single();
    if (saved.error) {
      setBusy(null);
      return setError(dbErrorMessage(saved.error));
    }
    // Ubica la categoría en la posición elegida y guarda el orden completo.
    const ids = items.map((c) => c.id).filter((id) => id !== saved.data.id);
    ids.splice(Math.min(position - 1, ids.length), 0, saved.data.id);
    const orderError = await saveOrder(ids);
    setBusy(null);
    if (orderError) return setError(dbErrorMessage(orderError));
    setSelected(null);
    reload();
  }

  async function remove() {
    if (!current) return;
    if (!window.confirm(`¿Eliminar la categoría ${current.name}?`)) return;
    setBusy("delete");
    const { error: deleteError } = await createClient().from("categories").delete().eq("id", current.id);
    setBusy(null);
    if (deleteError) return setError(dbErrorMessage(deleteError, { inUse: "La categoría tiene platos: muévelos antes de eliminarla." }));
    setSelected(null);
    reload();
  }

  const positions = (items?.length ?? 0) + (selected === "new" ? 1 : 0);

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Categorías" }]} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title="Categorías de la carta"
          subtitle="Agrupa tus platos y define el orden en que se muestran al cliente."
          action={
            <Button onClick={() => select("new")}>
              <Plus className="size-5" aria-hidden /> Agregar categoría
            </Button>
          }
        />

        {!items ? (
          <TableSkeleton rows={4} cols={4} label="Cargando categorías…" />
        ) : (
          <div className="grid grid-cols-[1fr_400px] items-start gap-6">
            <div className="flex flex-col gap-6">
              {items.length === 0 ? (
                <EmptyState icon={<Layers aria-hidden />} title="Aún no hay categorías">
                  Agrega la primera para empezar a armar la carta.
                </EmptyState>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Orden</TableHeader>
                      <TableHeader>Categoría</TableHeader>
                      <TableHeader>Platos</TableHeader>
                      <TableHeader>Acciones</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((c, i) => (
                      <TableRow
                        key={c.id}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => setDragId(null)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragId && dragId !== c.id) move(dragId, i);
                        }}
                        className={cn(dragId === c.id && "opacity-50", selected === c.id && "bg-surface-subtle")}
                      >
                        <TableCell>
                          <span className="flex items-center gap-3 text-base">
                            <GripVertical className="size-4 cursor-grab text-muted" aria-hidden />
                            {pad(i + 1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-base">
                          <span className="flex items-center gap-2">
                            {c.name}
                            {!c.active && <Chip tone="neutral">Oculta</Chip>}
                          </span>
                        </TableCell>
                        <TableCell className="text-base">
                          {c.dishCount} {c.dishCount === 1 ? "plato" : "platos"}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm text-primary">
                            <button type="button" className="cursor-pointer hover:underline" onClick={() => select(c)}>
                              Editar
                            </button>
                            ·
                            <button
                              type="button"
                              aria-label={`Subir ${c.name}`}
                              disabled={i === 0}
                              onClick={() => move(c.id, i - 1)}
                              className="cursor-pointer disabled:cursor-default disabled:text-subtle"
                            >
                              <ArrowUp className="size-3.5" aria-hidden />
                            </button>
                            ·
                            <button
                              type="button"
                              aria-label={`Bajar ${c.name}`}
                              disabled={i === items.length - 1}
                              onClick={() => move(c.id, i + 1)}
                              className="cursor-pointer disabled:cursor-default disabled:text-subtle"
                            >
                              <ArrowDown className="size-3.5" aria-hidden />
                            </button>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <InfoNote plain title="El orden también es parte del servicio">
                Arrastra las categorías o usa las flechas para organizar la carta. Los platos conservan su categoría al reordenar.
              </InfoNote>
              <ErrorNote>{!selected && error}</ErrorNote>
              <div className="flex items-center gap-3">
                <Button onClick={persistOrder} loading={busy === "order"} disabled={!dirty}>
                  Guardar orden
                </Button>
                {dirty && (
                  <button type="button" className="cursor-pointer text-sm text-muted hover:underline" onClick={reload}>
                    Descartar cambios
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {selected ? (
                <Card className="p-6">
                  <form onSubmit={saveCategory} noValidate className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-bold">{selected === "new" ? "Nueva categoría" : "Editar categoría"}</h2>
                      {current && <p className="text-sm text-muted">Seleccionada: {current.name}</p>}
                    </div>
                    <Field label="Nombre *">
                      <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
                    </Field>
                    <Field label="Descripción">
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={140} />
                    </Field>
                    <Field label="Posición en la carta">
                      <Select value={position} onChange={(e) => setPosition(Number(e.target.value))}>
                        {Array.from({ length: positions }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <ToggleRow label="Visible en la carta" checked={active} onChange={setActive} onLabel="Visible" offLabel="Oculta" />
                    <ErrorNote>{error}</ErrorNote>
                    <Button type="submit" loading={busy === "form"}>
                      Guardar categoría
                    </Button>
                    <Button variant="secondary" onClick={() => setSelected(null)}>
                      Cancelar
                    </Button>
                    {current && current.dishCount === 0 && (
                      <button
                        type="button"
                        onClick={remove}
                        disabled={busy !== null}
                        className="cursor-pointer text-sm text-primary hover:underline"
                      >
                        Eliminar categoría
                      </button>
                    )}
                  </form>
                </Card>
              ) : (
                <Card className="flex flex-col gap-2 p-6">
                  <h2 className="text-xl font-bold">Editar categoría</h2>
                  <p className="text-sm text-muted">Elige una categoría de la lista o agrega una nueva.</p>
                </Card>
              )}
              <p className="text-sm text-muted">
                {items.length} {items.length === 1 ? "categoría" : "categorías"} · {totalDishes}{" "}
                {totalDishes === 1 ? "plato" : "platos"} en total
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
