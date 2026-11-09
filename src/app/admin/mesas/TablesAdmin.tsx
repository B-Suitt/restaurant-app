"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Plus, QrCode, SearchX } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/Field";
import { InfoNote } from "@/components/ui/InfoNote";
import { Modal } from "@/components/ui/Modal";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { tableLabel } from "@/lib/order-format";
import { dbErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { TABLE_STATUS_DISPLAY, tableStatus, type TableStatus } from "@/lib/table-status";
import { useLiveData } from "@/lib/use-live-data";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

const PAGE_SIZE = 8;

async function loadTables() {
  const supabase = createClient();
  const [tables, sessions] = await Promise.all([
    supabase.from("tables").select("id, number, capacity, zone, active, table_sessions(count)").order("number"),
    supabase.from("table_sessions").select("table_id, confirmed_at, orders(id), waiter_calls(type, attended_at)").eq("status", "open"),
  ]);
  if (tables.error || sessions.error) throw tables.error ?? sessions.error;
  const open = new Map(sessions.data.map((s) => [s.table_id, s]));
  return tables.data.map((t) => {
    const status = tableStatus(open.get(t.id));
    return {
      ...t,
      hasHistory: (t.table_sessions[0]?.count ?? 0) > 0,
      isOpen: status !== "libre",
      status,
    };
  });
}

type AdminTable = Awaited<ReturnType<typeof loadTables>>[number];
type StatusFilter = TableStatus | "inactiva" | "";

// Frame "Administrador · Mesas y QR"
export function TablesAdmin() {
  const { data: tables, live, reload } = useLiveData("admin-tables", ["table_sessions", "waiter_calls", "orders"], loadTables);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<AdminTable | null>(null);

  const zones = [...new Set(tables?.map((t) => t.zone))].sort();
  const filtered =
    tables?.filter((t) => {
      const q = query.trim().toLowerCase();
      if (q && !String(t.number).includes(q) && !tableLabel(t.number).toLowerCase().includes(q)) return false;
      if (zone && t.zone !== zone) return false;
      if (status === "inactiva") return !t.active;
      if (status && (t.status !== status || !t.active)) return false;
      return true;
    }) ?? [];
  const active = tables?.filter((t) => t.active) ?? [];
  const occupied = active.filter((t) => t.isOpen).length;
  const requests = active.filter((t) => t.status === "llamando" || t.status === "pidiendo_cuenta").length;

  // Los filtros se aplican al escribir; volver a la página 1 al cambiarlos.
  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Mesas y QR" }]} live={live} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title="Mesas y códigos QR"
          subtitle="Organiza tus espacios y conecta cada mesa con su carta."
          action={
            <Link href="/admin/mesas/nueva" className={buttonClasses()}>
              <Plus className="size-5" aria-hidden /> Agregar mesa
            </Link>
          }
        />

        <div className="grid grid-cols-4 gap-4">
          <StatCard value={active.length} label="Mesas en el local" />
          <StatCard value={occupied} label="Ocupadas" />
          <StatCard value={active.length - occupied} label="Libres" />
          <StatCard value={requests} label="Solicitudes activas" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Buscar mesa">
            <Input value={query} onChange={(e) => filter(setQuery)(e.target.value)} placeholder="Número de mesa" />
          </Field>
          <Field label="Zona">
            <Select value={zone} onChange={(e) => filter(setZone)(e.target.value)}>
              <option value="">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={status} onChange={(e) => filter(setStatus)(e.target.value as StatusFilter)}>
              <option value="">Todos los estados</option>
              {(Object.keys(TABLE_STATUS_DISPLAY) as TableStatus[]).map((s) => (
                <option key={s} value={s}>
                  {TABLE_STATUS_DISPLAY[s].label}
                </option>
              ))}
              <option value="inactiva">Inactiva</option>
            </Select>
          </Field>
        </div>

        {tables === null ? (
          <TableSkeleton label="Cargando mesas…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={tables.length === 0 ? <QrCode aria-hidden /> : <SearchX aria-hidden />}
            title={tables.length === 0 ? "Aún no hay mesas" : "Sin resultados"}
          >
            {tables.length === 0 ? "Agrega la primera mesa para generar su código QR." : "No hay mesas con esos filtros."}
          </EmptyState>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Mesa</TableHeader>
                  <TableHeader>Zona / capacidad</TableHeader>
                  <TableHeader>Estado</TableHeader>
                  <TableHeader>Código QR</TableHeader>
                  <TableHeader>Acciones</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginate(filtered, page, PAGE_SIZE).map((t) => {
                  const display = TABLE_STATUS_DISPLAY[t.status];
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-base">{tableLabel(t.number)}</TableCell>
                      <TableCell className="text-base">
                        {t.zone} · {t.capacity} personas
                      </TableCell>
                      <TableCell>
                        {t.active ? <Chip tone={display.tone}>{display.label}</Chip> : <Chip tone="neutral">Inactiva</Chip>}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/mesas/${t.id}/qr`}
                          className="inline-flex items-center gap-1 text-base text-primary hover:underline"
                        >
                          Ver QR <ArrowUpRight className="size-4" aria-hidden />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/mesas/${t.id}`} className="hover:underline">
                          Editar
                        </Link>
                        {" · "}
                        <button type="button" className="cursor-pointer hover:underline" onClick={() => setToDelete(t)}>
                          {t.hasHistory ? (t.active ? "Desactivar" : "Activar") : "Eliminar"}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} noun="mesas" onChange={setPage} />
          </>
        )}

        <InfoNote plain title="Una mesa, un QR">
          El QR identifica la mesa al abrir el menú. No elimines mesas con una estadía activa.
        </InfoNote>

        {toDelete && (
          <RemoveTableModal
            table={toDelete}
            onClose={() => setToDelete(null)}
            onDone={() => {
              setToDelete(null);
              reload();
            }}
          />
        )}
      </main>
    </>
  );
}

/** Elimina una mesa sin historial; si tiene historial solo se desactiva o reactiva (regla 14). */
function RemoveTableModal({ table, onClose, onDone }: { table: AdminTable; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = tableLabel(table.number);
  const action = table.hasHistory ? (table.active ? "deactivate" : "activate") : "delete";
  const blocked = table.isOpen && action !== "activate";

  async function confirm() {
    setBusy(true);
    const supabase = createClient();
    const result =
      action === "delete"
        ? await supabase.from("tables").delete().eq("id", table.id)
        : await supabase.from("tables").update({ active: action === "activate" }).eq("id", table.id);
    setBusy(false);
    if (result.error) {
      setError(dbErrorMessage(result.error, { inUse: "La mesa tiene historial: desactívala en lugar de eliminarla." }));
      return;
    }
    onDone();
  }

  const copy = {
    delete: { title: `¿Eliminar la ${label.toLowerCase()}?`, text: "La mesa y su código QR dejarán de existir.", button: "Eliminar mesa" },
    deactivate: {
      title: `¿Desactivar la ${label.toLowerCase()}?`,
      text: "Tiene historial, así que no se elimina: se desactiva. Su QR mostrará una pantalla de error hasta que la actives.",
      button: "Desactivar mesa",
    },
    activate: { title: `¿Activar la ${label.toLowerCase()}?`, text: "Su QR volverá a abrir la carta.", button: "Activar mesa" },
  }[action];

  return (
    <Modal open onClose={onClose} title={copy.title} description={blocked ? undefined : copy.text}>
      {blocked && (
        <p role="alert" className="rounded-sm bg-warning-bg p-3 text-md text-warning-fg">
          La mesa tiene una estadía abierta. Pide al garzón que la cierre antes.
        </p>
      )}
      {error && <p className="text-sm text-primary">{error}</p>}
      <Button onClick={confirm} loading={busy} disabled={blocked}>
        {copy.button}
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
    </Modal>
  );
}
