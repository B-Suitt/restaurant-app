import type { Metadata } from "next";
import { KitchenBoard } from "./KitchenBoard";

export const metadata: Metadata = { title: "Tablero de cocina" };

export default function KitchenPage() {
  return <KitchenBoard />;
}
