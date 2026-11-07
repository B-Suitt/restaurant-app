import type { Metadata } from "next";
import { TableDetail } from "./TableDetail";

// Depende del id de la mesa en la URL: fuera de la validación de navegación instantánea.
export const instant = false;

export const metadata: Metadata = { title: "Detalle de mesa" };

export default async function TablePage({ params }: PageProps<"/garzon/mesas/[tableId]">) {
  const { tableId } = await params;
  return <TableDetail tableId={tableId} />;
}
