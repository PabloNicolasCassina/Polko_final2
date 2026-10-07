/**
 * Cobertura de roles de cliente de Accidentes Personales (Sancor, única compañía).
 *
 * Fuente: frontend_general/src/constants/products/accidentesPersonales.js
 * (`ACCIDENTES_PERSONALES_COMPANIES_DATA.Sancor.roles`) +
 * features/Forms/products/AccidentesPersonales/emitir/emitirSteps.js.
 *
 * - Tomador y Beneficiario: únicos, precargados (filas 1 y 2), no se eliminan.
 * - Beneficiario: radios Herederos legales (default) / Tomador / Otro.
 * - Asegurado: ≥1 (fila 3 + "Nuevo cliente", rol default Asegurado).
 * - Nuevo cliente también ofrece Beneficiario de subrogación y 3 terceros con cláusula.
 * - Beneficiario adicional: si un asegurado coincide con el beneficiario
 *   principal y hay >1 asegurado, al pasar de paso la UI crea un beneficiario
 *   específico para ese asegurado.
 * - Con 1 solo asegurado que coincide con el beneficiario, la UI bloquea
 *   ("Un asegurado no puede ser su propio beneficiario").
 * - Beneficiario de subrogación: la UI lo ofrece pero alta-certificados
 *   responde 422 (microservice_products `apps/issuances/dtos/ap/request.py`
 *   no tiene DTO para "BENEFICIARIO DE SUBROGACION").
 */
import {
    ROLES_AP,
    type BeneficiarioAP,
    type DatosCotizacionAP,
} from "../pages/cotizarAPIAPage";

/** Sartori Carla. */
export const CUIT_TOMADOR_FISICA = "27381618426";
export const CUIT_TOMADOR_JURIDICA = "30709938734";
/** Colla Federico. */
export const CUIT_ASEGURADO = "20432715753";
/** Cecchi Camila. */
export const CUIT_ASEGURADO_B = "27410884629";

/** Claves de cobertura: roles + variantes de beneficiario. */
export const COBERTURA_AP = {
    tomadorFisica: "TOMADOR:FISICA",
    tomadorJuridica: "TOMADOR:JURIDICA",
    beneficiarioHerederos: "BENEFICIARIO:herederosLegales",
    beneficiarioTomador: "BENEFICIARIO:tomador",
    beneficiarioOtro: "BENEFICIARIO:otro",
    beneficiarioAdicional: "BENEFICIARIO:adicional",
    asegurado: "ASEGURADO",
    aseguradoMultiple: "ASEGURADO:multiple",
    beneficiarioSubrogacion: "BENEFICIARIO DE SUBROGACION",
    terceroNoAnulacionModificacion: "TERCERO C/CLAUS. NO ANULACION/MODIFICACION",
    terceroNoAnulacion: "TERCERO C/CLAUS. NO ANULACION",
    terceroNoRepeticion: "TERCERO C/CLAUS. NO REPETICION",
} as const;

export const COTIZACION_ROLES_BASE: DatosCotizacionAP = {
    vigencia: "+30 días",
    cantPersonas: "1",
    actividad: "Servicios Comunales, Sociales y Personales",
    clasificacion: "Otros Servicios sin uso de herramientas",
    tarea: "Administrativo",
    c_postal: "5000",
};

export type APRolesCase = {
    name: string;
    rolesCubiertos: string[];
    formaPago: string;
    /** Cotización PJ: "Responsable inscripto". */
    situacionImpositiva?: string;
    tomador: string;
    asegurados: string[];
    beneficiario?: BeneficiarioAP;
    beneficiarioAdicional?: BeneficiarioAP;
    clientesAdicionales?: Array<{ rol: string; dniCuit: string }>;
    /** Bug abierto: el test se marca `test.fail` (pasa mientras el bug exista). */
    bugConocido?: string;
};

/** Casos de emisión (OCASION DE TRABAJO / Intermedio). */
export const AP_ROLES_CASES: APRolesCase[] = [
    {
        name: "Tomador física + Beneficiario herederos legales + Asegurado",
        rolesCubiertos: [COBERTURA_AP.tomadorFisica, COBERTURA_AP.beneficiarioHerederos, COBERTURA_AP.asegurado],
        formaPago: "Efectivo",
        tomador: CUIT_TOMADOR_FISICA,
        asegurados: [CUIT_ASEGURADO],
    },
    {
        name: "Tomador jurídica (Responsable inscripto)",
        rolesCubiertos: [COBERTURA_AP.tomadorJuridica, COBERTURA_AP.beneficiarioHerederos, COBERTURA_AP.asegurado],
        formaPago: "Débito por CBU",
        situacionImpositiva: "Responsable inscripto",
        tomador: CUIT_TOMADOR_JURIDICA,
        asegurados: [CUIT_ASEGURADO],
    },
    {
        name: "Beneficiario = Tomador",
        rolesCubiertos: [COBERTURA_AP.tomadorFisica, COBERTURA_AP.beneficiarioTomador, COBERTURA_AP.asegurado],
        formaPago: "Efectivo",
        tomador: CUIT_TOMADOR_FISICA,
        asegurados: [CUIT_ASEGURADO],
        beneficiario: { apply: "tomador" },
    },
    {
        name: "Beneficiario Otro + 2 asegurados",
        rolesCubiertos: [COBERTURA_AP.beneficiarioOtro, COBERTURA_AP.aseguradoMultiple],
        formaPago: "Efectivo",
        tomador: CUIT_TOMADOR_FISICA,
        asegurados: [CUIT_ASEGURADO, CUIT_ASEGURADO_B],
        beneficiario: { apply: "otro", dniCuit: CUIT_TOMADOR_FISICA },
    },
    {
        name: "Beneficiario adicional: asegurado coincide con beneficiario Otro",
        rolesCubiertos: [COBERTURA_AP.beneficiarioOtro, COBERTURA_AP.beneficiarioAdicional, COBERTURA_AP.aseguradoMultiple],
        formaPago: "Efectivo",
        tomador: CUIT_TOMADOR_FISICA,
        asegurados: [CUIT_ASEGURADO, CUIT_ASEGURADO_B],
        beneficiario: { apply: "otro", dniCuit: CUIT_ASEGURADO_B },
        beneficiarioAdicional: { apply: "herederosLegales" },
    },
    {
        name: "Beneficiario de subrogación (jurídica)",
        rolesCubiertos: [COBERTURA_AP.beneficiarioSubrogacion],
        formaPago: "Efectivo",
        tomador: CUIT_TOMADOR_FISICA,
        asegurados: [CUIT_ASEGURADO],
        clientesAdicionales: [{ rol: ROLES_AP.beneficiarioSubrogacion, dniCuit: CUIT_TOMADOR_JURIDICA }],
        bugConocido:
            "alta-matriz / alta-certificados rechazan BENEFICIARIO DE SUBROGACION (422: sin DTO en microservice_products apps/issuances/dtos/ap/request.py)",
    },
    {
        name: "Tercero c/claus. no anulación/modificación (física)",
        rolesCubiertos: [COBERTURA_AP.terceroNoAnulacionModificacion],
        formaPago: "Débito por CBU",
        situacionImpositiva: "Responsable inscripto",
        tomador: CUIT_TOMADOR_JURIDICA,
        asegurados: [CUIT_ASEGURADO],
        clientesAdicionales: [{ rol: ROLES_AP.terceroNoAnulacionModificacion, dniCuit: CUIT_TOMADOR_FISICA }],
    },
    {
        name: "Tercero c/claus. no anulación (jurídica)",
        rolesCubiertos: [COBERTURA_AP.terceroNoAnulacion],
        formaPago: "Efectivo",
        tomador: CUIT_TOMADOR_FISICA,
        asegurados: [CUIT_ASEGURADO],
        clientesAdicionales: [{ rol: ROLES_AP.terceroNoAnulacion, dniCuit: CUIT_TOMADOR_JURIDICA }],
    },
    {
        name: "Tercero c/claus. no repetición (física)",
        rolesCubiertos: [COBERTURA_AP.terceroNoRepeticion],
        formaPago: "Débito por CBU",
        situacionImpositiva: "Responsable inscripto",
        tomador: CUIT_TOMADOR_JURIDICA,
        asegurados: [CUIT_ASEGURADO],
        clientesAdicionales: [{ rol: ROLES_AP.terceroNoRepeticion, dniCuit: CUIT_TOMADOR_FISICA }],
    },
];

/** Matriz de cobertura: toda clave debe aparecer en algún caso. */
export const COBERTURA_ROLES_AP: string[] = Object.values(COBERTURA_AP);
