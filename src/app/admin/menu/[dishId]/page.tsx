import type { Metadata } from "next";
import { FreshOnVisit } from "@/components/layout/FreshOnVisit";
import { DishForm } from "../DishForm";

// Depende del id en la URL: fuera de la validación de navegación instantánea.
export const instant = false;

export const metadata: Metadata = { title: "Editar plato" };

export default async function Page({ params }: PageProps<"/admin/menu/[dishId]">) {
  const { dishId } = await params;
  return (
    <FreshOnVisit>
      <DishForm dishId={dishId} />
    </FreshOnVisit>
  );
}
