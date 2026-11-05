/**
 * Datos de emisión de Asistencia al viajero (cotizador rediseñado, TerraWind + agregador Snuggle).
 * Los clientes son los que devuelve el buscador por CUIT en pre: la fecha de nacimiento es la real
 * del padrón y de ella sale la edad que se cotiza.
 */

export type RangoEtario = "0-75" | "76-85" | "86-90";

/** Rangos con los que Snuggle tarifa (ver `SNUGGLE_AGE_BANDS` en frontend_general). */
export const RANGOS_ETARIOS: Record<RangoEtario, { min: number; max: number }> = {
    "0-75": { min: 0, max: 75 },
    "76-85": { min: 76, max: 85 },
    "86-90": { min: 86, max: 90 },
};

/** TerraWind cubre hasta 85 años (`TERRAWIND_MAX_AGE`); 86-90 solo cotiza Snuggle. */
export const TERRAWIND_EDAD_MAXIMA = 85;
export const EDAD_MAXIMA_COTIZADOR = 90;

export type GeneroPasajero = "Masculino" | "Femenino";

export interface ClienteAsistencia {
    cuit: string;
    nombre: string;
    apellido: string;
    dni: string;
    /** dd/mm/yyyy, como la muestra el formulario de pasajeros. */
    fechaNacimiento: string;
    genero: GeneroPasajero;
    rango: RangoEtario;
    email: string;
    telefono: string;
}

export const CLIENTES_ASISTENCIA = {
    oviedo: {
        cuit: "20386485446",
        nombre: "Gabriel",
        apellido: "Oviedo",
        dni: "38648544",
        fechaNacimiento: "01/01/2000",
        genero: "Masculino",
        rango: "0-75",
        email: "qa.asistencia.oviedo@test.com",
        telefono: "3512334798",
    },
    sartori: {
        cuit: "27381618426",
        nombre: "Carla",
        apellido: "Sartori",
        dni: "38161842",
        fechaNacimiento: "01/01/2000",
        genero: "Femenino",
        rango: "0-75",
        email: "qa.asistencia.sartori@test.com",
        telefono: "3512334798",
    },
    felipeGomez: {
        cuit: "20952092570",
        nombre: "Felipe",
        apellido: "Gomez Gomez",
        dni: "95209257",
        fechaNacimiento: "30/04/1942",
        genero: "Masculino",
        rango: "76-85",
        email: "qa.asistencia.fgomez@test.com",
        telefono: "3512334798",
    },
    anselmoGomez: {
        cuit: "20920238247",
        nombre: "Anselmo",
        apellido: "Gomez",
        dni: "92023824",
        fechaNacimiento: "18/12/1940",
        genero: "Masculino",
        rango: "86-90",
        email: "qa.asistencia.agomez@test.com",
        telefono: "3512334798",
    },
} as const satisfies Record<string, ClienteAsistencia>;

/** Dos asegurados por emisión (dos vouchers), uno por rango etario combinado con uno de 0-75. */
export const GRUPOS_PASAJEROS: Record<string, { label: string; pasajeros: readonly ClienteAsistencia[] }> = {
    jovenes: { label: "0-75 + 0-75", pasajeros: [CLIENTES_ASISTENCIA.oviedo, CLIENTES_ASISTENCIA.sartori] },
    mayor76: { label: "76-85 + 0-75", pasajeros: [CLIENTES_ASISTENCIA.felipeGomez, CLIENTES_ASISTENCIA.oviedo] },
    mayor76Sartori: {
        label: "76-85 + 0-75 (Sartori)",
        pasajeros: [CLIENTES_ASISTENCIA.felipeGomez, CLIENTES_ASISTENCIA.sartori],
    },
    mayor86: { label: "86-90 + 0-75", pasajeros: [CLIENTES_ASISTENCIA.anselmoGomez, CLIENTES_ASISTENCIA.sartori] },
    mayores: {
        label: "76-85 + 86-90",
        pasajeros: [CLIENTES_ASISTENCIA.felipeGomez, CLIENTES_ASISTENCIA.anselmoGomez],
    },
};

export const CONTACTO_EMERGENCIA = { nombre: "Juan", apellido: "Perez", telefono: "3511112233" };

export interface DestinoAsistencia {
    label: string;
    /** Texto a tipear en "País de destino"; null = "Múltiples destinos". */
    busqueda: string | null;
    opcion: string | null;
    /** Región con la que products cotiza en Snuggle (`Snuggle/regions.py`). */
    regionSnuggle: string;
}

export const DESTINOS_ASISTENCIA = {
    argentina: { label: "Argentina", busqueda: "Argentina", opcion: "Argentina", regionSnuggle: "Territorio Nacional" },
    brasil: { label: "Brasil", busqueda: "Brasil", opcion: "Brasil", regionSnuggle: "Brasil" },
    estadosUnidos: {
        label: "Estados Unidos",
        busqueda: "Estados Unidos",
        opcion: "Estados Unidos de América",
        regionSnuggle: "Estados Unidos",
    },
    espania: { label: "España", busqueda: "España", opcion: "España", regionSnuggle: "Europa" },
    uruguay: { label: "Uruguay", busqueda: "Uruguay", opcion: "Uruguay", regionSnuggle: "Países Limítrofes" },
    multiples: { label: "Múltiples destinos", busqueda: null, opcion: null, regionSnuggle: "Resto del mundo" },
} as const satisfies Record<string, DestinoAsistencia>;

function pais(nombre: string, regionSnuggle: string): DestinoAsistencia {
    return { label: nombre, busqueda: nombre, opcion: nombre, regionSnuggle };
}

/**
 * Un país por cada región de destino de Snuggle, según cómo products resuelve `nombrePais`
 * (`Snuggle/regions.py`). "Asia / Oceanía" no tiene país que la resuelva: no se puede cotizar desde Polko.
 */
export const PAISES_POR_REGION_SNUGGLE: readonly DestinoAsistencia[] = [
    DESTINOS_ASISTENCIA.argentina,
    pais("Colombia", "América del sur"),
    pais("Canadá", "América del norte"),
    DESTINOS_ASISTENCIA.espania,
    pais("Egipto", "Africa"),
    pais("República Dominicana", "Caribe"),
    pais("Antártida", "Resto del mundo"),
    pais("Japón", "Asia"),
    pais("Australia", "Oceanía"),
    pais("México", "Caribe-México"),
    DESTINOS_ASISTENCIA.brasil,
    pais("Cuba", "Cuba"),
    pais("Venezuela", "Venezuela"),
    DESTINOS_ASISTENCIA.uruguay,
    DESTINOS_ASISTENCIA.estadosUnidos,
    pais("Costa Rica", "Latinoamérica"),
];

/** Días de cobertura que se cotizan por región. */
export const DIAS_COBERTURA_COTIZACION = [5, 15, 30, 60] as const;

/** Medios de pago del paso "Forma de pago" (solo TerraWind; Snuggle cobra con su checkout externo). */
export const MEDIOS_PAGO_TERRAWIND = ["Tarjeta de crédito", "Tarjeta de débito", "Transferencia"] as const;
export type MedioPagoTerraWind = (typeof MEDIOS_PAGO_TERRAWIND)[number];

/** Opciones del paso "Forma de pago" de Snuggle: solo aparece en planes que aceptan transferencia. */
export const MEDIOS_PAGO_SNUGGLE = ["Tarjeta", "Transferencia"] as const;
export type MedioPagoSnuggle = (typeof MEDIOS_PAGO_SNUGGLE)[number];

export type CompaniaAsistencia = "TerraWind" | "Snug_Assist" | "AXA" | "Europ_Assistance" | "Universal_Assistance";

export const COMPANIAS_ASISTENCIA: Record<
    CompaniaAsistencia,
    { label: string; tile: string; snuggle: boolean; proveedorSnuggle?: RegExp; proveedorAdmin?: string }
> = {
    TerraWind: { label: "TerraWind", tile: "TerraWind", snuggle: false },
    Snug_Assist: { label: "Snug Assist", tile: "Snug Assist", snuggle: true, proveedorSnuggle: /^snug(gle)?\s*assist/i, proveedorAdmin: "Snuggle Assist" },
    AXA: { label: "AXA", tile: "AXA", snuggle: true, proveedorSnuggle: /^axa/i, proveedorAdmin: "Axa" },
    Europ_Assistance: {
        label: "Redion (ex Europ Assistance)",
        tile: "Redion",
        snuggle: true,
        proveedorSnuggle: /^(europ|redion)/i,
        proveedorAdmin: "Europ Assistance",
    },
    Universal_Assistance: {
        label: "Universal Assistance",
        tile: "Universal Assistance",
        snuggle: true,
        proveedorSnuggle: /^universal/i,
        proveedorAdmin: "Universal",
    },
};

export interface PlanUniversal {
    /** Nombre del plan en Snuggle (en Polko la tarjeta muestra otro, ej. "Universal 40K"). */
    nombre: string;
    /** `code` de Snuggle: el `#emitirButton_<codigo>` de la tarjeta. */
    codigo: string;
    modalidad: string;
    /** Viajes a cotizar en orden hasta que Polko reciba el plan (Snuggle no siempre se lo manda). */
    viajes: readonly { destino: DestinoAsistencia; dias: number }[];
}

const VIAJES_LIMITROFES = [
    { destino: DESTINOS_ASISTENCIA.uruguay, dias: 15 },
    { destino: DESTINOS_ASISTENCIA.brasil, dias: 15 },
    { destino: DESTINOS_ASISTENCIA.uruguay, dias: 5 },
    { destino: DESTINOS_ASISTENCIA.brasil, dias: 5 },
] as const;

const VIAJES_INTERNACIONALES = [
    { destino: DESTINOS_ASISTENCIA.espania, dias: 15 },
    { destino: DESTINOS_ASISTENCIA.estadosUnidos, dias: 15 },
    { destino: DESTINOS_ASISTENCIA.espania, dias: 5 },
    { destino: DESTINOS_ASISTENCIA.estadosUnidos, dias: 5 },
] as const;

const VIAJES_MULTIVIAJE_30 = [
    { destino: DESTINOS_ASISTENCIA.espania, dias: 30 },
    { destino: DESTINOS_ASISTENCIA.estadosUnidos, dias: 30 },
    { destino: DESTINOS_ASISTENCIA.uruguay, dias: 30 },
    { destino: DESTINOS_ASISTENCIA.brasil, dias: 30 },
] as const;

const VIAJES_MULTIVIAJE_60 = [
    { destino: DESTINOS_ASISTENCIA.espania, dias: 60 },
    { destino: DESTINOS_ASISTENCIA.uruguay, dias: 60 },
    { destino: DESTINOS_ASISTENCIA.estadosUnidos, dias: 60 },
    { destino: DESTINOS_ASISTENCIA.brasil, dias: 60 },
] as const;

/**
 * Los 15 planes de Universal de Snuggle con los viajes en los que Polko los recibe con un pasajero de 0-75
 * (cotizaciones de `microservice_products/server.log`, quoteMode "Multi provider"):
 *   - 5 y 15 días: los diarios. Los 4 JUMBO en destinos internacionales; los 25K y 40K en Brasil y Países
 *     Limítrofes. "25K DIARIO SNUGGLE" solo apareció en el quoter del admin de Snuggle, nunca en Polko.
 *   - 30 días: los 6 multiviaje MT30 (60K, 150K, 300K, 500K, 1M y 5M), en cualquier destino.
 *   - 60 días: BK 60K MT60.
 */
export const PLANES_UNIVERSAL: readonly PlanUniversal[] = [
    { nombre: "25K DIARIO SNUGGLE", codigo: "1-ELD6LIA", modalidad: "Diario", viajes: VIAJES_LIMITROFES },
    { nombre: "UNIVERSAL 25k Daily", codigo: "1-EWU43SP", modalidad: "Diario", viajes: VIAJES_LIMITROFES },
    { nombre: "40K SNUGGLE-PL", codigo: "1-FW6LDIU", modalidad: "Diario", viajes: VIAJES_LIMITROFES },
    { nombre: "40K SNUGGLE-PL 3 cuota sin interés", codigo: "1-FW6OGJ6", modalidad: "Diario", viajes: VIAJES_LIMITROFES },
    { nombre: "MASTER JUMBO", codigo: "1-EHD9X2X", modalidad: "Diario", viajes: VIAJES_INTERNACIONALES },
    { nombre: "VALUE JUMBO", codigo: "1-EHD9X54", modalidad: "Diario", viajes: VIAJES_INTERNACIONALES },
    { nombre: "EXCELLENCE JUMBO", codigo: "1-EHD9X7N", modalidad: "Diario", viajes: VIAJES_INTERNACIONALES },
    { nombre: "MAXIMUM JUMBO", codigo: "1-EHD9X9X", modalidad: "Diario", viajes: VIAJES_INTERNACIONALES },
    { nombre: "BK 60K MT30", codigo: "1-DMHVD5W", modalidad: "Multiviaje 30", viajes: VIAJES_MULTIVIAJE_30 },
    { nombre: "EXCELLENCE 150K MT30", codigo: "1-FIBHGPS", modalidad: "Multiviaje 30", viajes: VIAJES_MULTIVIAJE_30 },
    { nombre: "MAXIMUM 300K MT30", codigo: "1-FIBHPKA", modalidad: "Multiviaje 30", viajes: VIAJES_MULTIVIAJE_30 },
    { nombre: "EXCLUSIVE 500K MT30", codigo: "1-EIPGZXM", modalidad: "Multiviaje 30", viajes: VIAJES_MULTIVIAJE_30 },
    { nombre: "MILLION 1M MT30", codigo: "1-GACIGFW", modalidad: "Multiviaje 30", viajes: VIAJES_MULTIVIAJE_30 },
    { nombre: "BEST 5Millones MT30", codigo: "1-GACIGKS", modalidad: "Multiviaje 30", viajes: VIAJES_MULTIVIAJE_30 },
    { nombre: "BK 60K MT60", codigo: "1-EB319Z6", modalidad: "Multiviaje 60", viajes: VIAJES_MULTIVIAJE_60 },
];

/** Días de viaje: 7 evita el aviso de estadía mínima (< 5 días) y entra en los planes diarios. */
export const DIAS_VIAJE_DEFAULT = 7;

/**
 * Tarjetas de prueba del sandbox de Snuggle (docs/documentacion-api-cotizador §14). Sirven para pagar
 * el `paymentLink` en el checkout que corresponde a cada circuito.
 */
export const TARJETAS_PRUEBA_SNUGGLE = {
    mercadoPago: {
        numero: "5031755734530604",
        vencimiento: "11/26",
        cvv: "123",
        titular: "APRO",
        documento: { tipo: "DNI", numero: "12345678" },
        email: "test_user_1367032502@testuser.com",
    },
    stripe: {
        visa: "4242424242424242",
        visaDebito: "4000056655665556",
        mastercard: "5555555555554444",
        amex: "378282246310005",
        rechazoGenerico: "4000000000000002",
        fondosInsuficientes: "4000000000009995",
        vencida: "4000000000000069",
        cvcIncorrecto: "4000000000000127",
        vencimiento: "12/30",
        cvc: "123",
    },
    universal: [
        { numero: "4697240002423590", marca: "Visa", titular: "Test Visa", vigencia: "0830", cvv: "775" },
        { numero: "5254892002111111", marca: "Mastercard", titular: "Test Master", vigencia: "0830", cvv: "123" },
        { numero: "5896570000000008", marca: "Cabal", titular: "Test Cabal", vigencia: "1229", cvv: "123" },
        { numero: "5895620000000002", marca: "Naranja", titular: "Test Naranja", vigencia: "1229", cvv: "123" },
        { numero: "376411234531007", marca: "Amex", titular: "Test Amex", vigencia: "1239", cvv: "123" },
    ],
} as const;

/** Pasarela que abre el link de pago según el circuito de Snuggle (§5.4 / §14.1). */
export const PASARELAS_LINK_PAGO = /mercadopago\.com|mercadolibre\.com|stripe\.com|europ|snuggle\.travel|universal-assistance/i;
