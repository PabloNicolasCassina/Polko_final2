/**
 * Ejes de config avanzada por compañía para producto cartesiano
 * de regresionFullAuto.spec.ts (fuente: mapeo UI MAP-01 + AdvanceConfig).
 */

export interface CompanyAdvancedAxes {
  /** Valores de ajuste automático a iterar (vacío = no aplica) */
  ajustes: string[];
  /** Valores de uso del vehículo (vacío = no aplica) */
  usos: string[];
  /** Forma de pago de config avanzada (Zurich/Experta/Triunfo); vacío = usa billing */
  formasPagoConfig: string[];
  /** Iterar grúa on/off (Rivadavia) */
  grua: boolean[];
}

export const companyAdvancedAxes: Record<string, CompanyAdvancedAxes> = {
  sancor: {
    ajustes: [],
    usos: ["Particular", "Particular y/o Comercial"],
    formasPagoConfig: [],
    grua: [false],
  },
  rivadavia: {
    ajustes: ["Aplicar 10%", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
    usos: [
      "Particular",
      "Transporte de Bienes",
      "Servicios Especiales (Excepto Pick-Up)",
      "Servicios Especiales y Escolares (Pick-Up)",
    ],
    formasPagoConfig: [],
    grua: [false, true],
  },
  zurich: {
    ajustes: [],
    usos: [],
    formasPagoConfig: [],
    grua: [false],
  },
  rus: {
    ajustes: ["No aplicar", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
    usos: ["Particular", "Comercial"],
    formasPagoConfig: [],
    grua: [false],
  },
  federacion_patronal: {
    ajustes: [],
    usos: [],
    formasPagoConfig: [],
    grua: [false],
  },
  experta: {
    ajustes: [],
    usos: ["Particular", "Comercial"],
    formasPagoConfig: [],
    grua: [false],
  },
  atm: {
    ajustes: ["No aplicar", "Aplicar 10%", "Aplicar 20%"],
    usos: [],
    formasPagoConfig: [],
    grua: [false],
  },
  triunfo: {
    ajustes: [],
    usos: ["Particular", "Comercial", "Especial"],
    formasPagoConfig: [],
    grua: [false],
  },
  mercantil_andina: {
    // facturación/cuota/ajuste vienen de configsAvanzadas.combinaciones
    ajustes: [],
    usos: [],
    formasPagoConfig: [],
    grua: [false],
  },
};

export function orDefault<T>(values: T[], fallback: T): T[] {
  return values.length > 0 ? values : [fallback];
}
