import { type Page, type Request } from "@playwright/test";
import type { SSEEvent } from "./sseCapture";

export interface NewEmitirCapture {
    url: string;
    body: any;
}

/**
 * Extrae nros de cotización Triunfo (PresupuestoNro) de eventos SSE.
 * Prefiere `nro_cotizacion_triunfo`; ignora `nro_cotizacion: null` del body.
 */
export function extractTriunfoNrosFromSse(events: SSEEvent[]): string[] {
    const nros: string[] = [];
    for (const event of events) {
        if (event.type !== "message") continue;
        const company = String(event.data?.company ?? "").toLowerCase();
        if (company && company !== "triunfo") continue;
        collectTriunfoNros(event.data, nros);
        if (event.raw) {
            for (const m of event.raw.matchAll(/"nro_cotizacion_triunfo"\s*:\s*"?(\d+)"?/g)) {
                pushUnique(nros, m[1]);
            }
        }
    }
    return nros;
}

function collectTriunfoNros(node: any, nros: string[]): void {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const item of node) collectTriunfoNros(item, nros);
        return;
    }
    const triunfoNro = node.nro_cotizacion_triunfo ?? node.nroCotizacionTriunfo;
    if (triunfoNro != null && String(triunfoNro).trim() !== "") {
        pushUnique(nros, String(triunfoNro));
    }
    for (const value of Object.values(node)) {
        collectTriunfoNros(value, nros);
    }
}

/**
 * Extrae `idOperacion` de ATM desde eventos SSE.
 */
export function extractAtmIdOperacionesFromSse(events: SSEEvent[]): string[] {
    const ids: string[] = [];
    for (const event of events) {
        if (event.type !== "message") continue;
        const company = String(event.data?.company ?? "").toLowerCase();
        if (company && company !== "atm") continue;
        collectAtmIds(event.data, ids);
        if (event.raw) {
            for (const m of event.raw.matchAll(/"idOperacion"\s*:\s*"?([^",}\s]+)"?/g)) {
                pushUnique(ids, m[1]);
            }
        }
    }
    return ids;
}

function collectAtmIds(node: any, ids: string[]): void {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const item of node) collectAtmIds(item, ids);
        return;
    }
    if (node.idOperacion != null && String(node.idOperacion).trim() !== "") {
        pushUnique(ids, String(node.idOperacion));
    }
    for (const value of Object.values(node)) {
        collectAtmIds(value, ids);
    }
}

function pushUnique(list: string[], value: string): void {
    if (!list.includes(value)) list.push(value);
}

export function isNewEmitirRequest(request: Request): boolean {
    return request.method() === "POST" && /newemitir|\/emitir(\/|$|\?)/i.test(request.url())
        && !/cotizar/i.test(request.url());
}

/**
 * Dispara `action` y captura el body JSON del POST /newemitir (o /emitir).
 */
export async function captureNewEmitirBody(
    page: Page,
    action: () => Promise<void>,
    timeoutMs = 180000
): Promise<NewEmitirCapture> {
    const requestPromise = page.waitForRequest(isNewEmitirRequest, { timeout: timeoutMs });
    await action();
    const request = await requestPromise;
    const raw = request.postData() ?? "{}";
    let body: any;
    try {
        body = JSON.parse(raw);
    } catch {
        body = { _raw: raw };
    }
    return { url: request.url(), body };
}

export function getEmitNroCotizacion(body: any): string | null {
    const nro =
        body?.parametrosAdicionales?.nro_cotizacion
        ?? body?.parametrosAdicionales?.nro_cotizacion_triunfo
        ?? body?.nro_cotizacion
        ?? null;
    return nro != null && String(nro).trim() !== "" ? String(nro) : null;
}

export function getEmitIdOperacion(body: any): string | null {
    const id =
        body?.parametrosAdicionales?.idOperacion
        ?? body?.idOperacion
        ?? null;
    return id != null && String(id).trim() !== "" ? String(id) : null;
}

export function getEmitDescuento(body: any): number | null {
    const d =
        body?.parametrosAdicionales?.descuento
        ?? body?.parametrosAdicionales?.descuentoEspecial
        ?? body?.descuento
        ?? null;
    return d == null ? null : Number(d);
}
