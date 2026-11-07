import { ShiftStart } from "@/components/layout/ShiftStart";
import { WaiterAlerts } from "./WaiterAlerts";

// Vista del garzón: columna móvil centrada (diseño a 390 px).
export default function WaiterLayout({ children }: LayoutProps<"/garzon">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface">
      <ShiftStart description="Activa el aviso sonoro de platos listos y llamados de las mesas, y mantiene la pantalla encendida durante el turno.">
        <WaiterAlerts />
        {children}
      </ShiftStart>
    </div>
  );
}
