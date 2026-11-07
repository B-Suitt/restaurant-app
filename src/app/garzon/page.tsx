import type { Metadata } from "next";
import { TablesGrid } from "./TablesGrid";

export const metadata: Metadata = { title: "Mesas" };

export default function WaiterHome() {
  return <TablesGrid />;
}
