import type { Metadata } from "next";
import { OrderDetail } from "./OrderDetail";

// Depende del id en la URL: fuera de la validación de navegación instantánea.
export const instant = false;

export const metadata: Metadata = { title: "Detalle del pedido" };

export default async function Page({ params }: PageProps<"/admin/historial/[orderId]">) {
  const { orderId } = await params;
  return <OrderDetail orderId={orderId} />;
}
