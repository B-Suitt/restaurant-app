import Link from "next/link";
import { Card } from "@/components/ui/Card";

/** Tarjeta con un mensaje y un enlace para seguir ("No encontramos… Volver a…"). */
export function LinkNotice({ text, href, linkLabel }: { text: string; href: string; linkLabel: string }) {
  return (
    <Card className="py-10 text-center text-base text-muted">
      {text}{" "}
      <Link href={href} className="text-primary hover:underline">
        {linkLabel}
      </Link>
    </Card>
  );
}
