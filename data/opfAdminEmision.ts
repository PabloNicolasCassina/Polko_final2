/**
 * Campos de "Marcar como Emitida" en admin por compañía (enum de la API), por label visible.
 * Espejo de `ISSUANCE_DATA_SCHEMA_BY_COMPANY` (admin/.../helpers/ticket/issuanceDataFields.js):
 * solo se completan los obligatorios, salvo Triunfo, que no tiene póliza obligatoria pero la usa
 * Mi Cartera. Opcionales sin completar: Sancor "Número de certificado", ATM "Número de propuesta" y
 * "Número de GLM". Federación además pide "Premio" cuando la solicitud no lo trae (lo resuelve
 * `cambiarEstado`). Si admin agrega un campo obligatorio, el menú muestra el error y el test falla ahí.
 */
const CAMPOS_EMISION_POR_COMPANIA: Record<string, string[]> = {
    Federacion_Patronal: ["Número de póliza", "Número de cotización"],
    Sancor: ["Número de trámite", "Número de referencia", "Número de póliza"],
    Zurich: ["Número de orden", "Prefijo de presupuesto", "Número de propuesta", "Número de póliza"],
    Experta: ["Número de póliza"],
    Rivadavia: ["Número de póliza"],
    RUS: ["Número de propuesta", "Número de póliza"],
    ATM: ["Número de póliza", "Número de trámite"],
    Triunfo: ["Número de trámite", "Número de póliza"],
    Mercantil_Andina: ["Número de trámite", "Número de póliza"],
};

/** Valores numéricos únicos por corrida (no son pólizas reales de la aseguradora). */
export function datosEmisionAdmin(companyEnum: string): Record<string, string> {
    const campos = CAMPOS_EMISION_POR_COMPANIA[companyEnum] ?? ["Número de póliza"];
    const base = String(Date.now()).slice(-8);
    return Object.fromEntries(campos.map((label, i) => [label, `${i + 1}${base}`]));
}

/** Premio con el que admin cotiza las solicitudes `catalogExtra` (pasan a "Cotizada"). */
export const OPF_ADMIN_PREMIO_COTIZADA = 125000;
