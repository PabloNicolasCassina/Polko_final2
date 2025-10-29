// data/companyBillingConfigs.ts

// Define los tipos de pago detallados
type DetailedPaymentMethod = "Tarjeta de crédito" | "Débito por CBU";
// Define los tipos de pago primarios
type PrimaryPaymentMethod = "Medios electrónicos" | "Efectivo"; // Añade otros si existen

interface BillingOptionConfig {
  type: string;
  // Ahora especificamos las combinaciones válidas de pago primario y secundario
  validPaymentCombinations: {
      primary: PrimaryPaymentMethod;
      // 'secondary' es opcional, solo existe si primary es 'Medios electrónicos'
      secondary?: DetailedPaymentMethod;
  }[];
  validInstallments: (string | number)[];
}

export const companyBillingConfigs: { [key: string]: BillingOptionConfig[] } = {
  'rivadavia': [
    {
      type: "Trimestral",
      // Define explícitamente las combinaciones válidas
      validPaymentCombinations: [
          { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
          { primary: "Medios electrónicos", secondary: "Débito por CBU" },
          // { primary: "Efectivo" } // Añade si 'Efectivo' es válido para Trimestral
      ],
      validInstallments: ["3"]
    },
    {
      type: "Mensual",
      validPaymentCombinations: [
          { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
          { primary: "Medios electrónicos", secondary: "Débito por CBU" },
      ],
      validInstallments: ["1"]
    },
    // ... otras facturaciones para Rivadavia
  ],
  'triunfo': [
     {
       type: "Mensual",
       validPaymentCombinations: [
           { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" }, // Asumiendo que Triunfo solo permite Tarjeta con Medios Electrónicos
           { primary: "Medios electrónicos", secondary: "Débito por CBU" } // O quizás también CBU? Verifica la UI.
           // { primary: "Efectivo"} // Si fuera válido
       ],
       validInstallments: ["1"]
     },
     {
        type: "Trimestral",
        validPaymentCombinations: [
            { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
            { primary: "Medios electrónicos", secondary: "Débito por CBU" },
            { primary: "Efectivo" } // Asumiendo que Efectivo es válido para Trimestral
        ],
        validInstallments: ["1","2","3"]
     }
     // ...
  ],
  // ... Completa para TODAS las compañías con las combinaciones REALES
};