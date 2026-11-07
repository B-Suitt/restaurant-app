import type { Metadata } from "next";
import { DishForm } from "../DishForm";

// Depende del id en la URL: fuera de la validación de navegación instantánea.
export const instant = false;

export const metadata: Metadata = { title: "Editar plato" };

export default async function Page({ params }: PageProps<"/admin/menu/[dishId]">) {
  const { dishId } = await params;
  return <DishForm dishId={dishId} />;
}
