import type { Metadata } from "next";
import { UserForm } from "../UserForm";

export const metadata: Metadata = { title: "Crear usuario" };

export default function Page() {
  return <UserForm userId={null} />;
}
