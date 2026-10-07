// data/casosRepresentativos.ts
// Configuración de casos representativos para baterías de tests optimizadas

import { BillingOptionConfig } from "./tiposFacturacion";

export interface CasoRepresentativo {
    marca: string;
    modelo: string;
    año: string;
    tieneConfigAvanzada: boolean;
    tieneGNC: boolean;
    facturacion: string;
    paymentPrimary: string;
    paymentSecondary?: string;
    cuota: string;
}

// Define qué compañías usan batería de casos representativos
// Agrega aquí las compañías que quieras ejecutar solo con casos representativos
export const companiasConBateriaRepresentativa: string[] = ['triunfo', 'rivadavia', 'sancor', 'zurich', 'atm', 'rus'];

// Casos representativos genéricos (pueden aplicarse a cualquier compañía)
export const casosRepresentativosGenericos: CasoRepresentativo[] = [
    // Config avanzada, Trimestral, Efectivo, muestra GNC true y cuotas largas
    {
        marca: "RENAULT",
        modelo: "LOGAN",
        año: "2022",
        tieneConfigAvanzada: true,
        tieneGNC: true,
        facturacion: "Trimestral",
        paymentPrimary: "Efectivo",
        cuota: "3",
    },
    // Sin config avanzada, Mensual, Medios electrónicos > Tarjeta (LOGAN 2022)
    {
        marca: "RENAULT",
        modelo: "LOGAN",
        año: "2022",
        tieneConfigAvanzada: false,
        tieneGNC: false,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Tarjeta de crédito",
        cuota: "1",
    },
    // Config avanzada, Trimestral, Medios electrónicos > Tarjeta, cuota intermedia
    {
        marca: "TOYOTA",
        modelo: "HILUX",
        año: "2026",
        tieneConfigAvanzada: true,
        tieneGNC: true,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Tarjeta de crédito",
        cuota: "1",
    },
    // Config avanzada, Trimestral, Medios electrónicos > Débito por CBU, cuota corta
    {
        marca: "RENAULT",
        modelo: "LOGAN",
        año: "2022",
        tieneConfigAvanzada: true,
        tieneGNC: true,
        facturacion: "Trimestral",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Débito por CBU",
        cuota: "1",
    },
    // Config avanzada, Mensual, Medios electrónicos > Tarjeta, con GNC true
    {
        marca: "RENAULT",
        modelo: "LOGAN",
        año: "2022",
        tieneConfigAvanzada: true,
        tieneGNC: true,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Tarjeta de crédito",
        cuota: "1",
    },
    // Config avanzada, Mensual, Medios electrónicos > Débito por CBU, con GNC true
    {
        marca: "RENAULT",
        modelo: "LOGAN",
        año: "2022",
        tieneConfigAvanzada: true,
        tieneGNC: true,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Débito por CBU",
        cuota: "1",
    },
    // Config avanzada, Mensual, Medios electrónicos > Débito por CBU, con GNC false
    {
        marca: "TOYOTA",
        modelo: "HILUX",
        año: "2026",
        tieneConfigAvanzada: true,
        tieneGNC: false,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Débito por CBU",
        cuota: "1",
    },
    // Config avanzada, Mensual, Medios electrónicos > Débito por CBU, con GNC false (LOGAN 2022)
    {
        marca: "RENAULT",
        modelo: "LOGAN",
        año: "2022",
        tieneConfigAvanzada: true,
        tieneGNC: false,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Débito por CBU",
        cuota: "1",
    },
    // Config avanzada, Trimestral, Efectivo, con GNC false
    {
        marca: "RENAULT",
        modelo: "CLIO",
        año: "2008",
        tieneConfigAvanzada: true,
        tieneGNC: false,
        facturacion: "Trimestral",
        paymentPrimary: "Efectivo",
        cuota: "1",
    },
    // Config avanzada, Mensual, Medios electrónicos > Tarjeta, con GNC false (vehículo usado)
    {
        marca: "RENAULT",
        modelo: "CLIO",
        año: "2008",
        tieneConfigAvanzada: true,
        tieneGNC: false,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Tarjeta de crédito",
        cuota: "1",
    },
    // Sin config avanzada, Mensual, Medios electrónicos > Tarjeta
    {
        marca: "RENAULT",
        modelo: "LOGAN",
        año: "2026",
        tieneConfigAvanzada: false,
        tieneGNC: false,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Tarjeta de crédito",
        cuota: "1",
    },
    // Sin config avanzada, Mensual, Medios electrónicos > Débito por CBU
    {
        marca: "RENAULT",
        modelo: "LOGAN",
        año: "2026",
        tieneConfigAvanzada: false,
        tieneGNC: false,
        facturacion: "Mensual",
        paymentPrimary: "Medios electrónicos",
        paymentSecondary: "Débito por CBU",
        cuota: "1",
    },
];

/**
 * Verifica si un caso específico coincide con algún caso representativo
 */
export function esCasoRepresentativo(
    auto: any,
    tieneConfigAvanzada: boolean,
    tieneGNC: boolean,
    tipoFacturacion: BillingOptionConfig,
    metodoPago: { primary: string; secondary?: string },
    cuota: string | number,
    casosRepresentativos: CasoRepresentativo[] = casosRepresentativosGenericos
): boolean {
    return casosRepresentativos.some(caso =>
        caso.marca === auto.marca &&
        caso.modelo === auto.modelo &&
        caso.año === auto.año &&
        caso.tieneConfigAvanzada === tieneConfigAvanzada &&
        caso.tieneGNC === tieneGNC &&
        caso.facturacion === tipoFacturacion.type &&
        caso.paymentPrimary === metodoPago.primary &&
        (caso.paymentSecondary ?? null) === (metodoPago.secondary ?? null) &&
        caso.cuota === cuota.toString()
    );
}

/**
 * Verifica si una compañía usa batería de casos representativos
 */
export function usaBateriaRepresentativa(compania: string): boolean {
    return companiasConBateriaRepresentativa.includes(compania);
}

