import { AdminSidebar } from "@/components/layout/AdminSidebar";

// Vista del administrador: escritorio (diseño a 1440 px) con menú lateral.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh bg-surface-muted">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
