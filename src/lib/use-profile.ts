"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Nombre del usuario del personal con sesión iniciada (null mientras carga). */
export function useProfileName() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from("profiles").select("name").eq("id", auth.user.id).single();
      if (!cancelled && data) setName(data.name);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return name;
}
