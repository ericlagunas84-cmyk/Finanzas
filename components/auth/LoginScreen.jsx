"use client";
import React, { useState, useTransition } from "react";

/**
 * LoginScreen — migrado al sistema "Emerald Finance". Mismo verde primario,
 * misma tipografía Hanken Grotesk/JetBrains Mono, mismos radios y spacing.
 */

export default function LoginScreen() {
  const [modo, setModo] = useState("login");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function manejarEnvio(e) {
    e.preventDefault();
    setError("");
    startTransition(() => {
      // Aquí se invoca el Server Action real: iniciarSesionConEmail / registrarseConEmail
    });
  }

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col px-margin-mobile bg-background text-on-surface">
      {/* Marca */}
      <div className="pt-16 pb-8">
        <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            account_balance
          </span>
        </div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold">
          {modo === "login" ? "Bienvenido de vuelta" : "Toma el control de tu dinero"}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1.5">
          {modo === "login"
            ? "Entra para ver tu gastable, deudas y próximos pagos."
            : "Deudas claras, MSI sin sorpresas y tus recibos en un solo lugar."}
        </p>
      </div>

      {/* Botones OAuth */}
      <div className="space-y-2.5">
        <button className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest py-3 text-sm font-medium">
          <span className="material-symbols-outlined text-[18px]">g_mobiledata</span>
          Continuar con Google
        </button>
        <button className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest py-3 text-sm font-medium">
          <span className="material-symbols-outlined text-[18px]">apple</span>
          Continuar con Apple
        </button>
      </div>

      {/* Separador */}
      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-outline-variant/50" />
        <span className="text-[11px] text-on-surface-variant">o con tu correo</span>
        <div className="h-px flex-1 bg-outline-variant/50" />
      </div>

      {/* Formulario */}
      <form onSubmit={manejarEnvio} className="space-y-3">
        {modo === "registro" && (
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">
              person
            </span>
            <input
              name="nombre"
              type="text"
              placeholder="Nombre"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 py-3 text-sm"
            />
          </div>
        )}

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">
            mail
          </span>
          <input
            name="email"
            type="email"
            placeholder="Correo electrónico"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 py-3 text-sm"
          />
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">
            lock
          </span>
          <input
            name="password"
            type={mostrarPassword ? "text" : "password"}
            placeholder="Contraseña"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-10 py-3 text-sm"
          />
          <button
            type="button"
            onClick={() => setMostrarPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
          >
            <span className="material-symbols-outlined text-[18px]">
              {mostrarPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>

        {modo === "login" && (
          <div className="flex justify-end">
            <button type="button" className="text-xs text-on-surface-variant underline underline-offset-2">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-error">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-on-primary bg-primary rounded-xl py-3.5 mt-1 disabled:opacity-50"
        >
          {isPending ? "Un momento…" : modo === "login" ? "Entrar" : "Crear cuenta"}
          {!isPending && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
        </button>
      </form>

      <div className="flex-1 flex items-end justify-center pb-8 pt-6">
        <p className="text-xs text-on-surface-variant">
          {modo === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            onClick={() => setModo(modo === "login" ? "registro" : "login")}
            className="font-semibold text-primary underline underline-offset-2"
          >
            {modo === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
