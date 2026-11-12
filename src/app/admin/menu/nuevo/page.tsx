import type { Metadata } from "next";
import { FreshOnVisit } from "@/components/layout/FreshOnVisit";
import { DishForm } from "../DishForm";

export const metadata: Metadata = { title: "Crear plato" };

export default function Page() {
  return (
    <FreshOnVisit>
      <DishForm dishId={null} />
    </FreshOnVisit>
  );
}
