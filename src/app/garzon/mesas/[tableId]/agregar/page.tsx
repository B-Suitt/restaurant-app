import type { Metadata } from "next";
import { FreshOnVisit } from "@/components/layout/FreshOnVisit";
import { AddOrder } from "./AddOrder";

// Depende del id de la mesa en la URL: fuera de la validación de navegación instantánea.
export const instant = false;

export const metadata: Metadata = { title: "Agregar pedido" };

export default async function AddOrderPage({ params }: PageProps<"/garzon/mesas/[tableId]/agregar">) {
  const { tableId } = await params;
  return (
    <FreshOnVisit>
      <AddOrder tableId={tableId} />
    </FreshOnVisit>
  );
}
