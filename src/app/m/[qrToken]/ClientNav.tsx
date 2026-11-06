"use client";

import { BookOpen, ReceiptText, Wallet } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useClientSession } from "./ClientSessionProvider";

export function ClientNav({ active }: { active?: "menu" | "pedido" }) {
  const { basePath } = useClientSession();
  return (
    <BottomNav
      items={[
        { label: "Menú", icon: BookOpen, href: `${basePath}/menu`, active: active === "menu" },
        { label: "Mi pedido", icon: ReceiptText, href: `${basePath}/pedido`, active: active === "pedido" },
        { label: "Cuenta", icon: Wallet }, // fase 4
      ]}
    />
  );
}
