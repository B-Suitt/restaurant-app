import { BellRing, Inbox, LayoutGrid } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";

export function WaiterNav({ active }: { active: "mesas" | "despachos" | "avisos" }) {
  return (
    <BottomNav
      items={[
        { label: "Mesas", icon: LayoutGrid, href: "/garzon", active: active === "mesas" },
        { label: "Despachos", icon: BellRing, href: "/garzon/despachos", active: active === "despachos" },
        { label: "Avisos", icon: Inbox, href: "/garzon/avisos", active: active === "avisos" },
      ]}
    />
  );
}
