import { Card } from "@/components/ui/Card";

/** Métrica simple del administrador: número grande y etiqueta ("12 · Mesas en el local"). */
export function StatCard({ value, label, eyebrow }: { value: string | number; label: string; eyebrow?: string }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      {eyebrow && <p className="text-xs text-muted">{eyebrow}</p>}
      <p className="text-[27px] leading-[1.2] tabular-nums">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </Card>
  );
}
