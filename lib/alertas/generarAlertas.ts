/**
 * lib/alertas/generarAlertas.ts
 * ----------------------------------------------------------------------------
 * Construye la vista unificada del Calendario Financiero (Módulo 4) a partir
 * de tres fuentes distintas — cortes/límites de tarjetas, cuotas de MSI y
 * servicios recurrentes — y calcula el nivel de urgencia de cada una para
 * el sistema de alertas anti-mora.
 *
 * Este módulo NO envía notificaciones (eso vive en un job/cron separado,
 * ej. Supabase Edge Function con pg_cron); solo calcula QUÉ y CUÁNDO alertar.
 * ----------------------------------------------------------------------------
 */

export type TipoEvento = "corte" | "limite_pago" | "msi_cuota" | "servicio_recurrente";
export type Urgencia = "vencido" | "critico" | "proximo" | "normal";

export interface EventoFinanciero {
  id: string;                 // id único del evento (compuesto, ver builders abajo)
  tipoEvento: TipoEvento;
  referenciaId: string;       // id de la tabla origen (deuda, msi_cuota, servicio)
  titulo: string;
  subtitulo?: string;         // ej. "Después de esta fecha genera intereses"
  fecha: Date;
  monto?: number;
  colorHex: string;
  diasRestantes: number;      // negativo si ya venció
  urgencia: Urgencia;
}

// ---- Entradas mínimas que necesita este módulo de cada tabla origen --------

export interface CuentaParaCalendario {
  id: string;
  nombre: string;
  colorHex: string;
  diaCorte: number;              // 1-31
  diasParaLimitePago: number;    // días entre corte y fecha límite
  saldoActual: number;
}

export interface MsiCuotaParaCalendario {
  id: string;
  compraNombre: string;          // "Liverpool 6/12"
  fechaEstimada: Date;
  monto: number;
  pagada: boolean;
}

export interface ServicioParaCalendario {
  id: string;
  nombre: string;
  categoria: string;
  diaVencimiento: number;        // 1-31
  montoEstimado?: number;
  colorHex: string;
}

const DIAS_AVISO_POR_DEFECTO = 3;

/** Devuelve la próxima fecha del mes con el día indicado (maneja fin de mes). */
function proximaFechaConDia(dia: number, desde: Date = new Date()): Date {
  const anio = desde.getFullYear();
  const mes = desde.getMonth();
  const diaAjustado = Math.min(dia, new Date(anio, mes + 1, 0).getDate());
  let candidata = new Date(anio, mes, diaAjustado);
  if (candidata < desde) {
    const diaSiguienteMes = Math.min(dia, new Date(anio, mes + 2, 0).getDate());
    candidata = new Date(anio, mes + 1, diaSiguienteMes);
  }
  return candidata;
}

function diasEntre(desde: Date, hasta: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b.getTime() - a.getTime()) / msPorDia);
}

function calcularUrgencia(diasRestantes: number, diasAviso: number): Urgencia {
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes === 0) return "critico";
  if (diasRestantes <= diasAviso) return "proximo";
  return "normal";
}

// ---- Builders por fuente -----------------------------------------------------

/** Genera los dos eventos clave de una tarjeta: fecha de corte y fecha límite de pago. */
export function eventosDeCuenta(cuenta: CuentaParaCalendario, hoy: Date = new Date()): EventoFinanciero[] {
  const fechaCorte = proximaFechaConDia(cuenta.diaCorte, hoy);
  const fechaLimite = new Date(fechaCorte);
  fechaLimite.setDate(fechaLimite.getDate() + cuenta.diasParaLimitePago);

  const diasCorte = diasEntre(hoy, fechaCorte);
  const diasLimite = diasEntre(hoy, fechaLimite);

  return [
    {
      id: `corte-${cuenta.id}`,
      tipoEvento: "corte",
      referenciaId: cuenta.id,
      titulo: `${cuenta.nombre} · Corte`,
      subtitulo: "El saldo de este día define tu próximo pago",
      fecha: fechaCorte,
      colorHex: cuenta.colorHex,
      diasRestantes: diasCorte,
      urgencia: calcularUrgencia(diasCorte, DIAS_AVISO_POR_DEFECTO),
    },
    {
      id: `limite-${cuenta.id}`,
      tipoEvento: "limite_pago",
      referenciaId: cuenta.id,
      titulo: `${cuenta.nombre} · Límite de pago`,
      subtitulo: "Paga antes de esta fecha para no generar intereses",
      fecha: fechaLimite,
      monto: cuenta.saldoActual,
      colorHex: "#B23A2E",
      diasRestantes: diasLimite,
      urgencia: calcularUrgencia(diasLimite, DIAS_AVISO_POR_DEFECTO),
    },
  ];
}

/** Convierte cuotas de MSI pendientes en eventos del calendario. */
export function eventosDeMsi(cuotas: MsiCuotaParaCalendario[], hoy: Date = new Date()): EventoFinanciero[] {
  return cuotas
    .filter((c) => !c.pagada)
    .map((c) => {
      const dias = diasEntre(hoy, c.fechaEstimada);
      return {
        id: `msi-${c.id}`,
        tipoEvento: "msi_cuota" as const,
        referenciaId: c.id,
        titulo: `MSI · ${c.compraNombre}`,
        fecha: c.fechaEstimada,
        monto: c.monto,
        colorHex: "#B23368",
        diasRestantes: dias,
        urgencia: calcularUrgencia(dias, DIAS_AVISO_POR_DEFECTO),
      };
    });
}

/** Convierte servicios recurrentes en eventos del próximo vencimiento. */
export function eventosDeServicios(
  servicios: ServicioParaCalendario[],
  hoy: Date = new Date()
): EventoFinanciero[] {
  return servicios.map((s) => {
    const fecha = proximaFechaConDia(s.diaVencimiento, hoy);
    const dias = diasEntre(hoy, fecha);
    return {
      id: `servicio-${s.id}`,
      tipoEvento: "servicio_recurrente" as const,
      referenciaId: s.id,
      titulo: s.nombre,
      subtitulo: s.categoria,
      fecha,
      monto: s.montoEstimado,
      colorHex: s.colorHex,
      diasRestantes: dias,
      urgencia: calcularUrgencia(dias, DIAS_AVISO_POR_DEFECTO),
    };
  });
}

/**
 * Une las tres fuentes en una sola lista ordenada cronológicamente — esta es
 * la función que consume la pantalla de Calendario Financiero.
 */
export function construirCalendario(
  cuentas: CuentaParaCalendario[],
  cuotasMsi: MsiCuotaParaCalendario[],
  servicios: ServicioParaCalendario[],
  hoy: Date = new Date()
): EventoFinanciero[] {
  const eventos = [
    ...cuentas.flatMap((c) => eventosDeCuenta(c, hoy)),
    ...eventosDeMsi(cuotasMsi, hoy),
    ...eventosDeServicios(servicios, hoy),
  ];
  return eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/**
 * Filtra solo lo que amerita una alerta activa (vencido, crítico o próximo),
 * ordenado por urgencia. Esto es lo que se muestra en el banner de alertas
 * del dashboard y lo que dispara notificaciones push/email.
 */
export function alertasActivas(eventos: EventoFinanciero[]): EventoFinanciero[] {
  const peso: Record<Urgencia, number> = { vencido: 0, critico: 1, proximo: 2, normal: 3 };
  return eventos
    .filter((e) => e.urgencia !== "normal")
    .sort((a, b) => peso[a.urgencia] - peso[b.urgencia] || a.diasRestantes - b.diasRestantes);
}

/**
 * Agrupa eventos por fecha (clave YYYY-MM-DD) para renderizar una vista de
 * agenda día por día, como la usa el componente CalendarioFinanciero.jsx.
 */
export function agruparPorDia(eventos: EventoFinanciero[]): Record<string, EventoFinanciero[]> {
  return eventos.reduce((acc, ev) => {
    const clave = ev.fecha.toISOString().slice(0, 10);
    (acc[clave] ||= []).push(ev);
    return acc;
  }, {} as Record<string, EventoFinanciero[]>);
}
