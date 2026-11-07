import type { Metadata } from "next";
import { MenuAdmin } from "./MenuAdmin";

export const metadata: Metadata = { title: "Menú" };

export default function Page() {
  return <MenuAdmin />;
}
