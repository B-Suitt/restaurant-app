import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatPrice } from "@/lib/format-price";
import { ORDER_ITEM_STATUSES } from "@/lib/order-status";
import { ModalDemo } from "./ModalDemo";

// Muestrario de componentes base para compararlos con Figma. Solo en desarrollo.
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-5 md:p-9">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl">Componentes base</h1>
        <p className="text-base text-muted">Tokens y componentes extraídos del Figma.</p>
      </header>

      <Section title="Colores">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["primary", "bg-primary"],
            ["primary-soft", "bg-primary-soft"],
            ["ink", "bg-ink"],
            ["muted", "bg-muted"],
            ["subtle", "bg-subtle"],
            ["border", "bg-border"],
            ["surface-muted", "bg-surface-muted"],
            ["surface-subtle", "bg-surface-subtle"],
          ].map(([name, bg]) => (
            <div key={name} className="flex items-center gap-2">
              <span className={`size-8 rounded-sm border border-border ${bg}`} />
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <div className="flex flex-col gap-2">
          <p className="text-4xl">Un gran servicio empieza contigo. · 4xl</p>
          <p className="text-3xl">El equipo detrás del servicio · 3xl</p>
          <p className="text-2xl">Tu garzón está avisado · 2xl</p>
          <p className="text-xl">Nuestra carta · xl</p>
          <p className="text-lg font-bold">Smash burger · lg bold</p>
          <p className="text-base">Llamar al garzón · base</p>
          <p className="text-md font-semibold">Correo electrónico · md semibold</p>
          <p className="text-sm text-muted">Doble carne, cheddar y pepinillos. · sm</p>
          <p className="text-xs text-muted">Nombre · xs</p>
          <p className="text-2xs font-bold text-primary">Menú · 2xs</p>
          <p className="text-lg font-bold">{formatPrice(22400)} · formatPrice(22400)</p>
        </div>
      </Section>

      <Section title="Botones">
        <div className="flex max-w-sm flex-col gap-3">
          <Button>Ver carrito · 4 productos · {formatPrice(22400)}</Button>
          <Button variant="secondary">Llamar al garzón</Button>
          <Button loading>Enviando pedido</Button>
          <Button disabled>Deshabilitado</Button>
          <div className="flex items-center gap-3">
            <Button>
              <Plus className="size-5" aria-hidden /> Crear usuario
            </Button>
            <Button variant="soft" size="icon" aria-label="Agregar plato">
              <Plus className="size-6" aria-hidden />
            </Button>
            <Button variant="link" className="text-sm">
              ¿Olvidaste tu contraseña?
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Campos">
        <div className="flex max-w-sm flex-col gap-5">
          <Field label="Correo electrónico">
            <Input type="email" placeholder="camila@restaurante.cl" />
          </Field>
          <Field label="Contraseña" error="Correo o contraseña incorrectos.">
            <Input type="password" defaultValue="secreto123" />
          </Field>
          <Field label="Rol">
            <Select defaultValue="">
              <option value="">Todos los roles</option>
              <option value="waiter">Garzón</option>
              <option value="kitchen">Cocina</option>
              <option value="admin">Administrador</option>
            </Select>
          </Field>
          <Field label="Nota para cocina" hint="Ej.: sin cebolla">
            <Textarea placeholder="Escribe una nota" />
          </Field>
        </div>
      </Section>

      <Section title="Chips de estado">
        <div className="flex flex-wrap gap-1.5">
          {ORDER_ITEM_STATUSES.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="warning">Llamando</Chip>
          <Chip tone="success">Activo</Chip>
          <Chip tone="neutral">Inactivo</Chip>
          <Chip tone="neutral">Agotado</Chip>
        </div>
      </Section>

      <Section title="Tarjetas">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex flex-col gap-3">
            <p className="text-lg font-bold">Pedido #1042</p>
            <p className="text-sm text-muted">Mesa 08 · 4 productos · {formatPrice(22400)}</p>
            <StatusChip status="en_preparacion" />
          </Card>
          <Card tone="highlight" className="flex flex-col gap-2">
            <p className="text-2xl">Mesa 12</p>
            <p className="text-xs text-muted">#1043 · Llegada 13:48 · NUEVO</p>
          </Card>
          <Card tone="alert" className="flex flex-col gap-2">
            <p className="text-2xl">Mesa 03</p>
            <p className="text-xs text-primary">Atrasado · Supera el objetivo de 15 min</p>
          </Card>
        </div>
      </Section>

      <Section title="Tabla">
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
            {[
              ["Camila Rojas", "camila@restaurante.cl", "Garzón", true],
              ["Francisca Díaz", "fran@restaurante.cl", "Garzón", false],
              ["Estación cocina", "cocina@restaurante.cl", "Cocina", true],
            ].map(([name, email, role, active]) => (
              <TableRow key={String(email)}>
                <TableCell>{name}</TableCell>
                <TableCell>{email}</TableCell>
                <TableCell>{role}</TableCell>
                <TableCell>
                  <Chip tone={active ? "success" : "neutral"}>{active ? "Activo" : "Inactivo"}</Chip>
                </TableCell>
                <TableCell className="text-sm text-primary">
                  Editar · {active ? "Desactivar" : "Activar"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Modal">
        <ModalDemo />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-border pb-2 text-xl">{title}</h2>
      {children}
    </section>
  );
}
