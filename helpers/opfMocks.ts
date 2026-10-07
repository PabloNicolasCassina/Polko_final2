import fs from "fs";
import path from "path";
import { type Page, type Response } from "@playwright/test";

/** `OPF_MOCK=1` → el POST de OPF no llega a microservice_products (sin registros ni Discord en pre). */
export const OPF_BACKEND_MOCK = process.env.OPF_MOCK === "1";

/** No debe matchear `emissionErrorActionMap` del front: si matchea, la pantalla pasa a "error manejado". */
export const NEWEMITIR_MOCK_ERROR = "Servicio de la aseguradora no disponible (mock E2E)";
export const NEWEMITIR_MOCK_STATUS_CODE = 503;

export const OPF_PATH_SUFFIX = "/emision/operaciones-por-fuera";
export const OPF_STATUS_PENDIENTE_EMISION = "Pendiente de emisión";
/** Alta `catalogExtra` (sin premio): la UI lo muestra como "Pendiente de cotización". */
export const OPF_STATUS_PENDIENTE = "Pendiente";
/** Aprobada en admin; Mis Solicitudes la muestra como "A completar". */
export const OPF_STATUS_COTIZADA = "Cotizada";
export const OPF_STATUS_CANCELADA = "Cancelada";
export const OPF_LABEL_A_COMPLETAR = "A completar";
/** Emitida en admin: el BE guarda "Emitida" (legacy) y Mis Solicitudes lo muestra como "Aprobada". */
export const OPF_STATUS_APROBADA = ["Aprobada", "Emitida"];
export const OPF_LABEL_APROBADA = "Aprobada";
export const OPF_FLOW_API_OUT_STANDARD = "apiCatalogOutStandard";

/**
 * `OPF_COMPLETAR=1` → tras crear cada solicitud fuera de pauta, la fase 2 refresca Mis Solicitudes
 * hasta verla "A completar" (aprobada en admin) y sigue con descarga de PDF + "Solicitar emisión".
 */
export const OPF_COMPLETAR = process.env.OPF_COMPLETAR === "1";
export const OPF_APROBACION_TIMEOUT_MS = Number(process.env.OPF_APROBACION_TIMEOUT_MIN ?? 30) * 60_000;
export const OPF_POLL_INTERVAL_MS = Number(process.env.OPF_POLL_INTERVAL_SEG ?? 15) * 1000;
/** Cuánto espera la fase 2 a que termine la fase 1 de su compañía (corre en otro worker). */
export const OPF_FASE1_TIMEOUT_MS = 15 * 60_000;
/** Margen para que la fase 1 de esta corrida pise el archivo de una corrida anterior. */
const OPF_GRACIA_CORRIDA_ANTERIOR_MS = 60_000;

/** Un archivo por compañía: la fase 1 corre en paralelo y así no se pisan. */
const OPF_PENDIENTES_DIR = path.resolve(__dirname, "..", ".opf-pendientes");
/** Lo fija playwright.config.ts en el runner; los workers lo heredan. */
const OPF_RUN_ID = process.env.OPF_RUN_ID ?? "";

/** `completada` = ya se solicitó la emisión (fase 2); falta que la emitan en admin. */
export type OpfPendienteEstado = "en_curso" | "creada" | "completada" | "fallida";

export interface OpfPendiente {
    estado: OpfPendienteEstado;
    compania: string;
    id?: string;
    cobertura?: string;
    /** Patente cargada al completar: identifica la póliza en Mi Cartera. */
    patente?: string;
    runId?: string;
    actualizado?: string;
}

function pendientePath(companyEnum: string): string {
    return path.join(OPF_PENDIENTES_DIR, `${companyEnum}.json`);
}

export function guardarOpfPendiente(companyEnum: string, pendiente: OpfPendiente): void {
    fs.mkdirSync(OPF_PENDIENTES_DIR, { recursive: true });
    const contenido: OpfPendiente = { ...pendiente, runId: OPF_RUN_ID, actualizado: new Date().toISOString() };
    fs.writeFileSync(pendientePath(companyEnum), JSON.stringify(contenido, null, 2));
}

export function leerOpfPendiente(companyEnum: string): OpfPendiente | null {
    const archivo = pendientePath(companyEnum);
    if (!fs.existsSync(archivo)) return null;
    try {
        return JSON.parse(fs.readFileSync(archivo, "utf-8"));
    } catch {
        return null;
    }
}

export function borrarOpfPendiente(companyEnum: string): void {
    fs.rmSync(pendientePath(companyEnum), { force: true });
}

/**
 * Espera el resultado de la fase 1 de la compañía:
 * - de esta corrida: hasta que deje de estar `en_curso`;
 * - sin fase 1 en esta corrida (p. ej. `-g "completar solicitud"`): retoma la que haya quedado
 *   `creada` o `completada` de una corrida anterior.
 * Devuelve null si no hay solicitud para seguir.
 */
export async function esperarFase1(companyEnum: string): Promise<OpfPendiente | null> {
    const retomable = (p: OpfPendiente | null) =>
        p && (p.estado === "creada" || p.estado === "completada") ? p : null;
    const inicio = Date.now();
    while (Date.now() - inicio < OPF_FASE1_TIMEOUT_MS) {
        const pendiente = leerOpfPendiente(companyEnum);
        const deEstaCorrida = Boolean(pendiente && OPF_RUN_ID && pendiente.runId === OPF_RUN_ID);
        if (deEstaCorrida && pendiente!.estado !== "en_curso") {
            return retomable(pendiente);
        }
        if (!deEstaCorrida && Date.now() - inicio > OPF_GRACIA_CORRIDA_ANTERIOR_MS) {
            return retomable(pendiente);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error(`La fase 1 de ${companyEnum} no terminó en ${OPF_FASE1_TIMEOUT_MS / 60_000} min`);
}

/** Las opciones del filtro "Compañía" salen de `razonSocial`, que no coincide con el enum. */
export const OPF_COMPANY_OPTION: Record<string, RegExp> = {
    Sancor: /sancor/i,
    RUS: /r[ií]o uruguay|^rus$/i,
    Zurich: /zurich/i,
    Federacion_Patronal: /federaci[oó]n/i,
    Rivadavia: /rivadavia/i,
    ATM: /atm/i,
    Triunfo: /triunfo/i,
    Mercantil_Andina: /mercantil/i,
};

export function isOpfPatchResponse(opfId: string) {
    return (response: Response): boolean =>
        response.request().method() === "PATCH"
        && new URL(response.url()).pathname.endsWith(`${OPF_PATH_SUFFIX}/${opfId}`);
}

export interface NewemitirCapture {
    body: any | null;
}

/**
 * Responde `/newemitir` con el formato nuevo de error (`status_code` + `content.error`)
 * que `newemitir.js` convierte en EmissionFailure. Guarda el body enviado para comparar
 * `parametrosAdicionales` con el de la OPF.
 */
export async function mockNewemitirError(page: Page): Promise<NewemitirCapture> {
    const capture: NewemitirCapture = { body: null };
    await page.route(
        (url) => url.pathname === "/newemitir",
        async (route) => {
            if (route.request().method() !== "POST") {
                await route.fallback();
                return;
            }
            capture.body = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    status_code: NEWEMITIR_MOCK_STATUS_CODE,
                    content: { error: NEWEMITIR_MOCK_ERROR },
                }),
            });
        },
    );
    return capture;
}

/** Con `OPF_MOCK=1` responde el alta de OPF sin llegar al backend (el front lee `data.id`). */
export async function mockOpfCreateIfEnabled(
    page: Page,
    status: string = OPF_STATUS_PENDIENTE_EMISION,
): Promise<void> {
    if (!OPF_BACKEND_MOCK) return;
    await page.route(
        (url) => url.pathname.endsWith(OPF_PATH_SUFFIX),
        async (route) => {
            if (route.request().method() !== "POST") {
                await route.fallback();
                return;
            }
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    id: `e2e-mock-${Date.now()}`,
                    status,
                }),
            });
        },
    );
}

export function isOpfCreateResponse(response: Response): boolean {
    return (
        response.request().method() === "POST"
        && new URL(response.url()).pathname.endsWith(OPF_PATH_SUFFIX)
    );
}

export function isOpfListResponse(response: Response): boolean {
    const url = new URL(response.url());
    return (
        response.request().method() === "GET"
        && url.pathname.endsWith(OPF_PATH_SUFFIX)
    );
}

export function extractOpfListItems(json: any): any[] {
    if (Array.isArray(json)) return json;
    return json?.items ?? json?.data ?? json?.results ?? [];
}

/** Para adjuntar al reporte sin credenciales de Mis Aseguradoras. */
export function redactCodigos<T>(payload: T): T {
    return JSON.parse(
        JSON.stringify(payload ?? null, (key, value) => (key === "codigos" ? "[redacted]" : value)),
    );
}

export function isBlank(value: unknown): boolean {
    return value === null || value === undefined || String(value).trim() === "";
}
