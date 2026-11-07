"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/Field";
import { InfoNote } from "@/components/ui/InfoNote";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";
import { dbErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { setUserActive } from "./actions";

type Profile = { id: string; name: string; email: string; role: StaffRole; active: boolean };

const ROLE_DETAIL: Record<StaffRole, { title: string; text: string }> = {
  waiter: { title: "Garzones", text: "Atención de mesas y entregas" },
  kitchen: { title: "Cocina", text: "Preparación y salida de platos" },
  admin: { title: "Administración", text: "Configuración y operación" },
};

const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Frame "Administrador · Usuarios y roles"
export function UsersAdmin() {
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    const supabase = createClient();
    Promise.all([supabase.from("profiles").select("id, name, email, role, active").order("name"), supabase.auth.getUser()])
      .then(([profiles, auth]) => {
        if (profiles.error) throw profiles.error;
        setUsers(profiles.data as Profile[]);
        setMe(auth.data.user?.id ?? null);
      })
      .catch((e) => setError(dbErrorMessage(e)));
  }, []);
  useEffect(reload, [reload]);

  const visible =
    users?.filter(
      (u) =>
        (!query.trim() || normalize(`${u.name} ${u.email}`).includes(normalize(query.trim()))) &&
        (!role || u.role === role) &&
        (!status || u.active === (status === "active")),
    ) ?? [];
  const countActive = (r: StaffRole) => users?.filter((u) => u.role === r && u.active).length ?? 0;

  async function toggle(user: Profile) {
    setBusyId(user.id);
    setError(null);
    const result = await setUserActive(user.id, !user.active);
    setBusyId(null);
    if (!result.ok) setError(result.error);
    reload();
  }

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Usuarios y roles" }]} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title="El equipo detrás del servicio"
          subtitle="Administra accesos y responsabilidades dentro del restaurante."
          action={
            <Link href="/admin/usuarios/nuevo" className={buttonClasses()}>
              <Plus className="size-5" aria-hidden /> Crear usuario
            </Link>
          }
        />

        <div className="grid grid-cols-3 gap-4">
          {(["waiter", "kitchen", "admin"] as const).map((r) => (
            <StatCard key={r} eyebrow={ROLE_DETAIL[r].title} value={countActive(r)} label={ROLE_DETAIL[r].text} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Buscar usuario">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o correo" />
          </Field>
          <Field label="Rol">
            <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole | "")}>
              <option value="">Todos los roles</option>
              {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </Select>
          </Field>
        </div>

        {error && (
          <p role="alert" className="rounded-sm bg-danger-bg p-3 text-md text-danger-fg">
            {error}
          </p>
        )}

        {!users ? (
          <p className="py-10 text-center text-base text-muted">Cargando equipo…</p>
        ) : visible.length === 0 ? (
          <Card className="py-10 text-center text-base text-muted">No hay usuarios con esos filtros.</Card>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Nombre</TableHeader>
                <TableHeader>Correo electrónico</TableHeader>
                <TableHeader>Rol</TableHeader>
                <TableHeader>Estado</TableHeader>
                <TableHeader>Acciones</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-base">
                    {u.name}
                    {u.id === me && <span className="text-muted"> (tú)</span>}
                  </TableCell>
                  <TableCell className="text-base">{u.email}</TableCell>
                  <TableCell className="text-base">{ROLE_LABEL[u.role]}</TableCell>
                  <TableCell>{u.active ? <Chip tone="success">Activo</Chip> : <Chip tone="neutral">Inactivo</Chip>}</TableCell>
                  <TableCell className="text-primary">
                    <Link href={`/admin/usuarios/${u.id}`} className="hover:underline">
                      {u.id === me ? "Editar perfil" : "Editar"}
                    </Link>
                    {u.id !== me && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => toggle(u)}
                          className="cursor-pointer hover:underline disabled:opacity-50"
                        >
                          {u.active ? "Desactivar" : "Activar"}
                        </button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <InfoNote plain title="Accesos por rol">
          Desactivar un usuario impide nuevos accesos y conserva su historial. Cada persona debe usar su propia cuenta.
        </InfoNote>
      </main>
    </>
  );
}
