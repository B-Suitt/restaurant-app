import type { Metadata } from "next";
import { DishForm } from "../DishForm";

export const metadata: Metadata = { title: "Crear plato" };

export default function Page() {
  return <DishForm dishId={null} />;
}
