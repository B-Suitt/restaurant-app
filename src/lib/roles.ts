export type StaffRole = "admin" | "waiter" | "kitchen";

/** Ruta de inicio de cada rol. */
export const ROLE_HOME: Record<StaffRole, string> = {
  admin: "/admin",
  waiter: "/garzon",
  kitchen: "/cocina",
};

/** Rol requerido según el inicio de la ruta, o null si es pública. */
export function requiredRole(pathname: string): StaffRole | null {
  for (const [role, home] of Object.entries(ROLE_HOME) as [StaffRole, string][]) {
    if (pathname === home || pathname.startsWith(`${home}/`)) return role;
  }
  return null;
}
