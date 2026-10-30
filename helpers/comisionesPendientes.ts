import * as fs from "fs";
import { type Page, type Request, type Response, type Route } from "@playwright/test";

/** Emisión AP tal como la devuelve `GET /comisiones-pendientes` (general_api → microservice_products). */
export interface ComisionPendienteAP {
    _id: string;
    estado: string;
    comision_available: boolean;
    company: string;
    product: string;
    numeroPoliza?: string | null;
    idAuth?: string | null;
    client?: { name?: string | null; surname?: string | null; dni?: string | number | null; cuit?: string | null } | null;
    infodePago?: { formadePago?: string | null } | null;
    vigenciaDesde?: string | null;
    vigenciaHasta?: string | null;
    premium?: number | null;
    comision?: number | null;
    created_at?: string;
}

/** Ítem de `GET /newgetInfoAllComisiones` (billetera de frontend_general). */
export interface ComisionBilletera {
    idEmision: string;
    comision: number;
    fecha: string;
    estado: string;
    company: string;
}

export interface InfoComisionesBilletera {
    pendientes: { emisiones: ComisionBilletera[]; otros_incentivos: ComisionBilletera[] };
    liquidas: { emisiones: ComisionBilletera[]; otros_incentivos: ComisionBilletera[] };
}

/** `infoAllComisiones.new_get_info_all_comisiones`: una emisión es líquida si su vigencia arrancó hace ≥ 15 días. */
export const DIAS_LIQUIDEZ_BILLETERA = 15;

export const MSG_404_BACK = /No se encontró una emisión AP en Success con comisión pendiente/;

/** Endpoints de general_api; la ruta del admin (`/u/comisiones-pendientes`) no debe matchear. */
const PATH_API = /^\/comisiones-pendientes(\/[^/]+)?$/;
const PATH_LISTADO = /^\/comisiones-pendientes$/;
const PATH_APROBAR = /^\/comisiones-pendientes\/[^/]+$/;

export function esListadoComisiones(r: Request | Response): boolean {
    const request = "request" in r ? r.request() : r;
    return request.method() === "GET" && PATH_LISTADO.test(new URL(request.url()).pathname);
}

export function esAprobarComision(idEmision?: string) {
    return (r: Request | Response): boolean => {
        const request = "request" in r ? r.request() : r;
        const { pathname } = new URL(request.url());
        if (request.method() !== "PATCH" || !PATH_APROBAR.test(pathname)) return false;
        return !idEmision || decodeURIComponent(pathname).endsWith(`/${idEmision}`);
    };
}

export function esInfoComisionesBilletera(response: Response): boolean {
    return response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/newgetInfoAllComisiones");
}

// ---------------------------------------------------------------------------
// Formato esperado en la tabla (espejo de admin/src/modules/comisionesPendientes/helpers/formatters.js)
// ---------------------------------------------------------------------------

export const EMPTY_VALUE = "—";

const MEDIOS_DE_PAGO: Record<string, string> = {
    CBU: "Débito CBU",
    EF: "Efectivo",
    TD: "Tarjeta de débito",
    TC: "Tarjeta de crédito",
};

function hasValue(value: unknown): boolean {
    return value != null && String(value).trim() !== "";
}

export function formatMoney(value: unknown): string {
    if (!hasValue(value) || Number.isNaN(Number(value))) return EMPTY_VALUE;
    return `$ ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value))}`;
}

function formatDate(value: unknown): string {
    const match = hasValue(value) ? String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
    return match ? `${match[3]}/${match[2]}/${match[1]}` : EMPTY_VALUE;
}

export function formatVigencia(desde: unknown, hasta: unknown): string {
    if (!hasValue(desde) && !hasValue(hasta)) return EMPTY_VALUE;
    return `${formatDate(desde)} – ${formatDate(hasta)}`;
}

export function formatMedioDePago(codigo: unknown): string {
    if (!hasValue(codigo)) return EMPTY_VALUE;
    const key = String(codigo).trim().toUpperCase();
    return MEDIOS_DE_PAGO[key] ?? key;
}

export function formatTomadorNombre(client: ComisionPendienteAP["client"]): string {
    const parts = [client?.name, client?.surname].filter(hasValue).map((p) => String(p).trim());
    return parts.length ? parts.join(" ") : EMPTY_VALUE;
}

export function formatTomadorDocumentos(client: ComisionPendienteAP["client"]): string {
    const docs: string[] = [];
    if (hasValue(client?.dni)) docs.push(`DNI ${client!.dni}`);
    if (hasValue(client?.cuit)) docs.push(`CUIT ${client!.cuit}`);
    return docs.join(" · ");
}

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

/** `sub` del id_token de Auth0 guardado en un storageState (`.auth/*.json`). */
export function idAuthDeStorageState(storageStatePath: string): string {
    const state = JSON.parse(fs.readFileSync(storageStatePath, "utf-8"));
    for (const origin of state.origins ?? []) {
        const item = (origin.localStorage ?? []).find((i: { name: string }) => i.name.startsWith("@@auth0spajs@@"));
        const idToken = item ? JSON.parse(item.value)?.body?.id_token : undefined;
        if (idToken) return JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf-8")).sub;
    }
    throw new Error(`${storageStatePath} no tiene id_token de Auth0 en localStorage`);
}

/** Fecha `YYYY-MM-DD` de hace N días (misma comparación de strings que hace la billetera). */
export function fechaHaceDias(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
}

export function esLiquidablePorFecha(vigenciaDesde: string | null | undefined): boolean {
    return !!vigenciaDesde && vigenciaDesde <= fechaHaceDias(DIAS_LIQUIDEZ_BILLETERA);
}

export function idsEmisiones(lista: ComisionBilletera[]): string[] {
    return lista.map((e) => String(e.idEmision));
}

export function totalComisiones(lista: ComisionBilletera[]): number {
    return lista.reduce((total, e) => total + Number(e.comision ?? 0), 0);
}

let secuenciaMock = 0;

export function comisionPendienteMock(overrides: Partial<ComisionPendienteAP> = {}): ComisionPendienteAP {
    secuenciaMock += 1;
    const sufijo = String(secuenciaMock).padStart(4, "0");
    return {
        _id: `6a0000000000000000${sufijo}`,
        estado: "Success",
        comision_available: false,
        company: "Sancor",
        product: "OCASION DE TRABAJO",
        numeroPoliza: `9900${sufijo}`,
        idAuth: "google-oauth2|100000000000000000000",
        client: { name: "Carla", surname: "Sartori", dni: "38161842", cuit: "27381618426" },
        infodePago: { formadePago: "CBU" },
        vigenciaDesde: "2026-10-01",
        vigenciaHasta: "2027-10-01",
        premium: 15000.5,
        comision: 1234,
        created_at: "2026-10-01T10:00:00",
        ...overrides,
    };
}

export interface MockComisionesOpciones {
    listado?: ComisionPendienteAP[];
    /** Status del GET (default 200). */
    listadoStatus?: number;
    /** Body del GET cuando `listadoStatus` es de error (default `{ detail: "Internal Server Error" }`). */
    listadoErrorBody?: unknown;
    /** Demora del GET en ms (para ver el estado de carga). */
    listadoDelayMs?: number;
    /** Respuesta del PATCH (default 200). */
    aprobar?: { status: number; body?: unknown; delayMs?: number };
}

export interface MockComisiones {
    patches: string[];
    gets: number;
    setListado: (listado: ComisionPendienteAP[]) => void;
    setListadoStatus: (status: number) => void;
}

function corsHeaders(origin: string | null): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": origin ?? "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, x-client-type",
    };
}

/** Intercepta GET y PATCH de `/comisiones-pendientes` en la página de admin (no toca datos reales). */
export async function mockComisionesPendientes(page: Page, opciones: MockComisionesOpciones = {}): Promise<MockComisiones> {
    let listado = opciones.listado ?? [];
    let listadoStatus = opciones.listadoStatus ?? 200;
    const estado: MockComisiones = {
        patches: [],
        gets: 0,
        setListado: (nuevo) => {
            listado = nuevo;
        },
        setListadoStatus: (status) => {
            listadoStatus = status;
        },
    };

    await page.route(
        (url) => PATH_API.test(url.pathname),
        async (route: Route) => {
            const request = route.request();
            const headers = corsHeaders(await request.headerValue("origin"));
            if (request.method() === "OPTIONS") {
                await route.fulfill({ status: 204, headers });
                return;
            }
            if (request.method() === "GET") {
                estado.gets += 1;
                if (opciones.listadoDelayMs) await new Promise((r) => setTimeout(r, opciones.listadoDelayMs));
                if (listadoStatus >= 400) {
                    await route.fulfill({
                        status: listadoStatus,
                        headers,
                        json: opciones.listadoErrorBody ?? { detail: "Internal Server Error" },
                    });
                    return;
                }
                await route.fulfill({ headers, json: { emisiones: listado } });
                return;
            }
            if (request.method() === "PATCH") {
                const id = decodeURIComponent(new URL(request.url()).pathname.split("/").pop() ?? "");
                estado.patches.push(id);
                const aprobar = opciones.aprobar ?? { status: 200 };
                if (aprobar.delayMs) await new Promise((r) => setTimeout(r, aprobar.delayMs));
                if (aprobar.status < 400) listado = listado.filter((e) => e._id !== id);
                await route.fulfill({
                    status: aprobar.status,
                    headers,
                    json: aprobar.body ?? { message: `La comisión de la emisión con _id: ${id} quedó disponible.` },
                });
                return;
            }
            await route.continue();
        },
    );
    return estado;
}
