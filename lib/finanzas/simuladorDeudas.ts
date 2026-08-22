/**
 * lib/finanzas/simuladorDeudas.ts
 * ----------------------------------------------------------------------------
 * Motor de simulación de pago de deudas para el Módulo de Deudas.
 *
 * Estrategias:
 *  - Avalancha: prioriza la deuda con la TASA DE INTERÉS más alta.
 *               Matemáticamente óptima: minimiza el interés total pagado.
 *  - Bola de nieve: prioriza la deuda con el SALDO más bajo.
 *               Psicológicamente más motivante: genera "victorias rápidas"
 *               al liquidar deudas completas más seguido.
 *
 * En ambas, cuando una deuda se liquida, su pago mínimo se libera y se suma
 * a la "bola" que se aplica a la siguiente deuda prioritaria (efecto cascada
 * real de ambas estrategias, no solo reordenar).
 *
 * Todos los montos en MXN, tasas en % anual (ej. 42.5 para 42.5%).
 * ----------------------------------------------------------------------------
 */

export type Estrategia = "avalancha" | "bola_de_nieve";

export interface DeudaSimulacion {
  id: string;
  nombre: string;
  saldo: number;          // saldo actual
  tasaAnual: number;      // % anual, ej. 42.5
  pagoMinimo: number;     // pago mínimo mensual exigido
}

export interface MovimientoMensual {
  mes: number;                 // 1, 2, 3...
  deudaId: string;
  saldoInicial: number;
  interesGenerado: number;
  pagoAplicado: number;
  saldoFinal: number;
}

export interface ResultadoSimulacion {
  estrategia: Estrategia;
  mesesParaLiquidar: number;
  interesTotalPagado: number;
  totalPagado: number;
  ordenLiquidacion: { id: string; nombre: string; mesLiquidada: number }[];
  historial: MovimientoMensual[];
}

export interface Comparativa {
  base: ResultadoSimulacion;              // solo pagando mínimos
  conAportacion: ResultadoSimulacion;     // con aportación extra mensual
  mesesAhorrados: number;
  interesAhorrado: number;
}

const MAX_MESES_SIMULACION = 600; // límite de seguridad (50 años) para evitar loops infinitos

/**
 * Convierte una tasa anual (%) a tasa mensual efectiva simple, tal como la
 * mayoría de los estados de cuenta de tarjetas en México reportan el interés
 * ordinario mensual (tasa anual / 12).
 */
function tasaMensual(tasaAnual: number): number {
  return tasaAnual / 100 / 12;
}

/**
 * Determina el orden de prioridad de pago según la estrategia elegida.
 * No muta el arreglo original.
 */
function ordenarPorEstrategia(deudas: DeudaSimulacion[], estrategia: Estrategia): DeudaSimulacion[] {
  const copia = [...deudas];
  if (estrategia === "avalancha") {
    return copia.sort((a, b) => b.tasaAnual - a.tasaAnual);
  }
  // bola_de_nieve
  return copia.sort((a, b) => a.saldo - b.saldo);
}

/**
 * Corre la simulación mes a mes para un conjunto de deudas, una estrategia
 * y una aportación extra mensual (además de los pagos mínimos).
 *
 * aportacionExtraMensual = 0  →  representa el escenario "solo mínimos",
 * útil como línea base para calcular cuánto se ahorra el usuario.
 */
export function simularEstrategia(
  deudasIniciales: DeudaSimulacion[],
  aportacionExtraMensual: number,
  estrategia: Estrategia
): ResultadoSimulacion {
  // Estado mutable de la simulación: copia profunda de saldos
  let deudas = deudasIniciales.map((d) => ({ ...d }));
  const historial: MovimientoMensual[] = [];
  const ordenLiquidacion: { id: string; nombre: string; mesLiquidada: number }[] = [];

  let mes = 0;
  let interesTotalPagado = 0;
  let totalPagado = 0;

  while (deudas.some((d) => d.saldo > 0.01) && mes < MAX_MESES_SIMULACION) {
    mes += 1;

    // 1) Aplicar interés del mes a cada deuda activa
    for (const d of deudas) {
      if (d.saldo <= 0.01) continue;
      const interes = d.saldo * tasaMensual(d.tasaAnual);
      d.saldo += interes;
      interesTotalPagado += interes;
    }

    // 2) Calcular la "bola" disponible: aportación extra + mínimos liberados
    //    de deudas ya pagadas en meses anteriores (efecto cascada real).
    const deudasActivas = deudas.filter((d) => d.saldo > 0.01);
    const minimosLiberados = deudasIniciales
      .filter((original) => !deudasActivas.some((d) => d.id === original.id))
      .reduce((sum, d) => sum + d.pagoMinimo, 0);

    let bolaDisponible = aportacionExtraMensual + minimosLiberados;

    // 3) Orden de prioridad este mes (recalculado por si "avalancha" cambia
    //    de objetivo al variar tasas relativas — no aplica aquí porque las
    //    tasas son fijas, pero mantiene el motor correcto si se agregan
    //    tasas variables a futuro).
    const prioridad = ordenarPorEstrategia(deudasActivas, estrategia);

    // 4) Pagar mínimos a todas las deudas activas primero
    for (const d of deudasActivas) {
      const saldoInicial = d.saldo;
      const pagoMinimoReal = Math.min(d.pagoMinimo, d.saldo);
      d.saldo -= pagoMinimoReal;
      totalPagado += pagoMinimoReal;
      historial.push({
        mes,
        deudaId: d.id,
        saldoInicial,
        interesGenerado: saldoInicial * tasaMensual(d.tasaAnual),
        pagoAplicado: pagoMinimoReal,
        saldoFinal: d.saldo,
      });
    }

    // 5) Aplicar la bola completa a la deuda prioritaria (la primera con
    //    saldo > 0 tras pagar mínimos), y si se liquida, seguir con la
    //    siguiente en la misma corrida del mes (cascada dentro del mes).
    for (const objetivo of prioridad) {
      if (bolaDisponible <= 0) break;
      const dReal = deudas.find((x) => x.id === objetivo.id)!;
      if (dReal.saldo <= 0.01) continue;

      const pagoExtra = Math.min(bolaDisponible, dReal.saldo);
      dReal.saldo -= pagoExtra;
      bolaDisponible -= pagoExtra;
      totalPagado += pagoExtra;

      // Actualizar el registro de historial de este mes con el pago extra
      const registro = historial.filter((h) => h.mes === mes && h.deudaId === dReal.id).pop();
      if (registro) {
        registro.pagoAplicado += pagoExtra;
        registro.saldoFinal = dReal.saldo;
      }
    }

    // 6) Registrar liquidaciones ocurridas este mes
    for (const d of deudas) {
      if (d.saldo <= 0.01 && !ordenLiquidacion.some((o) => o.id === d.id)) {
        ordenLiquidacion.push({ id: d.id, nombre: d.nombre, mesLiquidada: mes });
      }
    }
  }

  return {
    estrategia,
    mesesParaLiquidar: mes,
    interesTotalPagado: Math.round(interesTotalPagado * 100) / 100,
    totalPagado: Math.round(totalPagado * 100) / 100,
    ordenLiquidacion,
    historial,
  };
}

/**
 * Compara "solo pagar mínimos" vs. "con aportación extra" para mostrar al
 * usuario cuántos meses e intereses se ahorra con una estrategia dada.
 * Esto alimenta directamente el simulador visual del Módulo de Deudas.
 */
export function compararConYSinAportacion(
  deudas: DeudaSimulacion[],
  aportacionExtraMensual: number,
  estrategia: Estrategia
): Comparativa {
  const base = simularEstrategia(deudas, 0, estrategia);
  const conAportacion = simularEstrategia(deudas, aportacionExtraMensual, estrategia);

  return {
    base,
    conAportacion,
    mesesAhorrados: base.mesesParaLiquidar - conAportacion.mesesParaLiquidar,
    interesAhorrado:
      Math.round((base.interesTotalPagado - conAportacion.interesTotalPagado) * 100) / 100,
  };
}

/**
 * Compara ambas estrategias entre sí con la misma aportación extra, para
 * el toggle "Bola de nieve vs. Avalancha" del dashboard/módulo de deudas.
 */
export function compararEstrategias(
  deudas: DeudaSimulacion[],
  aportacionExtraMensual: number
): { avalancha: ResultadoSimulacion; bolaDeNieve: ResultadoSimulacion; diferenciaInteres: number } {
  const avalancha = simularEstrategia(deudas, aportacionExtraMensual, "avalancha");
  const bolaDeNieve = simularEstrategia(deudas, aportacionExtraMensual, "bola_de_nieve");

  return {
    avalancha,
    bolaDeNieve,
    // Positivo = avalancha ahorra más interés que bola de nieve (lo usual,
    // aunque bola de nieve puede ganar en motivación/adherencia real).
    diferenciaInteres:
      Math.round((bolaDeNieve.interesTotalPagado - avalancha.interesTotalPagado) * 100) / 100,
  };
}

/* ----------------------------------------------------------------------------
 * EJEMPLO DE USO (referencia para el equipo de frontend / API route):
 *
 * const deudas: DeudaSimulacion[] = [
 *   { id: "1", nombre: "TDC BBVA Oro",  saldo: 18400, tasaAnual: 42.5, pagoMinimo: 1200 },
 *   { id: "2", nombre: "Préstamo Kueski", saldo: 6200, tasaAnual: 55.0, pagoMinimo: 700 },
 *   { id: "3", nombre: "TDC Nu Platino", saldo: 3100, tasaAnual: 38.0, pagoMinimo: 400 },
 * ];
 *
 * const comparativa = compararConYSinAportacion(deudas, 1500, "avalancha");
 * // comparativa.mesesAhorrados, comparativa.interesAhorrado
 * -------------------------------------------------------------------------- */
