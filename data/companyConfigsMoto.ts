interface MotoConfig {
  formaPago: string;
  cantCuotas: (string | number);
  // Puedes añadir aquí otros campos si también varían,
  // como 'ajusteAutomatico', etc.
  ajusteAutomatico?: string;
  usoVehiculo?: string;
}

/**
 * Define las combinaciones válidas de Configuración Avanzada para MOTO.
 * Debes completar esto con las combinaciones reales que la UI permite.
 */
export const companyConfigsMoto: { [key: string]: MotoConfig[] } = {
  'sancor': [
    { formaPago: "Tarjeta de crédito", cantCuotas: 1 },
    { formaPago: "Débito por CBU", cantCuotas: 1 },
    { formaPago: "Efectivo", cantCuotas: 1 },
  ],
  'rivadavia': [
    { formaPago: "Tarjeta de crédito", cantCuotas: 1 },
    { formaPago: "Débito por CBU", cantCuotas: 1 },
  ],
  'rus': [
    // Escenario 1: Probar "No aplicar" + "Particular" + "Débito por CBU"
    { 
      formaPago: "Débito por CBU", 
      cantCuotas: 1, 
      ajusteAutomatico: "No aplicar", 
      usoVehiculo: "Particular" 
    },
    // Escenario 2: Probar "Aplicar 20%" + "Particular" + "Tarjeta de crédito"
    { 
      formaPago: "Tarjeta de crédito", 
      cantCuotas: 1, 
      ajusteAutomatico: "Aplicar 20%", 
      usoVehiculo: "Particular" 
    },
    // Escenario 3: Probar "Aplicar 30%" (reutilizamos Pago y Uso)
    { 
      formaPago: "Débito por CBU", 
      cantCuotas: 1, 
      ajusteAutomatico: "Aplicar 30%", 
      usoVehiculo: "Particular" 
    },
    // Escenario 4: Probar "Aplicar 40%" (reutilizamos Pago y Uso)
    { 
      formaPago: "Débito por CBU", 
      cantCuotas: 1, 
      ajusteAutomatico: "Aplicar 40%", 
      usoVehiculo: "Particular" 
    },
    // Escenario 5: Probar "Comercial" (con un ajuste y pago estándar)
    { 
      formaPago: "Tarjeta de crédito", 
      cantCuotas: 1, 
      ajusteAutomatico: "No aplicar", 
      usoVehiculo: "Comercial" 
    }
  ],
  'atm': [
    { formaPago: "Tarjeta de crédito", cantCuotas: 1 },
    { formaPago: "Débito por CBU", cantCuotas: 1 },
    { formaPago: "Efectivo", cantCuotas: 1 },
  ],
};