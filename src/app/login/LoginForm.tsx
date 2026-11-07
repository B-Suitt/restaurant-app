"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { ROLE_HOME, requiredRole, type StaffRole } from "@/lib/roles";

export function LoginForm({ footnote }: { footnote: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    if (authError || !data.user) {
      setLoading(false);
      setError(
        authError?.message.match(/fetch|network/i)
          ? "Sin conexión. Revisa tu internet e inténtalo de nuevo."
          : authError?.message.match(/banned/i)
            ? "Tu cuenta está desactivada. Habla con el administrador."
            : "Correo o contraseña incorrectos.",
      );
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", data.user.id).maybeSingle();
    if (!profile || !profile.active) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        profile ? "Tu cuenta está desactivada. Habla con el administrador." : "Esta cuenta no pertenece al equipo.",
      );
      return;
    }

    // Vuelve a la ruta pedida solo si corresponde al rol de la persona.
    const role = profile.role as StaffRole;
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next && requiredRole(next) === role ? next : ROLE_HOME[role]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Correo electrónico">
        <Input name="email" type="email" autoComplete="email" placeholder="nombre@restaurante.cl" required />
      </Field>
      <Field label="Contraseña">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      <div className="flex flex-col items-end gap-1">
        <button type="button" className="cursor-pointer text-sm text-primary hover:underline" onClick={() => setShowHelp(true)}>
          ¿Olvidaste tu contraseña?
        </button>
        {showHelp && (
          <p className="text-right text-sm text-muted">Pídele al administrador que restablezca tu contraseña.</p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-sm bg-danger-bg p-3 text-md text-danger-fg">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading}>
        Iniciar sesión
      </Button>
      <p className="text-center text-sm text-muted">Acceso exclusivo para el equipo del restaurante.</p>
      <p className="text-center text-sm text-muted">{footnote}</p>
    </form>
  );
}
