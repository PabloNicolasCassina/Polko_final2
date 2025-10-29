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
}

export function buildAutoTestData(params: AutoTestDataParams): any {
    const { autoBase, compania, tieneGNC, billingConfig, paymentCombo, installment } = params;

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
        [compania]: true
    };

    // Puedes añadir validaciones aquí si es necesario

    return datosAutoParaTest;
}