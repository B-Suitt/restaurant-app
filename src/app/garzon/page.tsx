import { redirect } from "next/navigation";

export const instant = false;

// La grilla de mesas llega en la fase 4; por ahora el inicio del garzón son los despachos.
export default function WaiterHome() {
  redirect("/garzon/despachos");
}
