import type { Metadata } from "next";
import { TablesAdmin } from "./TablesAdmin";

export const metadata: Metadata = { title: "Mesas y QR" };

export default function Page() {
  return <TablesAdmin />;
}
