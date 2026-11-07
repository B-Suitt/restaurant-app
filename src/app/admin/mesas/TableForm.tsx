"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/Field";
import { InfoNote } from "@/components/ui/InfoNote";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { tableLabel } from "@/lib/order-format";
import { dbErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { TABLE_STATUS_DISPLAY, tableStatus, type TableStatus } from "@/lib/table-status";

const CAPACITIES = Array.from({ length: 12 }, (_, i) => i + 1);

type Loaded = { zones: string[]; status: TableStatus | null; isOpen: boolean };

// Frame "Administrador · Editar mesa" (también para crear una mesa nueva)
export function TableForm({ tableId }: { tableId: string | null }) {
  const router = useRouter();
  const isNew = tableId === null;
  const [number, setNumber] = useState("");
  const [zone, setZone] = useState("Salón");
  const [capacity, setCapacity] = useState(4);
  const [active, setActive] = useState(true);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [zones, table, session] = await Promise.all([
        supabase.from("tables").select("zone, number").order("number"),
        tableId ? supabase.from("tables").select("number, zone, capacity, active").eq("id", tableId).maybeSingle() : null,
        tableId
          ? supabase.from("table_sessions").select("waiter_calls(type, attended_at)").eq("table_id", tableId).eq("status", "open").maybeSingle()
          : null,
      ]);
      const allZones = [...new Set(["Salón", "Terraza", ...(zones.data?.map((z) => z.zone) ?? [])])];
      if (table) {
        if (!table.data) {
          setNotFound(true);
          return;
        }
        setNumber(String(table.data.number));
        setZone(table.data.zone);
        setCapacity(table.data.capacity);
        setActive(table.data.active);
      } else {
        // Propone el número siguiente al mayor existente.
        const max = Math.max(0, ...(zones.data?.map((z) => z.number) ?? []));
        setNumber(String(max + 1));
      }
      setLoaded({ zones: allZones, status: tableId ? tableStatus(session?.data) : null, isOpen: !!session?.data });
    })();
  }, [tableId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const n = Number(number);
    if (!Number.isInteger(n) || n <= 0) {
      setError("El número de mesa debe ser un entero mayor que 0.");
      return;
    }
    if (!zone.trim()) {
      setError("Indica la zona de la mesa.");
      return;
    }
    setSaving(true);
    setError(null);
    const values = { number: n, zone: zone.trim(), capacity, active };
    const supabase = createClient();
    const result = isNew
      ? await supabase.from("tables").insert(values).select("id").single()
      : await supabase.from("tables").update(values).eq("id", tableId).select("id").single();
    setSaving(false);
    if (result.error) {
      setError(dbErrorMessage(result.error, { unique: `Ya existe la ${tableLabel(n).toLowerCase()}.` }));
      return;
    }
    // Una mesa nueva va directo a su QR para imprimirlo.
    router.push(isNew ? `/admin/mesas/${result.data.id}/qr` : "/admin/mesas");
  }

  const label = number ? tableLabel(Number(number) || 0) : "Mesa";
  const title = isNew ? "Agregar mesa" : `Editar ${label.toLowerCase()}`;
  const status = loaded?.status ? TABLE_STATUS_DISPLAY[loaded.status] : null;

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Mesas y QR", href: "/admin/mesas" }, { label: isNew ? "Nueva" : label }]} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle title={title} subtitle={isNew ? "Mesas y QR / Nueva mesa" : `Mesas y QR / ${label} / Editar`} />

        {notFound ? (
          <Card className="py-10 text-center text-base text-muted">
            No encontramos esa mesa.{" "}
            <Link href="/admin/mesas" className="text-primary hover:underline">
              Volver a las mesas
            </Link>
          </Card>
        ) : !loaded ? (
          <p className="py-10 text-center text-base text-muted">Cargando mesa…</p>
        ) : (
          <div className="grid grid-cols-[1fr_390px] items-start gap-6">
            <form onSubmit={save} className="flex flex-col gap-6" noValidate>
              <Card className="flex flex-col gap-4 p-7">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold">Información de la mesa</h2>
                  <p className="text-base text-muted">Los campos con asterisco son obligatorios.</p>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Número de mesa *">
                    <Input type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} required />
                  </Field>
                  <Field label="Nombre visible" hint="Se genera a partir del número.">
                    <Input value={label} disabled readOnly />
                  </Field>
                  <Field label="Zona *">
                    <Input list="zones" value={zone} onChange={(e) => setZone(e.target.value)} required />
                  </Field>
                  <Field label="Capacidad *">
                    <Select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
                      {CAPACITIES.map((c) => (
                        <option key={c} value={c}>
                          {c} {c === 1 ? "persona" : "personas"}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <datalist id="zones">
                  {loaded.zones.map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
                <ToggleRow
                  label="Habilitada para el servicio"
                  checked={active}
                  onChange={setActive}
                  // Una mesa con una estadía abierta no se desactiva (regla 14).
                  disabled={loaded.isOpen && active}
                />
                <p className="text-sm text-muted">
                  {loaded.isOpen
                    ? "La mesa tiene una estadía abierta: no se puede desactivar hasta que el garzón la cierre."
                    : "El estado operativo se actualiza con la atención; no se modifica desde este formulario."}
                </p>
              </Card>

              {error && (
                <p role="alert" className="rounded-sm bg-danger-bg p-3 text-md text-danger-fg">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Link href="/admin/mesas" className={buttonClasses({ variant: "secondary" })}>
                  Cancelar
                </Link>
                <Button type="submit" loading={saving}>
                  {isNew ? "Crear mesa" : "Guardar cambios"}
                </Button>
              </div>
            </form>

            <div className="flex flex-col gap-6">
              {!isNew && (
                <Card className="flex flex-col gap-3 p-6">
                  <p className="text-sm uppercase text-muted">Vista actual</p>
                  <p className="text-[46px] leading-[1.2]">{label}</p>
                  {active ? status && <Chip tone={status.tone}>{status.label}</Chip> : <Chip tone="neutral">Inactiva</Chip>}
                  <p className="text-base">
                    {zone} · {capacity} {capacity === 1 ? "persona" : "personas"}
                  </p>
                  <p className="text-sm text-muted">QR asignado y disponible para imprimir.</p>
                  <Link href={`/admin/mesas/${tableId}/qr`} className={buttonClasses({ variant: "secondary" })}>
                    Ver código QR
                  </Link>
                </Card>
              )}
              <InfoNote plain title="Conserva su identidad">
                Editar el número o la zona no altera los pedidos ni el QR de la mesa.
              </InfoNote>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
