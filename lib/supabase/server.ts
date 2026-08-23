import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
   setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se ignora si se llama desde un Server Component sin permiso de
            // escritura de cookies; el middleware se encarga de refrescar sesión.
          }
        },
      },
    }
  );
}

// Alias usado por app/api/recibos/ocr/route.ts y otras Route Handlers
export const createClient = createServerSupabaseClient;
