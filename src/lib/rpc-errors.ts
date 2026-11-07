// Las funciones de la base de datos devuelven códigos cortos (ver supabase/migrations).
const MESSAGES: Record<string, string> = {
  invalid_qr: "Este código QR no es válido o la mesa no está disponible.",
  not_authenticated: "No pudimos iniciar tu sesión. Recarga la página.",
  forbidden: "No tienes permiso para hacer esto.",
  session_not_open: "La mesa ya fue cerrada.",
  empty_order: "Tu carrito está vacío.",
  invalid_quantity: "Revisa las cantidades del carrito.",
  dish_not_found: "Uno de los platos ya no está en la carta.",
  dish_unavailable: "Uno de los platos se agotó.",
  extra_not_found: "Uno de los adicionales ya no está disponible.",
  item_not_found: "No encontramos ese plato.",
  invalid_transition: "Ese plato ya cambió de estado. Actualizamos la vista.",
};

/** Mensaje en español para un error de Supabase o de red. */
export function errorMessage(error: { message?: string } | null | undefined): string {
  if (!error?.message) return "Algo salió mal. Inténtalo de nuevo.";
  if (MESSAGES[error.message]) return MESSAGES[error.message];
  if (/fetch|network/i.test(error.message)) return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
  return "Algo salió mal. Inténtalo de nuevo.";
}

/** Mensaje para un error de escritura directa en tablas (admin), según el código de Postgres. */
export function dbErrorMessage(
  error: { message?: string; code?: string } | null | undefined,
  messages: { unique?: string; inUse?: string } = {},
): string {
  if (error?.code === "23505") return messages.unique ?? "Ya existe un registro con esos datos.";
  if (error?.code === "23503") return messages.inUse ?? "No se puede eliminar porque tiene historial asociado.";
  if (error?.code === "42501") return MESSAGES.forbidden;
  return errorMessage(error);
}
