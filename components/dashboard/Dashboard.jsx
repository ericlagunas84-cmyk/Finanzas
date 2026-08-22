import React, { useState } from "react";

/**
 * Dashboard — migrado al sistema "Emerald Finance" (mismo tailwind.config
 * de las pantallas subidas: notificaciones, scanner, estrategia de deuda).
 * Mismo header, misma bottom nav, mismos tokens de color/tipografía.
 */

const fmt = (n) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const proximosPagos = [
  { id: 1, icono: "credit_card", nombre: "TDC Nu · Corte", fecha: "24 ago", monto: 3200, colorBg: "bg-primary-container/15", colorIcono: "text-primary" },
  { id: 2, icono: "bolt", nombre: "CFE", fecha: "26 ago", monto: 640, colorBg: "bg-tertiary-container/15", colorIcono: "text-tertiary" },
  { id: 3, icono: "receipt_long", nombre: "MSI · Liverpool 6/12", fecha: "28 ago", monto: 850, colorBg: "bg-secondary-container/15", colorIcono: "text-secondary" },
  { id: 4, icono: "tv", nombre: "Netflix", fecha: "29 ago", monto: 219, colorBg: "bg-primary-container/15", colorIcono: "text-primary" },
  { id: 5, icono: "wifi", nombre: "Internet Totalplay", fecha: "1 sep", monto: 599, colorBg: "bg-tertiary-container/15", colorIcono: "text-tertiary" },
];

const deudasResumen = [
  { id: 1, nombre: "Platinum Credit", saldo: 34200, pagado: 7800, urgente: true },
  { id: 2, nombre: "Gold Rewards", saldo: 18500, pagado: 9100, urgente: false },
];

export default function Dashboard() {
  const [tab, setTab] = useState("home");
  const gastable = 4850;
  const posicionCiclo = 62;

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

      {/* Saludo */}
      <div className="px-margin-mobile mt-2">
        <p className="text-xs text-on-surface-variant">Hola, Renata</p>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold">
          Viernes, 22 de agosto
        </h1>
      </div>

      {/* Hero — Gastable */}
      <div className="px-margin-mobile mt-4">
        <div className="rounded-2xl p-5 bg-primary text-on-primary shadow-sm">
          <div className="flex items-center gap-1.5 text-on-primary/70 text-xs uppercase tracking-wide">
            <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
            Gastable esta semana
          </div>
          <p className="font-currency-display text-[40px] font-bold mt-1">{fmt(gastable)}</p>
          <p className="text-on-primary/60 text-xs mt-1">
            Después de deudas, servicios y MSI de este mes
          </p>

          {/* Barra corte → fecha límite de pago */}
          <div className="mt-4 rounded-xl bg-white/10 p-3">
            <div className="flex justify-between text-[11px] text-on-primary/70 mb-1.5">
              <span>Corte TDC Nu · 24 ago</span>
              <span>Límite de pago · 14 sep</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 relative overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-fixed"
                style={{ width: `${posicionCiclo}%` }}
              />
            </div>
            <p className="text-[11px] text-on-primary/60 mt-1.5">
              Paga antes del límite y no generas intereses.
            </p>
          </div>
        </div>
      </div>

      {/* Próximos pagos */}
      <div className="mt-5">
        <div className="px-margin-mobile flex items-center justify-between mb-2">
          <h2 className="font-headline-md text-body-lg font-semibold">Próximos pagos</h2>
          <button className="text-xs text-on-surface-variant flex items-center gap-0.5">
            Ver calendario
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-margin-mobile pb-1">
          {proximosPagos.map((p) => (
            <div
              key={p.id}
              className="min-w-[130px] rounded-xl bg-surface-container-lowest border border-surface-container-high p-3 flex-shrink-0"
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${p.colorBg}`}>
                <span className={`material-symbols-outlined text-[16px] ${p.colorIcono}`}>{p.icono}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-tight">{p.fecha}</p>
              <p className="text-xs font-medium leading-tight mt-0.5">{p.nombre}</p>
              <p className="font-currency-display text-sm font-bold mt-1">{fmt(p.monto)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot de deudas */}
      <div className="px-margin-mobile mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-headline-md text-body-lg font-semibold">Tus deudas</h2>
          <button className="text-xs text-primary font-medium flex items-center gap-0.5">
            Ver estrategia
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>
        <div className="space-y-2.5">
          {deudasResumen.map((d) => {
            const pct = Math.round((d.pagado / d.saldo) * 100);
            return (
              <div
                key={d.id}
                className="rounded-xl bg-surface-container-lowest border border-surface-container-high p-3.5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{d.nombre}</p>
                  {d.urgente && (
                    <span className="text-[10px] font-semibold text-secondary bg-secondary-container/20 px-2 py-0.5 rounded-full">
                      Urgente
                    </span>
                  )}
                </div>
                <p className="font-currency-display text-lg font-bold mt-1">{fmt(d.saldo)}</p>
                <div className="h-1.5 rounded-full bg-surface-variant overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${d.urgente ? "bg-secondary" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerta anti-mora */}
      <div className="px-margin-mobile mt-5">
        <div className="rounded-xl p-3.5 flex items-start gap-2.5 bg-error-container/40">
          <span className="material-symbols-outlined text-error text-[18px] mt-0.5">warning</span>
          <div>
            <p className="text-xs font-medium text-on-error-container">Agua vence en 3 días</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {fmt(310)} · JMAS Juárez. Márcalo como pagado o prográmalo.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-container-lowest shadow-[0_-4px_15px_rgba(0,0,0,0.04)] rounded-t-xl">
        <div className="flex justify-around items-center px-4 py-2">
          {[
            { id: "home", icono: "home", label: "Home" },
            { id: "deuda", icono: "account_balance_wallet", label: "Deuda" },
            { id: "scanner", icono: "document_scanner", label: "Scanner" },
            { id: "calendario", icono: "calendar_month", label: "Calendario" },
          ].map((item) => {
            const activo = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center gap-0.5 ${
                  activo
                    ? "bg-primary-container text-on-primary-container rounded-full px-4 py-1"
                    : "p-2 text-on-surface-variant"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={activo ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icono}
                </span>
                <span className={`text-[10px] ${activo ? "font-bold" : ""}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
