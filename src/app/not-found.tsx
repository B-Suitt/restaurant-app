import Link from "next/link";
import { SearchX } from "lucide-react";
import { MessageScreen } from "@/components/layout/MessageScreen";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <MessageScreen
      icon={<SearchX aria-hidden />}
      title="No encontramos esta página."
      actions={
        <Link href="/" className={buttonClasses()}>
          Ir al inicio
        </Link>
      }
    >
      La dirección no existe o cambió. Si llegaste desde el código QR de tu mesa, vuelve a escanearlo.
    </MessageScreen>
  );
}
