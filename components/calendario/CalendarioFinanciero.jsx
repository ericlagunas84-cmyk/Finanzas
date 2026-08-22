import React, { useMemo, useState } from "react";

/**
 * CalendarioFinanciero — migrado al sistema "Emerald Finance". Vista de
 * agenda (no cuadrícula) con banner de alertas anti-mora y filtros por tipo.
 */

const ICONOS = { luz: "bolt", agua: "water_drop", internet: "wifi", streaming: "tv", tarjeta: "credit_card", msi: "receipt_long" };

const URGENCIA_STYLE = {
  vencido: { label: "Vencido", texto: "text-error", chip: "bg-error-container/40" },
  critico: { label: "Hoy", texto: "text-error", chip: "bg-error-container/40" },
  proximo: { label: "Próximo", texto: "text-tertiary", chip: "bg-tertiary-container/20" },
  normal: { label: null, texto: "", chip: "" },
};

const eventosDemo = [
  { id: "limite-1", tipoEvento: "limite_pago", titulo: "Platinum Credit · Límite de pago", subtitulo: "Paga antes de esta fecha para no generar intereses", fecha: new Date("2026-08-22"), monto: 12450, diasRestantes: 0, urgencia: "critico", icono: "tarjeta" },
  { id: "servicio-1", tipoEvento: "servicio_recurrente", titulo: "CFE", subtitulo: "luz", fecha: new Date("2026-08-25"), monto: 640, diasRestantes: 3, urgencia: "proximo", icono: "luz" },
  { id: "corte-2", tipoEvento: "corte", titulo: "Gold Rewards · Corte", subtitulo: "El saldo de este día define tu próximo pago", fecha: new Date("2026-08-24"), diasRestantes: 2, urgencia: "proximo", icono: "tarjeta" },
  { id: "msi-1", tipoEvento: "msi_cuota", titulo: "MSI · Liverpool 6/12", fecha: new Date("2026-08-28"), monto: 850, diasRestantes: 6, urgencia: "normal", icono: "msi" },
  { id: "servicio-2", tipoEvento: "servicio_recurrente", titulo: "Netflix", subtitulo: "streaming", fecha: new Date("2026-08-29"), monto: 219, diasRestantes: 7, urgencia: "normal", icono: "streaming" },
  { id: "servicio-3", tipoEvento: "servicio_recurrente", titulo: "Internet Totalplay", subtitulo: "internet", fecha: new Date("2026-09-01"), monto: 599, diasRestantes: 10, urgencia: "normal", icono: "internet" },
];

const fmt = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const formatearFecha = (f) => f.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });

export default function CalendarioFinanciero() {
  const [filtro, setFiltro] = useState("todos");

  const alertasCriticas = useMemo(
    () => eventosDemo.filter((e) => e.urgencia === "vencido" || e.urgencia === "critico"),
    []
  );

  const eventosFiltrados = useMemo(
    () => (filtro === "todos" ? eventosDemo : eventosDemo.filter((e) => e.tipoEvento === filtro)),
    [filtro]
  );

  const porDia = useMemo(() => {
    return eventosFiltrados.reduce((acc, ev) => {
      const clave = ev.fecha.toISOString().slice(0, 10);
      (acc[clave] ||= []).push(ev);
      return acc;
    }, {});
  }, [eventosFiltrados]);

  return (
    <div className="min-h-screen w-full max-w-md mx-auto pb-28 bg-background text-on-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-margin-mobile pt-6 pb-2">
        <button className="h-8 w-8 rounded-full bg-surface-container-lowest border border-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <h1 className="font-headline-md text-headline-md font-bold">Agosto 2026</h1>
        <button className="h-8 w-8 rounded-full bg-surface-container-lowest border border-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      {/* Banner de alertas anti-mora */}
      {alertasCriticas.length > 0 && (
        <div className="px-margin-mobile mb-1">
          <div className="rounded-2xl p-4 bg-secondary text-on-secondary">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <p className="text-xs font-medium">
                {alertasCriticas.length === 1
                  ? "1 pago necesita tu atención hoy"
                  : `${alertasCriticas.length} pagos necesitan tu atención hoy`}
              </p>
            </div>
            <div className="mt-2 space-y-1.5">
              {alertasCriticas.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-white/15 rounded-lg px-2.5 py-1.5">
                  <span className="text-[11px]">{a.titulo}</span>
                  {a.monto && (
                    <span className="font-currency-display text-[11px] font-bold">{fmt(a.monto)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 px-margin-mobile mt-3 overflow-x-auto pb-1">
        {[
          { id: "todos", label: "Todo" },
          { id: "limite_pago", label: "Límites de pago" },
          { id: "corte", label: "Cortes" },
          { id: "msi_cuota", label: "MSI" },
          { id: "servicio_recurrente", label: "Servicios" },
        ].map((f) => {
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap border ${
                activo
                  ? "bg-primary text-on-primary border-transparent"
                  : "text-on-surface-variant border-outline-variant bg-surface-container-lowest"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Agenda día por día */}
      <div className="mt-4 px-margin-mobile space-y-4">
        {Object.entries(porDia).map(([clave, eventos]) => {
          const fecha = eventos[0].fecha;
          const esHoy = clave === new Date("2026-08-22").toISOString().slice(0, 10);
          return (
            <div key={clave}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-xs font-semibold capitalize">{formatearFecha(fecha)}</span>
                {esHoy && (
                  <span className="text-[9px] font-bold uppercase text-on-primary bg-primary px-1.5 py-0.5 rounded-full">
                    Hoy
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {eventos.map((ev) => {
                  const style = URGENCIA_STYLE[ev.urgencia];
                  return (
                    <div
                      key={ev.id}
                      className="rounded-xl bg-surface-container-lowest border border-surface-container-high p-3 flex items-center gap-3"
                    >
                      <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 bg-surface-container">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                          {ICONOS[ev.icono] || "receipt_long"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{ev.titulo}</p>
                        {ev.subtitulo && <p className="text-[10.5px] text-on-surface-variant truncate">{ev.subtitulo}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {ev.monto && (
                          <p className="font-currency-display text-xs font-bold">{fmt(ev.monto)}</p>
                        )}
                        {style.label && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-medium mt-0.5 px-1.5 py-0.5 rounded-full ${style.chip} ${style.texto}`}>
                            <span className="material-symbols-outlined text-[10px]">schedule</span>
                            {style.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {Object.keys(porDia).length === 0 && (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-[28px]">check_circle</span>
            <p className="text-xs text-on-surface-variant mt-2">Sin pagos pendientes en esta categoría</p>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-container-lowest shadow-[0_-4px_15px_rgba(0,0,0,0.04)] rounded-t-xl">
        <div className="flex justify-around items-center px-4 py-2">
          <button className="flex flex-col items-center gap-0.5 p-2 text-on-surface-variant">
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px]">Home</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 p-2 text-on-surface-variant">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="text-[10px]">Deuda</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 p-2 text-on-surface-variant">
            <span className="material-symbols-outlined">document_scanner</span>
            <span className="text-[10px]">Scanner</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 bg-primary-container text-on-primary-container rounded-full px-4 py-1">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            <span className="text-[10px] font-bold">Calendario</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
