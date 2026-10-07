// data/companyBillingConfigs.ts

// Define los tipos de pago detallados
type DetailedPaymentMethod = "Tarjeta de crédito" | "Débito por CBU";
// Define los tipos de pago primarios
type PrimaryPaymentMethod = "Medios electrónicos" | "Efectivo" | "Tarjeta de crédito" | "Débito por CBU" | "Tarjeta de débito"; // Añade otros si existen

export interface BillingOptionConfig {
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

  'sancor': [
    {
      type: "Anual",
      // Define explícitamente las combinaciones válidas
      validPaymentCombinations: [
          { primary: "Tarjeta de crédito" },
          { primary: "Débito por CBU" },
          { primary: "Efectivo" } // Añade si 'Efectivo' es válido para Trimestral
      ],
      validInstallments: ["1"]
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
  
  'rivadavia': [
    {
      type: "Trimestral",
      validPaymentCombinations: [
          { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
          { primary: "Medios electrónicos", secondary: "Débito por CBU" },
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
    {
      type: "Semestral",
      validPaymentCombinations: [
          { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
          { primary: "Medios electrónicos", secondary: "Débito por CBU" },
      ],
      validInstallments: ["1", "6"]
    },
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
  'zurich': [
    {
      type: "Mensual",
      validPaymentCombinations: [
          { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
          { primary: "Medios electrónicos", secondary: "Débito por CBU" },
          { primary: "Efectivo" }
      ],
      validInstallments: ["1"]
    },
    // ... otras facturaciones para Zurich si existen
  ],
  'rus': [
    {
      type: "Mensual",
      validPaymentCombinations: [
          { primary: "Tarjeta de crédito" },
          { primary: "Débito por CBU" },
          { primary: "Efectivo" }
      ],
      validInstallments: ["1"]
    },
    // ... otras facturaciones para Zurich si existen
  ],
  'atm': [
    {
      type: "Mensual",
      validPaymentCombinations: [
          { primary: "Tarjeta de crédito" },
          { primary: "Débito por CBU" }
      ],
      validInstallments: ["1"]
    },
    {
      type: "Bimestral",
      validPaymentCombinations: [
          { primary: "Tarjeta de crédito" },
          { primary: "Débito por CBU" },
          { primary: "Efectivo" }
      ],
      validInstallments: ["1", "2"]
    },
    {
      type: "Trimestral",
      validPaymentCombinations: [
          { primary: "Efectivo" }
      ],
      validInstallments: ["1", "2", "3"]
    }
  ],
  'federacion_patronal': [
    {
      type: "Mensual",
      validPaymentCombinations: [
          { primary: "Tarjeta de crédito" },
          { primary: "Débito por CBU" },
          { primary: "Efectivo" }
      ],
      validInstallments: ["1"]
    }
  ],
  'mercantil_andina': [
    {
      type: "Mensual",
      validPaymentCombinations: [
          { primary: "Tarjeta de crédito" },
          { primary: "Débito por CBU" },
          { primary: "Tarjeta de débito" },
          { primary: "Efectivo" }
      ],
      validInstallments: ["1"]
    },
    {
      type: "Cuatrimestral",
      validPaymentCombinations: [
          { primary: "Tarjeta de crédito" },
          { primary: "Débito por CBU" },
          { primary: "Tarjeta de débito" },
          { primary: "Efectivo" }
      ],
      validInstallments: ["1", "4"]
    }
  ],
  'experta': [
    {
      type: "Mensual",
      validPaymentCombinations: [
          { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
          { primary: "Medios electrónicos", secondary: "Débito por CBU" },
          { primary: "Efectivo" }
      ],
      validInstallments: ["1"]
    }
  ],
};