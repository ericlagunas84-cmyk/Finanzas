"use server";

/**
 * app/(auth)/actions.ts
 * ----------------------------------------------------------------------------
 * Server Actions que consume LoginScreen.jsx. Mantener la lógica de auth en
 * el servidor evita exponer manejo de sesión en el cliente y simplifica el
 * flujo OAuth (Google/Apple) con redirect de vuelta a /dashboard.
 * ----------------------------------------------------------------------------
 */

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ResultadoAuth {
  error?: string;
}

export async function iniciarSesionConEmail(formData: FormData): Promise<ResultadoAuth> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensaje genérico intencional: no confirmamos si el correo existe o no,
    // por seguridad (evita enumeración de cuentas).
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/dashboard");
}

export async function registrarseConEmail(formData: FormData): Promise<ResultadoAuth> {
  const nombre = String(formData.get("nombre") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!nombre || !email || !password) {
    return { error: "Completa todos los campos." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } }, // queda disponible para el trigger que crea la fila en `usuarios`
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Ya existe una cuenta con este correo." };
    }
    return { error: "No pudimos crear tu cuenta. Intenta de nuevo." };
  }

  // Si la confirmación de correo está activada en Supabase, no hay sesión aún.
  if (!data.session) {
    redirect("/verifica-tu-correo");
  }

  redirect("/onboarding");
}

export async function iniciarSesionConProveedor(proveedor: "google" | "apple") {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: proveedor,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    },
  });

  if (error || !data.url) {
    return { error: "No se pudo conectar con " + proveedor };
  }

  redirect(data.url);
}

export async function cerrarSesion() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
