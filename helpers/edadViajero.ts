import { RANGOS_ETARIOS, type ClienteAsistencia, type RangoEtario } from "../data/asistenciaViajeroEmision";

/** El cotizador no deja salir antes de hoy + 2 días (`MIN_DEPARTURE_DAYS_AHEAD`). */
const MIN_DIAS_ADELANTE = 3;
/** Ventana de salidas aleatorias: TerraWind rechaza (520) dos vouchers del mismo pasajero en el mismo rango. */
const MAX_DIAS_ALEATORIOS = 120;

const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function parseFechaAr(texto: string): Date {
    const [dd, mm, yyyy] = texto.split("/").map(Number);
    return new Date(yyyy, mm - 1, dd);
}

export function formatFechaAr(fecha: Date): string {
    const dd = String(fecha.getDate()).padStart(2, "0");
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${fecha.getFullYear()}`;
}

/** Nombre accesible de un día del calendario de Mantine ("20 noviembre 2026"). */
export function labelDiaCalendario(fecha: Date): string {
    return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

/** Título del mes del calendario ("noviembre 2026"). */
export function labelMesCalendario(fecha: Date): string {
    return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

export function sumarDias(fecha: Date, dias: number): Date {
    const copia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    copia.setDate(copia.getDate() + dias);
    return copia;
}

function sumarAnios(fecha: Date, anios: number): Date {
    return new Date(fecha.getFullYear() + anios, fecha.getMonth(), fecha.getDate());
}

/** Años cumplidos en `fecha`, igual que `differenceInYears` del front. */
export function edadEn(fechaNacimiento: Date, fecha: Date): number {
    let edad = fecha.getFullYear() - fechaNacimiento.getFullYear();
    const cumplioEsteAnio =
        fecha.getMonth() > fechaNacimiento.getMonth() ||
        (fecha.getMonth() === fechaNacimiento.getMonth() && fecha.getDate() >= fechaNacimiento.getDate());
    if (!cumplioEsteAnio) edad -= 1;
    return edad;
}

export function rangoDeEdad(edad: number): RangoEtario | null {
    const rango = (Object.keys(RANGOS_ETARIOS) as RangoEtario[]).find(
        (clave) => edad >= RANGOS_ETARIOS[clave].min && edad <= RANGOS_ETARIOS[clave].max,
    );
    return rango ?? null;
}

export function edadCliente(cliente: ClienteAsistencia, salida: Date): number {
    return edadEn(parseFechaAr(cliente.fechaNacimiento), salida);
}

export interface FechasViaje {
    salida: Date;
    regreso: Date;
    dias: number;
}

/**
 * Elige una salida en la que cada pasajero tenga una edad dentro de su rango (Anselmo recién entra en
 * 86-90 el 18/12/2026) y la desplaza al azar dentro de `ventanaDias` para no repetir rangos entre corridas.
 */
export function elegirFechasViaje(
    pasajeros: readonly ClienteAsistencia[],
    dias: number,
    ventanaDias: number = MAX_DIAS_ALEATORIOS,
): FechasViaje {
    const hoy = new Date();
    let desde = sumarDias(hoy, MIN_DIAS_ADELANTE);
    let hasta = sumarDias(hoy, MIN_DIAS_ADELANTE + ventanaDias);

    for (const pasajero of pasajeros) {
        const nacimiento = parseFechaAr(pasajero.fechaNacimiento);
        const { min, max } = RANGOS_ETARIOS[pasajero.rango];
        const entraAlRango = sumarAnios(nacimiento, min);
        const saleDelRango = sumarDias(sumarAnios(nacimiento, max + 1), -1);
        if (entraAlRango > desde) desde = entraAlRango;
        if (saleDelRango < hasta) hasta = saleDelRango;
    }
    if (desde > hasta) {
        throw new Error(
            `No hay fecha de salida en la que ${pasajeros.map((p) => `${p.apellido} (${p.rango})`).join(" y ")} ` +
                "estén en sus rangos etarios",
        );
    }

    const margen = Math.round((hasta.getTime() - desde.getTime()) / 86400000);
    const salida = sumarDias(desde, Math.floor(Math.random() * (Math.min(margen, ventanaDias) + 1)));
    return { salida, regreso: sumarDias(salida, dias - 1), dias };
}

/** Edades a cotizar: las reales de cada cliente a la fecha de salida. */
export function edadesACotizar(pasajeros: readonly ClienteAsistencia[], salida: Date): number[] {
    return pasajeros.map((pasajero) => {
        const edad = edadCliente(pasajero, salida);
        const rango = rangoDeEdad(edad);
        if (rango !== pasajero.rango) {
            throw new Error(
                `${pasajero.nombre} ${pasajero.apellido} tiene ${edad} años al ${formatFechaAr(salida)}: ` +
                    `está en ${rango ?? "fuera de rango"}, no en ${pasajero.rango}`,
            );
        }
        return edad;
    });
}
