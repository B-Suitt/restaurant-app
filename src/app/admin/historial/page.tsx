import type { Metadata } from "next";
import { OrderHistory } from "./OrderHistory";

export const metadata: Metadata = { title: "Historial de pedidos" };

export default function Page() {
  return <OrderHistory />;
}
