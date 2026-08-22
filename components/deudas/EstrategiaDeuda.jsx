"use client";
import React, { useMemo, useState } from "react";
import { compararConYSinAportacion } from "@/lib/finanzas/simuladorDeudas";

/**
 * EstrategiaDeuda — Módulo 2 (Bola de Nieve / Avalancha), sistema visual
 * "Emerald Finance" ya establecido en las pantallas de notificaciones y
 * scanner subidas por el equipo. Reutiliza EXACTAMENTE los mismos nombres
 * de token (bg-primary, text-on-tertiary-container, font-currency-display,
 * rounded-2xl, etc.) definidos en tailwind.config para que este componente
 * sea un drop-in sin retocar nada del theme.
 *
 * Requiere en el layout raíz (una sola vez, no por pantalla):
 *   <link href="...Hanken+Grotesk...JetBrains+Mono..." rel="stylesheet" />
 *   <link href="...Material+Symbols+Outlined..." rel="stylesheet" />
 * tal como ya se hace en code.html (notificaciones / scanner).
 *
 * Íconos: se usan spans .material-symbols-outlined con el mismo nombre de
 * ícono que en los otros mockups (storefront, warning, home, etc.) para
 * no introducir una segunda librería de iconos al proyecto.
 */

// --- Datos de la deuda: en producción vienen de la tabla `deudas` ----------
// Se añade `pagoParaNoGenerarIntereses` (el saldo de corte, no el mínimo)
// porque es un campo propio de la UI mexicana, distinto del pago mínimo
// que usa el motor de simulación para proyectar meses/intereses.
const deudasUI = [
  {
    id: "1",
    nombre: "Platinum Credit",
    ultimos4: "4921",
    saldo: 34200,
    tasaAnual: 55.0,
    pagoMinimo: 1450,
    pagoParaNoGenerarIntereses: 12450,
    porcentajeLineaUsada: 85,
    fechaCorte: "15 de Noviembre",
    fechaLimite: "05 de Diciembre",
    badge: { texto: "Urgente", tipo: "secondary" },
    color: "urgente", // mapea a secondary/error en el render
  },
  {
    id: "2",
    nombre: "Gold Rewards",
    ultimos4: "8832",
    saldo: 18500,
    tasaAnual: 38.0,
    pagoMinimo: 750,
    pagoParaNoGenerarIntereses: 4200,
    porcentajeLineaUsada: 45,
    fechaCorte: "22 de Noviembre",
    fechaLimite: "12 de Diciembre",
    badge: { texto: "6 MSI Activos", tipo: "tertiary" },
    color: "msi", // mapea a tertiary en el render
  },
];

const APORTACION_EXTRA_ASUMIDA = 1500; // MXN/mes — vendría de lo que el usuario definió al activar la estrategia

const fmt = (n) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function ordenarPorEstrategia(deudas, estrategia) {
  const copia = [...deudas];
  return estrategia === "avalancha"
    ? copia.sort((a, b) => b.tasaAnual - a.tasaAnual)
    : copia.sort((a, b) => a.saldo - b.saldo);
}

export default function EstrategiaDeuda() {
  const [estrategia, setEstrategia] = useState("bola_de_nieve");

  const deudasOrdenadas = useMemo(
    () => ordenarPorEstrategia(deudasUI, estrategia),
    [estrategia]
  );

  // Wiring real al motor de simulación construido en lib/finanzas/simuladorDeudas.ts
  const comparativa = useMemo(() => {
    const deudasEngine = deudasUI.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      saldo: d.saldo,
      tasaAnual: d.tasaAnual,
      pagoMinimo: d.pagoMinimo,
    }));
    return compararConYSinAportacion(deudasEngine, APORTACION_EXTRA_ASUMIDA, estrategia);
  }, [estrategia]);

  const totalAPagarSinIntereses = deudasUI.reduce((s, d) => s + d.pagoParaNoGenerarIntereses, 0);
  const deudaTotalConsolidada = deudasUI.reduce((s, d) => s + d.saldo, 0);

  return (
    <div className="min-h-screen w-full max-w-md mx-auto pb-28 bg-background text-on-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-margin-mobile pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-surface-container-high overflow-hidden flex-shrink-0" />
          <span className="font-headline-md text-headline-md text-primary font-bold">
            Emerald Finance
          </span>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
      </div>

      {/* Título */}
      <div className="px-margin-mobile mt-2">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold leading-tight">
          Estrategia de Deuda
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Optimiza tus pagos para liquidar más rápido.
        </p>
      </div>

      {/* Toggle de estrategia */}
      <div className="px-margin-mobile mt-4">
        <div className="flex bg-surface-container rounded-full p-1">
          <button
            onClick={() => setEstrategia("bola_de_nieve")}
            className={`flex-1 py-2.5 rounded-full font-label-md text-label-md transition-colors ${
              estrategia === "bola_de_nieve"
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            Bola de Nieve
          </button>
          <button
            onClick={() => setEstrategia("avalancha")}
            className={`flex-1 py-2.5 rounded-full font-label-md text-label-md transition-colors ${
              estrategia === "avalancha"
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            Avalancha
          </button>
        </div>
      </div>

      {/* Cards de deuda, ya ordenadas según la estrategia elegida */}
      <div className="px-margin-mobile mt-5 space-y-4">
        {deudasOrdenadas.map((d) => {
          const esUrgente = d.color === "urgente";
          const colorStripe = esUrgente ? "bg-secondary" : "bg-tertiary-container";
          const colorBarra = esUrgente ? "bg-secondary" : "bg-tertiary-container";
          const colorDeudaTotal = esUrgente ? "text-secondary" : "text-on-surface";
          const colorFechaLimite = esUrgente ? "text-secondary font-semibold" : "text-on-surface";
          const badgeBg = esUrgente ? "bg-secondary-container/20" : "bg-tertiary-container/20";
          const badgeText = esUrgente ? "text-secondary" : "text-tertiary";

          return (
            <div
              key={d.id}
              className="relative bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high overflow-hidden pl-5 pr-4 py-4"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorStripe}`} />

              <div className="flex items-start justify-between">
                <div>
                  <p className="font-headline-md text-body-lg font-semibold">{d.nombre}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant tracking-wider">
                    **** {d.ultimos4}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeBg} ${badgeText}`}
                >
                  {d.badge.tipo === "tertiary" && (
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                  )}
                  {d.badge.texto}
                </span>
              </div>

              <div className="flex justify-between items-start mt-4">
                <div>
                  <p className="text-xs text-on-surface-variant mb-1 leading-tight">
                    Pago para No
                    <br />
                    Generar Intereses
                  </p>
                  <p className="font-currency-display text-[28px] font-bold text-on-surface">
                    {fmt(d.pagoParaNoGenerarIntereses)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-on-surface-variant mb-1">Deuda Total</p>
                  <p className={`font-body-lg text-body-lg font-bold ${colorDeudaTotal}`}>
                    {fmt(d.saldo)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-on-surface-variant mb-1.5">
                  <span>Línea de Crédito Usada</span>
                  <span>{d.porcentajeLineaUsada}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-variant overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colorBarra}`}
                    style={{ width: `${d.porcentajeLineaUsada}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between mt-4 pt-3 border-t border-surface-container-high text-xs">
                <div>
                  <p className="text-on-surface-variant">Fecha de Corte</p>
                  <p className="font-medium mt-0.5">{d.fechaCorte}</p>
                </div>
                <div className="text-right">
                  <p className="text-on-surface-variant">Fecha Límite</p>
                  <p className={`mt-0.5 ${colorFechaLimite}`}>{d.fechaLimite}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen de estrategia — calculado con el motor de simulación real */}
      <div className="px-margin-mobile mt-5">
        <div className="bg-surface-container rounded-2xl p-5">
          <p className="font-headline-md text-body-lg font-semibold mb-4">Resumen de Estrategia</p>

          <p className="text-xs text-on-surface-variant">Total a Pagar (No Intereses)</p>
          <p className="font-currency-display text-[30px] font-bold text-primary">
            {fmt(totalAPagarSinIntereses)}
          </p>

          <div className="mt-3 pt-3 border-t border-outline-variant/30 flex justify-between text-sm">
            <span className="text-on-surface-variant">Deuda Total Consolidada</span>
            <span className="font-semibold">{fmt(deudaTotalConsolidada)}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-outline-variant/30 flex justify-between text-sm items-center">
            <span className="text-on-surface-variant leading-tight">
              Ahorro Proyectado
              <br />
              (Intereses)
            </span>
            <span className="font-currency-display text-[20px] font-bold text-primary">
              +{fmt(comparativa.interesAhorrado)}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-outline-variant/30 flex justify-between text-sm">
            <span className="text-on-surface-variant">Tiempo Estimado</span>
            <span className="font-bold">{comparativa.conAportacion.mesesParaLiquidar} Meses</span>
          </div>

          <button className="w-full mt-5 bg-primary text-on-primary font-body-lg text-body-lg font-semibold py-3.5 rounded-xl shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              payments
            </span>
            Pagar Estrategia
          </button>

          <button className="w-full mt-2.5 border border-outline-variant text-on-surface font-body-md text-body-md py-3 rounded-xl">
            Simular otra aportación
          </button>
        </div>
      </div>

      {/* Bottom nav — mismo patrón que en el mockup del Scanner */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-container-lowest shadow-[0_-4px_15px_rgba(0,0,0,0.04)] rounded-t-xl">
        <div className="flex justify-around items-center px-4 py-2">
          <button className="flex flex-col items-center gap-0.5 p-2 text-on-surface-variant">
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px]">Home</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 bg-primary-container text-on-primary-container rounded-full px-4 py-1">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_balance_wallet
            </span>
            <span className="text-[10px] font-bold">Deuda</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 p-2 text-on-surface-variant">
            <span className="material-symbols-outlined">document_scanner</span>
            <span className="text-[10px]">Scanner</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 p-2 text-on-surface-variant">
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="text-[10px]">Calendario</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
