import type { Metadata } from "next";
import { UsersAdmin } from "./UsersAdmin";

export const metadata: Metadata = { title: "Usuarios y roles" };

export default function Page() {
  return <UsersAdmin />;
}
