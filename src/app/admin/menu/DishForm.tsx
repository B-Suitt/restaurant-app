"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DishPhoto } from "@/components/ui/DishPhoto";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormActions } from "@/components/ui/FormActions";
import { LinkNotice } from "@/components/ui/LinkNotice";
import { PriceInput } from "@/components/ui/PriceInput";
import { dbErrorMessage, isLoadFailure } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

const BUCKET = "dish-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // igual que el límite del bucket
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ExtraRow = { key: string; id: string | null; name: string; price: number | null };
type Category = { id: string; name: string };

let extraKey = 0;
const newExtra = (): ExtraRow => ({ key: `new-${extraKey++}`, id: null, name: "", price: null });

// Frame "Administrador · Editar plato" (también para crear uno nuevo)
export function DishForm({ dishId }: { dishId: string | null }) {
  const router = useRouter();
  // Si al crear falla un paso posterior (foto, adicionales), el reintento edita el plato ya creado.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const savedId = dishId ?? createdId;
  const isNew = dishId === null;
  const fileInput = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [extras, setExtras] = useState<ExtraRow[]>([]);
  const [originalExtraIds, setOriginalExtraIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Un plato que ya se pidió no se puede eliminar (lo referencia el historial): solo marcarlo agotado.
  const [ordered, setOrdered] = useState<boolean | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [cats, dish, orderedItems] = await Promise.all([
        supabase.from("categories").select("id, name").order("sort_order"),
        dishId
          ? supabase
              .from("dishes")
              .select("name, category_id, description, price, available, featured, photo_url, dish_extras(id, name, price, active)")
              .eq("id", dishId)
              .maybeSingle()
          : null,
        dishId ? supabase.from("order_items").select("id", { count: "exact", head: true }).eq("dish_id", dishId) : null,
      ]);
      if (cats.error || isLoadFailure(dish?.error)) return setLoadFailed(true);
      setOrdered(orderedItems ? (orderedItems.count ?? 1) > 0 : null);
      if (dish) {
        if (!dish.data) return setNotFound(true);
        const d = dish.data;
        setName(d.name);
        setCategoryId(d.category_id);
        setDescription(d.description ?? "");
        setPrice(d.price);
        setAvailable(d.available);
        setFeatured(d.featured);
        setPhotoUrl(d.photo_url);
        // Los retirados no se muestran: para la carta ya no existen.
        const current = d.dish_extras.filter((e) => e.active);
        setExtras(current.map((e) => ({ key: e.id, id: e.id, name: e.name, price: e.price })));
        setOriginalExtraIds(current.map((e) => e.id));
      } else {
        setCategoryId(cats.data?.[0]?.id ?? "");
      }
      setCategories(cats.data ?? []);
    })();
  }, [dishId]);

  // Libera la vista previa local de la foto al cambiarla o salir.
  useEffect(() => () => void (photoPreview && URL.revokeObjectURL(photoPreview)), [photoPreview]);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setError("La foto debe ser JPG, PNG o WebP.");
    if (file.size > MAX_PHOTO_BYTES) return setError("La foto no puede superar los 5 MB.");
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const cleanExtras = extras.filter((e) => e.name.trim() || e.price !== null);
    if (!name.trim()) return setError("Indica el nombre del plato.");
    if (!categoryId) return setError("Elige una categoría.");
    if (!description.trim()) return setError("Agrega una descripción del plato.");
    if (price === null) return setError("Indica el precio del plato.");
    if (cleanExtras.some((e) => !e.name.trim())) return setError("Cada adicional necesita un nombre.");

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const fail = (e: { message?: string; code?: string } | null, text?: string) => {
      setSaving(false);
      setError(text ?? dbErrorMessage(e));
    };

    const values = { name: name.trim(), category_id: categoryId, description: description.trim(), price, available, featured };
    const saved = savedId
      ? await supabase.from("dishes").update(values).eq("id", savedId).select("id").single()
      : await supabase.from("dishes").insert(values).select("id").single();
    if (saved.error) return fail(saved.error);
    const id = saved.data.id;
    setCreatedId(id);

    // Foto: se sube a Storage y se guarda su URL pública.
    if (photoFile) {
      const ext = photoFile.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${id}/${Date.now()}.${ext}`;
      const upload = await supabase.storage.from(BUCKET).upload(path, photoFile, { contentType: photoFile.type });
      if (upload.error) return fail(null, "No pudimos subir la foto. Revisa el archivo e inténtalo de nuevo.");
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const photo = await supabase.from("dishes").update({ photo_url: url }).eq("id", id);
      if (photo.error) return fail(photo.error);
      setPhotoFile(null);
      setPhotoUrl(url);
      // La foto anterior, si estaba en Storage, ya no se usa. Si no se puede borrar, el plato igual queda guardado.
      const previous = photoUrl?.split(`/${BUCKET}/`)[1];
      if (previous) await supabase.storage.from(BUCKET).remove([previous]);
    }

    // Adicionales: actualiza los existentes, crea los nuevos y quita los eliminados.
    const fresh = cleanExtras.filter((e) => !e.id);
    const [updates, inserted] = await Promise.all([
      Promise.all(
        cleanExtras
          .filter((e) => e.id)
          .map((e) => supabase.from("dish_extras").update({ name: e.name.trim(), price: e.price ?? 0 }).eq("id", e.id!)),
      ),
      fresh.length
        ? supabase
            .from("dish_extras")
            .insert(fresh.map((e) => ({ dish_id: id, name: e.name.trim(), price: e.price ?? 0 })))
            .select("id")
        : null,
    ]);
    const updateError = updates.find((r) => r.error)?.error ?? inserted?.error;
    if (updateError) return fail(updateError);
    // Los nuevos ya existen: un reintento no debe volver a crearlos.
    if (inserted?.data) {
      const ids = new Map(fresh.map((e, i) => [e.key, inserted.data[i]?.id]));
      setExtras((all) => all.map((e) => (ids.get(e.key) ? { ...e, id: ids.get(e.key)! } : e)));
      setOriginalExtraIds((all) => [...all, ...inserted.data.map((r) => r.id)]);
    }

    // Quitados: se borran; si ya se pidieron (los referencia el historial), se retiran de la carta.
    const removed = originalExtraIds.filter((oid) => !cleanExtras.some((e) => e.id === oid));
    for (const extraId of removed) {
      const deleted = await supabase.from("dish_extras").delete().eq("id", extraId);
      const result =
        deleted.error?.code === "23503"
          ? await supabase.from("dish_extras").update({ active: false }).eq("id", extraId)
          : deleted;
      if (result.error) return fail(result.error);
      setOriginalExtraIds((all) => all.filter((x) => x !== extraId));
    }

    router.push("/admin/menu");
  }

  async function removeDish() {
    if (!dishId) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("dishes").delete().eq("id", dishId);
    if (deleteError) {
      setDeleting(false);
      return setError(
        dbErrorMessage(deleteError, { inUse: "Este plato ya se pidió: márcalo como agotado en lugar de eliminarlo." }),
      );
    }
    // Su foto, si estaba en Storage, ya no se usa.
    const photo = photoUrl?.split(`/${BUCKET}/`)[1];
    if (photo) await supabase.storage.from(BUCKET).remove([photo]);
    router.push("/admin/menu");
  }

  const category = categories?.find((c) => c.id === categoryId);
  const title = isNew ? "Crear plato" : `Editar ${name || "plato"}`;
  const shownPhoto = photoPreview ?? photoUrl;

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Menú", href: "/admin/menu" }, { label: isNew ? "Nuevo plato" : name || "Plato" }]} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title={title}
          subtitle={["Menú", category?.name, isNew ? "Nuevo plato" : name].filter(Boolean).join(" / ")}
        />

        {loadFailed ? (
          <ErrorNote>No pudimos cargar el plato. Revisa tu conexión y recarga la página.</ErrorNote>
        ) : notFound ? (
          <LinkNotice text="No encontramos ese plato." href="/admin/menu" linkLabel="Volver al menú" />
        ) : !categories ? (
          <FormSkeleton label="Cargando plato…" />
        ) : categories.length === 0 ? (
          <LinkNotice text="Primero crea una categoría." href="/admin/categorias" linkLabel="Ir a categorías" />
        ) : (
          <form onSubmit={save} noValidate className="grid grid-cols-[1fr_390px] items-start gap-6">
            <div className="flex flex-col gap-6">
              <Card className="flex flex-col gap-4 p-6">
                <h2 className="text-xl font-bold">Información del plato</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nombre *">
                    <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
                  </Field>
                  <Field label="Categoría *">
                    <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Descripción *">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Precio base (CLP) *">
                    <PriceInput value={price} onChange={setPrice} placeholder="$0" required />
                  </Field>
                  <Field label="Disponibilidad *">
                    <Select value={available ? "1" : "0"} onChange={(e) => setAvailable(e.target.value === "1")}>
                      <option value="1">Disponible</option>
                      <option value="0">Agotado</option>
                    </Select>
                  </Field>
                </div>
              </Card>

              <Card className="flex flex-col gap-3 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">Adicionales</h2>
                  <p className="text-sm text-muted">Selección opcional</p>
                </div>
                {extras.length > 0 && (
                  <div className="grid grid-cols-[1fr_120px_24px] gap-3 text-xs uppercase text-muted">
                    <span>Nombre del adicional</span>
                    <span>Precio extra (CLP)</span>
                  </div>
                )}
                {extras.map((extra, i) => (
                  <div key={extra.key} className="grid grid-cols-[1fr_120px_24px] items-center gap-3">
                    <Input
                      aria-label={`Nombre del adicional ${i + 1}`}
                      value={extra.name}
                      maxLength={60}
                      onChange={(e) => setExtras((all) => all.map((x) => (x.key === extra.key ? { ...x, name: e.target.value } : x)))}
                    />
                    <PriceInput
                      aria-label={`Precio del adicional ${i + 1}`}
                      value={extra.price}
                      placeholder="$0"
                      onChange={(p) => setExtras((all) => all.map((x) => (x.key === extra.key ? { ...x, price: p } : x)))}
                    />
                    <button
                      type="button"
                      aria-label={`Quitar ${extra.name || "adicional"}`}
                      onClick={() => setExtras((all) => all.filter((x) => x.key !== extra.key))}
                      className="flex cursor-pointer items-center justify-center text-muted hover:text-ink"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExtras((all) => [...all, newExtra()])}
                  className="flex w-fit cursor-pointer items-center gap-1 text-md text-primary hover:underline"
                >
                  <Plus className="size-3.5" aria-hidden /> Agregar adicional
                </button>
              </Card>

              <ErrorNote>{error}</ErrorNote>
              <FormActions cancelHref="/admin/menu" submitLabel={isNew ? "Crear plato" : "Guardar plato"} saving={saving} />
            </div>

            <div className="flex flex-col gap-6">
              <Card className="flex flex-col gap-3 p-6">
                <h2 className="text-xl font-bold">Fotografía</h2>
                <DishPhoto src={shownPhoto} alt={name ? `Foto de ${name}` : ""} className="aspect-[4/3] w-full" />
                <input
                  ref={fileInput}
                  type="file"
                  accept={PHOTO_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => pickPhoto(e.target.files?.[0])}
                />
                <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                  <ImagePlus className="size-5" aria-hidden /> {shownPhoto ? "Cambiar fotografía" : "Subir fotografía"}
                </Button>
                <p className="text-xs text-muted">
                  {photoFile ? `${photoFile.name} · se sube al guardar` : "JPG, PNG o WebP · Máx. 5 MB · Recomendado 1200 × 900 px"}
                </p>
              </Card>

              <Card className="flex flex-col gap-2 p-6">
                <h2 className="text-xl font-bold">Visibilidad</h2>
                <label className="flex cursor-pointer items-center gap-2.5 pt-2 text-base font-semibold">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="size-4 accent-ink"
                  />
                  Destacar en la carta
                </label>
                <p className="text-sm text-muted">Aparece entre los favoritos del restaurante.</p>
              </Card>

              {!isNew && ordered === false && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-fit cursor-pointer items-center gap-1.5 px-1 text-sm text-primary hover:underline"
                >
                  <Trash2 className="size-4" aria-hidden /> Eliminar plato
                </button>
              )}
              {!isNew && ordered && (
                <p className="px-1 text-sm text-muted">
                  Este plato ya se pidió, así que no se puede eliminar: márcalo como agotado para sacarlo de los pedidos.
                </p>
              )}
            </div>
          </form>
        )}

        <Modal
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          icon={<Trash2 aria-hidden />}
          title={`¿Eliminar ${name || "el plato"}?`}
          description="El plato y sus adicionales dejarán de existir. Como nunca se pidió, no afecta ningún pedido."
        >
          {error && confirmDelete && <p className="text-sm text-primary">{error}</p>}
          <Button onClick={removeDish} loading={deleting}>
            Eliminar plato
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
        </Modal>
      </main>
    </>
  );
}
