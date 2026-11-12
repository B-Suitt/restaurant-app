import type { Metadata } from "next";
import { FreshOnVisit } from "@/components/layout/FreshOnVisit";
import { UserForm } from "../UserForm";

export const metadata: Metadata = { title: "Crear usuario" };

export default function Page() {
  return (
    <FreshOnVisit>
      <UserForm userId={null} />
    </FreshOnVisit>
  );
}
