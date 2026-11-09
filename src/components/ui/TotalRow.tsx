import { formatPrice } from "@/lib/format-price";

/** Etiqueta a la izquierda y monto destacado a la derecha (Total, Consumo…). */
export function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-lg font-bold">{label}</p>
      <p className="text-2xl">{formatPrice(amount)}</p>
    </div>
  );
}
