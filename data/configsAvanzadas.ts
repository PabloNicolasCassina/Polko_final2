/**
 * Configuraciones avanzadas para las compañías de seguros de autos.
 * 
 * Cada compañía puede tener:
 * - Configuración simple: valores fijos para facturación, pago, etc.
 * - Configuración con combinaciones: múltiples combinaciones para generar tests dinámicamente
 */

export interface ConfigCombinacion {
  tipoFacturacion: string;
  cuota: string;
  ajusteAutomatico: string;
}

export interface ConfigAvanzada {
  ajusteAutomatico?: string;
  tipoFacturacion?: string;
  cantCuotas?: string;
  usoVehiculo?: string;
  formaPago?: string;
  usoDelVehiculo?: string;
  /** Porcentaje tope de descuento que aplica la compañía (0 = sin descuento) */
  descuentoTope?: number;
  /**
   * Valores de descuento a iterar en cartesiano.
   * Si no está, se usa [0, descuentoTope] (o [0] si tope=0).
   */
  descuentos?: number[];
  /** Configuraciones con múltiples combinaciones para generar tests dinámicos */
  combinaciones?: ConfigCombinacion[];
}

export interface ConfigsAvanzadas {
  autos: {
    [compania: string]: ConfigAvanzada;
  };
}

/**
 * Configuraciones avanzadas por compañía.
 * 
 * Las compañías con configuración simple usan valores fijos.
 * Las compañías con 'combinaciones' generan tests dinámicos para cada combinación.
 */
export const configs: ConfigsAvanzadas = {
  autos: {
    // Configuraciones simples
    rivadavia: {
      ajusteAutomatico: "Aplicar 10%",
      tipoFacturacion: "Trimestral",
      cantCuotas: "3",
      usoVehiculo: "Particular",
      descuentoTope: 15,
    },
    zurich: {
      formaPago: "Medios electrónicos",
      descuentoTope: 15,
    },
    rus: {
      ajusteAutomatico: "Aplicar 20%",
      usoDelVehiculo: "Particular",
      descuentoTope: 15,
    },
    triunfo: {
      usoVehiculo: "Particular",
      tipoFacturacion: "Mensual",
      formaPago: "Medios electrónicos",
      cantCuotas: "1",
      descuentoTope: 30,
    },
    federacion_patronal: {
      tipoFacturacion: "Mensual",
      descuentoTope: 0,
    },
    atm: {
      formaPago: "Débito por CBU",
      tipoFacturacion: "Mensual",
      cantCuotas: "1",
      ajusteAutomatico: "Aplicar 10%",
      descuentoTope: 20,
    },
    experta: {
      usoVehiculo: "Particular",
      formaPago: "Medios Electrónicos",
      descuentoTope: 0,
    },
    sancor: {
      usoVehiculo: "Particular",
      // 0% / 15% sin check adicional; 25% requiere "¿Necesitás un descuento adicional?"
      descuentoTope: 25,
      descuentos: [0, 15, 25],
    },
    
    // Mercantil Andina: configuración con combinaciones múltiples
    // Mensual: solo 1 cuota. Cuatrimestral: 1 y 4 cuotas. Ajuste automático: 10%, 25%, 50%.
    mercantil_andina: {
      descuentoTope: 25,
      combinaciones: [
        { tipoFacturacion: "Mensual", cuota: "1", ajusteAutomatico: "No aplicar" },
        { tipoFacturacion: "Cuatrimestral", cuota: "1", ajusteAutomatico: "Aplicar 10%" },
        { tipoFacturacion: "Cuatrimestral", cuota: "1", ajusteAutomatico: "Aplicar 25%" },
        { tipoFacturacion: "Cuatrimestral", cuota: "1", ajusteAutomatico: "Aplicar 50%" },
        { tipoFacturacion: "Cuatrimestral", cuota: "4", ajusteAutomatico: "Aplicar 10%" },
        { tipoFacturacion: "Cuatrimestral", cuota: "4", ajusteAutomatico: "Aplicar 25%" },
        { tipoFacturacion: "Cuatrimestral", cuota: "4", ajusteAutomatico: "Aplicar 50%" },
      ],
    },
  },
};

/**
 * Obtiene las combinaciones de una compañía si existen.
 * Útil para compañías como Mercantil Andina que tienen múltiples combinaciones.
 */
export function getCombinaciones(compania: string): ConfigCombinacion[] | undefined {
  return configs.autos[compania]?.combinaciones;
}

/**
 * Verifica si una compañía tiene combinaciones configuradas.
 */
export function tieneCombinaciones(compania: string): boolean {
  return !!configs.autos[compania]?.combinaciones;
}

/**
 * Obtiene el descuento tope configurado para una compañía (0 si no tiene).
 */
export function getDescuentoTope(compania: string): number {
  return configs.autos[compania]?.descuentoTope ?? 0;
}

/**
 * Valores de descuento a iterar en producto cartesiano.
 * Sancor: [0, 15, 25] — 15% sin check adicional, 25% con check.
 */
export function getDescuentos(compania: string): number[] {
  const cfg = configs.autos[compania];
  if (cfg?.descuentos?.length) {
    return cfg.descuentos;
  }
  const tope = cfg?.descuentoTope ?? 0;
  return tope > 0 ? [0, tope] : [0];
}
