import type { Metadata } from "next";
import { FreshOnVisit } from "@/components/layout/FreshOnVisit";
import { TableForm } from "../TableForm";

export const metadata: Metadata = { title: "Agregar mesa" };

export default function Page() {
  return (
    <FreshOnVisit>
      <TableForm tableId={null} />
    </FreshOnVisit>
  );
}
