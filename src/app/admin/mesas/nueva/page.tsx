import type { Metadata } from "next";
import { TableForm } from "../TableForm";

export const metadata: Metadata = { title: "Agregar mesa" };

export default function Page() {
  return <TableForm tableId={null} />;
}
