import type { Metadata } from "next";
import { TableQr } from "./TableQr";

// Depende del id en la URL: fuera de la validación de navegación instantánea.
export const instant = false;

export const metadata: Metadata = { title: "Código QR" };

export default async function Page({ params }: PageProps<"/admin/mesas/[tableId]/qr">) {
  const { tableId } = await params;
  return <TableQr tableId={tableId} />;
}
