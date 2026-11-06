import { Suspense, type ReactNode } from "react";
import { ClientSessionProvider } from "./ClientSessionProvider";
import { LoadingScreen } from "./ClientScreens";

// La vista del cliente necesita su sesión anónima y la mesa antes de mostrar algo:
// entrar puede esperar; dentro, la navegación es instantánea porque el proveedor ya está montado.
export const instant = false;

// Vista del cliente: columna móvil centrada (diseño a 390 px).
export default function ClientLayout({ children, params }: LayoutProps<"/m/[qrToken]">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface">
      <Suspense fallback={<LoadingScreen />}>
        <ClientSession params={params}>{children}</ClientSession>
      </Suspense>
    </div>
  );
}

async function ClientSession({ params, children }: { params: Promise<{ qrToken: string }>; children: ReactNode }) {
  const { qrToken } = await params;
  return <ClientSessionProvider qrToken={decodeURIComponent(qrToken)}>{children}</ClientSessionProvider>;
}
