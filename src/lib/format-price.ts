const clp = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

/** Formatea un precio en CLP (entero) como "$22.400". */
export function formatPrice(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${clp.format(Math.abs(Math.round(amount)))}`;
}
