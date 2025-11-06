// helpers/testDataBuilder.ts
import configs from "../data/configsAvanzadas.json"; // Necesita acceso a configsAvanzadas

// Define una interfaz para mayor claridad (opcional pero bueno)
interface AutoTestDataParams {
    autoBase: any;
    compania: string;
    tieneGNC: boolean;
    billingConfig: any; // El objeto 'config' del bucle
    paymentCombo: any; // El objeto 'paymentCombo' del bucle
    installment: string | number;
    tieneConfigAvanzada: boolean; // Nuevo parámetro opcional
}

interface MotoTestDataParams {
    motoBase: any;
    compania: string;
    tieneConfigAvanzada: boolean;
    config: { // Objeto de companyConfigsMoto
        formaPago: string;
        cantCuotas: string | number;
        ajusteAutomatico?: string;
        usoVehiculo?: string;
    };
}


export function buildAutoTestData(params: AutoTestDataParams): any {
    const { autoBase, compania, tieneGNC, billingConfig, paymentCombo, installment, tieneConfigAvanzada } = params;

    // Obtiene la configuración default para la compañía
    const configEspecificaDefault = configs.autos[compania as keyof typeof configs.autos] || {};

    // Construye el objeto final combinando fuentes y priorizando los datos de la combinación actual
    const datosAutoParaTest = {
        // 1. Datos base del vehículo
        ...autoBase,
        // 2. Configuraciones fijas por compañía (pueden ser sobrescritas)
        ...configEspecificaDefault,
        // 3. Valores específicos de ESTA combinación (SOBRESCRIBEN defaults)
        gnc: tieneGNC,
        tipoFacturacion: billingConfig.type,
        formaPago: paymentCombo.primary,
        formaPagoDetalle: paymentCombo.secondary, // Será undefined si no existe
        cantCuotas: installment.toString(),
        // 4. Añadir el flag booleano de la compañía activa
        [compania]: true,
        // 5. Añadir configuración avanzada si aplica
        configAvanzada: tieneConfigAvanzada
    };

    // Puedes añadir validaciones aquí si es necesario

    return datosAutoParaTest;
}

// ... (buildAutoTestData y su interfaz ya existen) ...


export function buildMotoTestData(params: MotoTestDataParams): any {
    const { motoBase, compania, tieneConfigAvanzada, config } = params;

    // Moto no parece tener un 'configsAvanzadas.json',
    // así que el merge es más simple.
    const datosMotoParaTest = {
        // 1. Datos base de la moto
        ...motoBase,
        // 2. Valores específicos de ESTA combinación
        tieneConfigAvanzada: tieneConfigAvanzada,
        formaPago: config.formaPago,
        cantCuotas: config.cantCuotas.toString(),
        ajusteAutomatico: config.ajusteAutomatico,
        usoVehiculo: config.usoVehiculo,
        // 3. Flag de compañía (se añadirá en el spec)
        compania: compania
    };
    return datosMotoParaTest;
}