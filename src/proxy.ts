import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { ROLE_HOME, requiredRole, type StaffRole } from "@/lib/roles";

/**
 * Refresca la sesión de Supabase y redirige según el rol en las rutas del personal.
 * Es una comprobación de experiencia de uso: la seguridad real está en RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const required = requiredRole(request.nextUrl.pathname);
  if (!required) return response;

  let role: StaffRole | null = null;
  const userId = data?.claims?.sub;
  if (userId) {
    const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", userId).maybeSingle();
    if (profile?.active) role = profile.role as StaffRole;
  }

  if (role === required) return response;

  const target = request.nextUrl.clone();
  target.search = "";
  if (role) {
    target.pathname = ROLE_HOME[role];
  } else {
    target.pathname = "/login";
    target.searchParams.set("next", request.nextUrl.pathname);
  }
  const redirect = NextResponse.redirect(target);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/garzon/:path*", "/cocina/:path*", "/admin/:path*"],
};
