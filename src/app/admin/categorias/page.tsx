import type { Metadata } from "next";
import { CategoriesAdmin } from "./CategoriesAdmin";

export const metadata: Metadata = { title: "Categorías" };

export default function Page() {
  return <CategoriesAdmin />;
}
