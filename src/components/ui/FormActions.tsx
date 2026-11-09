import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";

/** Botones Cancelar y Guardar al final de los formularios del administrador. */
export function FormActions({ cancelHref, submitLabel, saving }: { cancelHref: string; submitLabel: string; saving: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link href={cancelHref} className={buttonClasses({ variant: "secondary" })}>
        Cancelar
      </Link>
      <Button type="submit" loading={saving}>
        {submitLabel}
      </Button>
    </div>
  );
}
