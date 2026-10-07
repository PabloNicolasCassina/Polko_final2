/**
 * Plan, forma de pago e inspección por aseguradora para emitir auto con `CotizarAutoIAPage`.
 * Compartido por `autoHappyPath.spec.ts` y `autoOperacionesPorFuera.spec.ts`.
 * Experta no figura: sigue fallando al cotizar con `mocks/mockUserDataATM.json`.
 */
export const PLAN_POR_COMPANIA: Record<string, string> = {
    Sancor: "Auto Premium Max (c/Asistencia)", // 12
    Rivadavia: "Mega Plan", // M
    Zurich: "Terceros Completo Premium Granizo", // CG
    RUS: "Sigma Cero", // S0
    Federación: "Terceros Completo Premium", // CF
    ATM: "C Premium (C2)", // C2
    Triunfo: "C8", // C8
    Mercantil: "B1", // 923
};

/** Zurich no pide inspección en el asistente. */
export const SKIP_INSPECCION: Record<string, boolean> = {
    Zurich: true,
};

/**
 * Forma de pago preferida por compañía en emisión.
 * Sancor: Efectivo suele disparar NPE en OperativeIssuanceHelper; CBU es el happy path estable.
 */
export const FORMA_PAGO_POR_COMPANIA: Record<string, string> = {
    Sancor: "Débito por CBU",
    Rivadavia: "Efectivo",
    Zurich: "Medios electrónicos",
    RUS: "Efectivo",
    Federación: "Efectivo",
    ATM: "Efectivo",
    Triunfo: "Efectivo",
    Mercantil: "Efectivo",
};

/** Label del selector de compañía → `CompanyEnum` del backend (`request.company`). */
export const COMPANY_ENUM_POR_LABEL: Record<string, string> = {
    Sancor: "Sancor",
    Rivadavia: "Rivadavia",
    Zurich: "Zurich",
    RUS: "RUS",
    Federación: "Federacion_Patronal",
    ATM: "ATM",
    Triunfo: "Triunfo",
    Mercantil: "Mercantil_Andina",
};
