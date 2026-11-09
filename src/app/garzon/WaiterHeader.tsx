import { UserRound } from "lucide-react";
import type { ComponentProps } from "react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { SignOutButton } from "@/components/layout/SignOutButton";

/** Cabecera de las vistas del garzón, con el botón para cerrar sesión. */
export function WaiterHeader(props: Omit<ComponentProps<typeof AppHeader>, "action">) {
  return (
    <AppHeader
      {...props}
      action={
        <SignOutButton>
          <HeaderIcon>
            <UserRound aria-hidden />
          </HeaderIcon>
        </SignOutButton>
      }
    />
  );
}
