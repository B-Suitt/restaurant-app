import type { Metadata } from "next";
import { ReadyDishes } from "./ReadyDishes";

export const metadata: Metadata = { title: "Listos para despachar" };

export default function DispatchPage() {
  return <ReadyDishes />;
}
