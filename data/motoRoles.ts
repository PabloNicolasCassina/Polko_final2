/**
 * Cobertura de roles de cliente en emisión motovehículo.
 *
 * Fuente: frontend_general/.../constants/products/motovehiculo.js
 * (catálogo global, igual para Sancor / RUS / Rivadavia / ATM).
 *
 * Roles bajo prueba: Asegurado (2), Tomador (1), Asegurado Adicional (7),
 * Acreedor Prendario (16).
 */

export const CUIT_ASEGURADO = "27381618426";
export const CUIT_FISICA_RI = "23343180489";
export const CUIT_JURIDICA = "30711392404";
export const CUIT_EXTRA = "30615714158";

export const LOCALIDAD_CORDOBA = "(5000) CORDOBA";

const VEHICULO_BASE = {
    marca: "BENELLI",
    año: "2022",
    version: "LEONCINO 250",
    c_postal: "5000",
};

/** Tomador + Adicional + Acreedor Prendario (Asegurado = cliente 0). */
export const ROLES_MOTO_EXTRA: Array<{ rol: string; dniCuit: string }> = [
    { rol: "Tomador", dniCuit: CUIT_FISICA_RI },
    { rol: "Asegurado Adicional", dniCuit: CUIT_EXTRA },
    { rol: "Acreedor Prendario", dniCuit: CUIT_JURIDICA },
];

export type MotoRolesCase = {
    name: string;
    rolesCubiertos: string[];
    compania: string;
    plan: string;
    formaPago: string;
    vehiculo: {
        marca: string;
        año: string;
        version: string;
        c_postal: string;
        tipoPersona?: string;
        sitImpositiva?: string;
    };
    dniCuit: string;
    localidad?: string;
    mail?: string;
    telefono?: string;
    clientesAdicionales?: Array<{ rol: string; dniCuit: string }>;
};

const mailTel = {
    mail: "cassinanico@gmail.com",
    telefono: "3512334798",
    localidad: LOCALIDAD_CORDOBA,
};

/**
 * Una emisión por compañía con los 4 roles (principal + 3 adicionales).
 * Labels de tile = PLAN_CODES_MOTO / motoHappyPath.
 */
export const MOTO_ROLES_CASES: MotoRolesCase[] = [
    {
        name: "Sancor — Asegurado, Tomador, Adicional, Acreedor Prendario",
        rolesCubiertos: ["2", "1", "7", "16"],
        compania: "Sancor",
        plan: "Moto Premium",
        formaPago: "Débito por CBU",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: ROLES_MOTO_EXTRA,
    },
    {
        name: "RUS — Asegurado, Tomador, Adicional, Acreedor Prendario",
        rolesCubiertos: ["2", "1", "7", "16"],
        compania: "RUS",
        plan: "RCM c/grúa",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: ROLES_MOTO_EXTRA,
    },
    {
        name: "Rivadavia — Asegurado, Tomador, Adicional, Acreedor Prendario",
        rolesCubiertos: ["2", "1", "7", "16"],
        compania: "Rivadavia",
        plan: "Base Plus",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: ROLES_MOTO_EXTRA,
    },
    {
        name: "ATM — Asegurado, Tomador, Adicional, Acreedor Prendario",
        rolesCubiertos: ["2", "1", "7", "16"],
        compania: "ATM",
        plan: "Robo Premium",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: ROLES_MOTO_EXTRA,
    },
];

/** Matriz de cobertura (roles globales de moto, mismos en las 4 compañías). */
export const COBERTURA_ROLES_MOTO_POR_COMPANIA: Record<string, string[]> = {
    Sancor: ["2", "1", "7", "16"],
    RUS: ["2", "1", "7", "16"],
    Rivadavia: ["2", "1", "7", "16"],
    ATM: ["2", "1", "7", "16"],
};
