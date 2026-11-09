"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/lib/roles";

type UserInput = {
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  password: string; // vacío al editar = conservar la actual
};

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

const ROLES: StaffRole[] = ["admin", "waiter", "kitchen"];
const MIN_PASSWORD = 8;
// Un usuario inactivo queda bloqueado en Auth (además de `profiles.active`) hasta reactivarlo.
const BANNED = "876000h";

/** Id del admin que llama; las acciones nunca confían en el navegador. */
async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", data.user.id).maybeSingle();
  return profile?.role === "admin" && profile.active ? data.user.id : null;
}

function validate(input: UserInput, isNew: boolean): string | null {
  if (!input.name.trim()) return "Indica el nombre.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "Revisa el correo electrónico.";
  if (!ROLES.includes(input.role)) return "Elige un rol válido.";
  if ((isNew || input.password) && input.password.length < MIN_PASSWORD) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  return null;
}

function authError(message: string | undefined): string {
  if (message && /already|registered|exists/i.test(message)) return "Ya existe una cuenta con ese correo.";
  return "No pudimos guardar el usuario. Inténtalo de nuevo.";
}

export async function createUser(input: UserInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "No tienes permiso para hacer esto." };
  const invalid = validate(input, true);
  if (invalid) return { ok: false, error: invalid };

  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    ban_duration: input.active ? "none" : BANNED,
  });
  if (created.error || !created.data.user) return { ok: false, error: authError(created.error?.message) };

  const id = created.data.user.id;
  const profile = await admin
    .from("profiles")
    .insert({ id, name: input.name.trim(), email, role: input.role, active: input.active });
  if (profile.error) {
    await admin.auth.admin.deleteUser(id); // sin perfil la cuenta no sirve: no dejarla a medias
    return { ok: false, error: "No pudimos guardar el usuario. Inténtalo de nuevo." };
  }
  return { ok: true, id };
}

export async function updateUser(id: string, input: UserInput): Promise<ActionResult> {
  const callerId = await requireAdmin();
  if (!callerId) return { ok: false, error: "No tienes permiso para hacer esto." };
  const invalid = validate(input, false);
  if (invalid) return { ok: false, error: invalid };
  // Evita que el admin se deje a sí mismo sin acceso al panel.
  if (id === callerId && (input.role !== "admin" || !input.active)) {
    return { ok: false, error: "No puedes quitarte el rol de administrador ni desactivar tu propia cuenta." };
  }

  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const auth = await admin.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
    ...(input.password ? { password: input.password } : {}),
    ban_duration: input.active ? "none" : BANNED,
  });
  if (auth.error) return { ok: false, error: authError(auth.error.message) };

  const profile = await admin
    .from("profiles")
    .update({ name: input.name.trim(), email, role: input.role, active: input.active })
    .eq("id", id);
  if (profile.error) return { ok: false, error: "No pudimos guardar el usuario. Inténtalo de nuevo." };
  return { ok: true, id };
}

/** Activa o desactiva desde la lista. */
export async function setUserActive(id: string, active: boolean): Promise<ActionResult> {
  const callerId = await requireAdmin();
  if (!callerId) return { ok: false, error: "No tienes permiso para hacer esto." };
  if (id === callerId && !active) return { ok: false, error: "No puedes desactivar tu propia cuenta." };

  const admin = createAdminClient();
  const auth = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : BANNED });
  if (auth.error) return { ok: false, error: "No pudimos cambiar el estado. Inténtalo de nuevo." };
  const profile = await admin.from("profiles").update({ active }).eq("id", id);
  if (profile.error) return { ok: false, error: "No pudimos cambiar el estado. Inténtalo de nuevo." };
  return { ok: true, id };
}

/** Fechas de la cuenta (solo las conoce Auth). */
export async function getUserDates(id: string): Promise<{ lastSignInAt: string | null; createdAt: string } | null> {
  if (!(await requireAdmin())) return null;
  const { data } = await createAdminClient().auth.admin.getUserById(id);
  if (!data.user) return null;
  return { lastSignInAt: data.user.last_sign_in_at ?? null, createdAt: data.user.created_at };
}
