"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { Field, Input, Select } from "@/components/ui/Field";
import { FormActions } from "@/components/ui/FormActions";
import { InfoNote } from "@/components/ui/InfoNote";
import { LinkNotice } from "@/components/ui/LinkNotice";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";
import { isLoadFailure } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time-format";
import { createUser, getUserDates, updateUser } from "./actions";
import { FormSkeleton } from "@/components/ui/Skeleton";

/** Lo que cada rol puede hacer (coincide con las políticas RLS y las funciones de la base). */
const PERMISSIONS: Record<StaffRole, { can: string[]; cannot: string }> = {
  waiter: {
    can: [
      "Ver y atender mesas",
      "Agregar pedidos a una mesa",
      "Recibir llamados y solicitudes de cuenta",
      "Confirmar entrega de platos",
      "Cerrar mesas sin flujo de cobro",
    ],
    cannot: "Sin acceso a configuración, usuarios o edición del menú.",
  },
  kitchen: {
    can: ["Ver pedidos entrantes al instante", "Marcar platos En preparación", "Marcar platos Listos para entregar"],
    cannot: "Sin acceso a mesas, cuentas, usuarios o edición del menú.",
  },
  admin: {
    can: ["Ver el servicio en vivo", "Gestionar mesas y códigos QR", "Editar menú y categorías", "Administrar usuarios y roles", "Consultar el historial de pedidos"],
    cannot: "No toma pedidos ni cambia estados de platos.",
  },
};

const longDate = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" });

function lastAccess(iso: string | null) {
  if (!iso) return "nunca";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? `hoy, ${formatClock(d)}` : `${longDate.format(d)}, ${formatClock(d)}`;
}

// Frame "Administrador · Editar usuario" (también para crear uno nuevo)
export function UserForm({ userId }: { userId: string | null }) {
  const router = useRouter();
  const isNew = userId === null;
  const [loaded, setLoaded] = useState(isNew);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isMe, setIsMe] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("waiter");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [dates, setDates] = useState<{ lastSignInAt: string | null; createdAt: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("name, email, role, active").eq("id", userId).maybeSingle(),
      supabase.auth.getUser(),
      getUserDates(userId).catch(() => null), // informativo: si falla, igual se puede editar
    ]).then(([profile, auth, accountDates]) => {
      if (isLoadFailure(profile.error)) return setLoadFailed(true);
      if (!profile.data) return setNotFound(true);
      setName(profile.data.name);
      setEmail(profile.data.email);
      setRole(profile.data.role as StaffRole);
      setActive(profile.data.active);
      setIsMe(auth.data.user?.id === userId);
      setDates(accountDates);
      setLoaded(true);
    }).catch(() => setLoadFailed(true));
  }, [userId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const input = { name, email, role, active, password };
    const result = userId ? await updateUser(userId, input) : await createUser(input);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    router.push("/admin/usuarios");
  }

  const permissions = PERMISSIONS[role];

  return (
    <>
      <AdminTopBar crumbs={[{ label: "Usuarios y roles", href: "/admin/usuarios" }, { label: isNew ? "Nuevo" : name || "Usuario" }]} />
      <main className="flex flex-col gap-6 px-9 py-10">
        <AdminPageTitle
          title={isNew ? "Crear usuario" : "Editar usuario"}
          subtitle={`Usuarios y roles / ${isNew ? "Nuevo usuario" : name}`}
        />

        {loadFailed ? (
          <ErrorNote>No pudimos cargar el usuario. Revisa tu conexión y recarga la página.</ErrorNote>
        ) : notFound ? (
          <LinkNotice text="No encontramos ese usuario." href="/admin/usuarios" linkLabel="Volver al equipo" />
        ) : !loaded ? (
          <FormSkeleton label="Cargando usuario…" />
        ) : (
          <div className="grid grid-cols-[1fr_390px] items-start gap-6">
            <form onSubmit={save} noValidate className="flex flex-col gap-6">
              <Card className="flex flex-col gap-4 p-7">
                <h2 className="text-xl font-bold">Información personal</h2>
                <Field label="Nombre completo *">
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" required />
                </Field>
                <Field label="Correo electrónico *">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" required />
                </Field>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Rol *" hint={isMe ? "No puedes cambiar tu propio rol." : undefined}>
                    <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} disabled={isMe}>
                      {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Estado *">
                    <Select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")} disabled={isMe}>
                      <option value="1">Activo</option>
                      <option value="0">Inactivo</option>
                    </Select>
                  </Field>
                </div>
                <Field
                  label={isNew ? "Contraseña *" : "Nueva contraseña"}
                  hint={isNew ? "Mínimo 8 caracteres. Entrégala a la persona para su primer ingreso." : "Mínimo 8 caracteres. Solo completa este campo si necesitas cambiarla."}
                >
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder={isNew ? "" : "Dejar en blanco para conservar la actual"}
                  />
                </Field>
                {dates && (
                  <p className="rounded-md bg-surface-muted px-4 py-3.5 text-sm text-muted">
                    Último acceso: {lastAccess(dates.lastSignInAt)} · Cuenta creada el {longDate.format(new Date(dates.createdAt))}
                  </p>
                )}
              </Card>

              <ErrorNote>{error}</ErrorNote>
              <FormActions cancelHref="/admin/usuarios" submitLabel={isNew ? "Crear usuario" : "Guardar cambios"} saving={saving} />
            </form>

            <div className="flex flex-col gap-6">
              <Card className="flex flex-col gap-3 p-6">
                {active ? <Chip tone="success">Activo</Chip> : <Chip tone="neutral">Inactivo</Chip>}
                <h2 className="text-xl font-bold">Permisos de {ROLE_LABEL[role]}</h2>
                <ul className="flex flex-col gap-2.5">
                  {permissions.can.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-base">
                      <Check className="size-4 shrink-0" aria-hidden /> {p}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted">{permissions.cannot}</p>
              </Card>
              <InfoNote plain title="Desactivar no elimina">
                Si cambias el estado a Inactivo, se bloquea el acceso sin perder pedidos ni acciones registradas.
              </InfoNote>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
