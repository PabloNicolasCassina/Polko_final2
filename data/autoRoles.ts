/**
 * Cobertura de roles de cliente por compañía (automotor).
 *
 * Fuente: frontend_general/.../constants/products/automotor/automotor.js
 *
 * Sancor/RUS: solo Asegurado + Asegurado Adicional + Acreedor Prendario.
 * Resto de compañías: todos sus roles seleccionables.
 * Titular de sociedad (25) solo en flujo PJ (Rivadavia/ATM).
 * Experta: `roles` son IVA (bug) — skip (no cotiza).
 */

export const CUIT_ASEGURADO = "27381618426";
export const CUIT_FISICA_RI = "23343180489";
export const CUIT_JURIDICA = "30711392404";
export const CUIT_EXTRA_A = "30615714158";
export const CUIT_EXTRA_B = "20386485446";
export const CUIT_EXTRA_C = "20422581864";

export const LOCALIDAD_CORDOBA = "(5000) CORDOBA";

const VEHICULO_BASE = {
    marca: "RENAULT",
    año: "2022",
    modelo: "LOGAN",
    version: "LOGAN II 1.6 16V INTENS L/19",
    c_postal: "5000",
};

const VEHICULO_JURIDICA = {
    ...VEHICULO_BASE,
    tipoPersona: "Jurídica",
    sitImpositiva: "Responsable inscripto",
};

/** Sancor/RUS: Adicional + Acreedor Prendario (Asegurado = cliente 0). */
export const ROLES_SANCOR_RUS: Array<{ rol: string; dniCuit: string }> = [
    { rol: "Asegurado Adicional", dniCuit: CUIT_FISICA_RI },
    { rol: "Acreedor Prendario", dniCuit: CUIT_JURIDICA },
];

export type AutoRolesCase = {
    name: string;
    rolesCubiertos: string[];
    compania: string;
    plan: string;
    formaPago: string;
    skipInspeccion?: boolean;
    /** Si true, el test se marca skip (p.ej. Experta no cotiza). */
    skip?: boolean;
    skipReason?: string;
    vehiculo: {
        marca: string;
        año: string;
        modelo: string;
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
    completarRolTab?: { rol: string; dniCuit: string };
};

const mailTel = {
    mail: "cassinanico@gmail.com",
    telefono: "3512334798",
    localidad: LOCALIDAD_CORDOBA,
};

/**
 * Casos de emisión por compañía (labels de tile = PLAN_CODES_AUTO).
 * Asegurado (`2`) siempre es el principal.
 */
export const AUTO_ROLES_CASES: AutoRolesCase[] = [
    // —— Sancor: Asegurado + Adicional + Acreedor Prendario ——
    {
        name: "Sancor — Asegurado, Adicional, Acreedor Prendario",
        rolesCubiertos: ["2", "7", "16"],
        compania: "Sancor",
        plan: "Auto Premium Max (c/Asistencia)",
        formaPago: "Débito por CBU",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: ROLES_SANCOR_RUS,
    },

    // —— RUS: mismos tres roles ——
    {
        name: "RUS — Asegurado, Adicional, Acreedor Prendario",
        rolesCubiertos: ["2", "7", "16"],
        compania: "RUS",
        plan: "Sigma Cero",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: ROLES_SANCOR_RUS,
    },

    // —— Zurich (1 Tomador, 3 Acreedor + 2) ——
    {
        name: "Zurich — Tomador + Acreedor",
        rolesCubiertos: ["2", "1", "3"],
        compania: "Zurich",
        plan: "Terceros Completo Premium Granizo",
        formaPago: "Medios electrónicos",
        skipInspeccion: true,
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: [
            { rol: "Tomador", dniCuit: CUIT_FISICA_RI },
            { rol: "Acreedor", dniCuit: CUIT_JURIDICA },
        ],
    },

    // —— Federación Patronal (solo Asegurado) ——
    {
        name: "Federación — solo Asegurado",
        rolesCubiertos: ["2"],
        compania: "Federación",
        plan: "Terceros Completo Premium",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
    },

    // —— Experta: roles en config son IVA (no roles de cliente); cotización falla ——
    {
        name: "Experta — solo Asegurado (roles IVA omitidos)",
        rolesCubiertos: ["2"],
        compania: "Experta",
        plan: "23",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        skip: true,
        skipReason: "Experta falla al cotizar; array roles en automotor.js son categorías IVA, no roles de cliente",
    },

    // —— Rivadavia (16 Acreedor Prendario; 25 Titular sociedad en PJ) ——
    {
        name: "Rivadavia — Acreedor Prendario",
        rolesCubiertos: ["2", "16"],
        compania: "Rivadavia",
        plan: "Mega Plan",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: [{ rol: "Acreedor Prendario", dniCuit: CUIT_JURIDICA }],
    },
    {
        name: "Rivadavia PJ — Titular de sociedad",
        rolesCubiertos: ["2", "25"],
        compania: "Rivadavia",
        plan: "Mega Plan",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_JURIDICA,
        dniCuit: CUIT_JURIDICA,
        ...mailTel,
        completarRolTab: { rol: "Titular de sociedad", dniCuit: CUIT_ASEGURADO },
    },

    // —— ATM (igual Rivadavia) ——
    {
        name: "ATM — Acreedor Prendario",
        rolesCubiertos: ["2", "16"],
        compania: "ATM",
        plan: "C Premium (C2)",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: [{ rol: "Acreedor Prendario", dniCuit: CUIT_JURIDICA }],
    },
    {
        name: "ATM PJ — Titular de sociedad",
        rolesCubiertos: ["2", "25"],
        compania: "ATM",
        plan: "C Premium (C2)",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_JURIDICA,
        dniCuit: CUIT_JURIDICA,
        ...mailTel,
        completarRolTab: { rol: "Titular de sociedad", dniCuit: CUIT_ASEGURADO },
    },

    // —— Triunfo (opcionesRolesExtra: 16) ——
    {
        name: "Triunfo — Acreedor Prendario",
        rolesCubiertos: ["2", "16"],
        compania: "Triunfo",
        plan: "C8",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: [{ rol: "Acreedor Prendario", dniCuit: CUIT_JURIDICA }],
    },

    // —— Mercantil Andina (opcionesRolesExtra: 16) ——
    {
        name: "Mercantil — Acreedor Prendario",
        rolesCubiertos: ["2", "16"],
        compania: "Mercantil",
        plan: "B1",
        formaPago: "Efectivo",
        vehiculo: VEHICULO_BASE,
        dniCuit: CUIT_ASEGURADO,
        ...mailTel,
        clientesAdicionales: [{ rol: "Acreedor Prendario", dniCuit: CUIT_JURIDICA }],
    },
];

/** Matriz de cobertura esperada (roles que el suite se compromete a cubrir). */
export const COBERTURA_ROLES_POR_COMPANIA: Record<string, string[]> = {
    Sancor: ["2", "7", "16"],
    RUS: ["2", "7", "16"],
    Zurich: ["2", "1", "3"],
    Federación: ["2"],
    Experta: ["2"],
    Rivadavia: ["2", "16", "25"],
    ATM: ["2", "16", "25"],
    Triunfo: ["2", "16"],
    Mercantil: ["2", "16"],
};
