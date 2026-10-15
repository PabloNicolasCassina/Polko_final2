import { execSync } from 'child_process';
import type { Page, TestInfo } from '@playwright/test';

const CONTAINERS = [
    { id: 'main-gral', label: 'main-gral (general_api)' },
    { id: 'main-prod-pre', label: 'main-prod-pre (microservice_products)' },
];

const WINDOW_MARGIN_MS = 5_000;
const FALLBACK_WINDOW_MS = 15 * 60_000;
const MAX_LINE_LENGTH = 3_000;
const MAX_LINES = 600;
const UNFILTERED_TAIL_LINES = 300;

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const OWNER_ID_PATTERNS = [
    new RegExp(`request_?[iI]d['"]?\\s*[:=]\\s*['"]?(${UUID})`, 'g'),
    /(?:patente|vehicle_plate)['"]?\s*:\s*['"]([A-Z0-9]{6,7})['"]/g,
];
const REQUEST_KEY_PATTERNS = [
    new RegExp(`"(?:requestId|request_id)"\\s*:\\s*"(${UUID})"`, 'g'),
    /"(?:idCotizacion|idCotizar|quote_id|nro_cotizacion)"\s*:\s*"([0-9a-zA-Z]{6,})"/g,
    /"patente"\s*:\s*"([A-Z0-9]{6,7})"/g,
];

/**
 * POL-2871 / Gap B8: lee logs de un container docker desde un timestamp dado y devuelve
 * los valores capturados por `pattern` (debe tener un grupo de captura, ej. request_id).
 * Usado para verificar cuántas recotizaciones reales disparó el backend (independiente
 * de cuántos clicks/requests dispare el frontend). Devuelve [] si docker no está disponible
 * en el entorno de ejecución (el caller debe documentar el fallback).
 */
export function getBackendLogMatches(containerId: string, sinceIso: string, pattern: RegExp): string[] {
    try {
        const logs = execSync(`docker logs ${containerId} --since "${sinceIso}" 2>&1`, {
            encoding: 'utf8',
            timeout: 8000,
        });
        return [...logs.matchAll(pattern)].map((m) => m[1]).filter((v): v is string => Boolean(v));
    } catch {
        return [];
    }
}

function matchAll(text: string, patterns: RegExp[]): string[] {
    return patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((m) => m[1]));
}

async function collectCorrelationKeys(page?: Page): Promise<Set<string>> {
    const keys = new Set<string>();
    if (!page || page.isClosed()) return keys;
    try {
        for (const request of await page.requests()) {
            const body = request.postData();
            if (!body) continue;
            for (const key of matchAll(body, REQUEST_KEY_PATTERNS)) keys.add(key);
        }
    } catch {
        return keys;
    }
    return keys;
}

function splitIntoEntries(logs: string): string[][] {
    const entries: string[][] = [];
    for (const rawLine of logs.replace(ANSI_PATTERN, '').split('\n')) {
        const line = rawLine.length > MAX_LINE_LENGTH ? `${rawLine.slice(0, MAX_LINE_LENGTH)}…[truncado]` : rawLine;
        if (entries.length === 0 || !/^\s/.test(line)) entries.push([line]);
        else entries[entries.length - 1].push(line);
    }
    return entries;
}

function filterByCorrelation(logs: string, keys: Set<string>): string[] {
    const kept: string[] = [];
    let ownedByTest = false;
    for (const entry of splitIntoEntries(logs)) {
        const text = entry.join('\n');
        if ([...keys].some((key) => text.includes(key))) {
            ownedByTest = true;
        } else if (matchAll(text, OWNER_ID_PATTERNS).length > 0) {
            ownedByTest = false;
        }
        if (ownedByTest) kept.push(...entry);
    }
    return kept;
}

function testWindowStart(testInfo: TestInfo): Date {
    const elapsed = testInfo.duration > 0 ? testInfo.duration : FALLBACK_WINDOW_MS;
    return new Date(Date.now() - elapsed - WINDOW_MARGIN_MS);
}

/**
 * Adjunta los logs de backend del test que falló. Con `page` se filtran por los requestId,
 * ids de cotización y patentes que mandó el propio test, para no mezclar logs de workers
 * en paralelo; sin `page` (o sin coincidencias) se adjunta solo la ventana de tiempo del test.
 */
export async function attachBackendLogsOnFailure(testInfo: TestInfo, page?: Page): Promise<void> {
    if (testInfo.status !== 'failed' && testInfo.status !== 'timedOut') {
        return;
    }

    const since = testWindowStart(testInfo).toISOString();
    const keys = await collectCorrelationKeys(page);
    const keysLabel = keys.size > 0 ? [...keys].join(', ') : 'ninguna';

    for (const container of CONTAINERS) {
        try {
            const logs = execSync(`docker logs ${container.id} --since "${since}" 2>&1`, {
                encoding: 'utf8',
                timeout: 8000,
                maxBuffer: 256 * 1024 * 1024,
            });

            const filtered = keys.size > 0 ? filterByCorrelation(logs, keys) : [];
            const isFiltered = filtered.length > 0;
            const lines = isFiltered
                ? filtered.slice(-MAX_LINES)
                : splitIntoEntries(logs).flat().slice(-UNFILTERED_TAIL_LINES);
            const header = [
                `--- ${container.label} ---`,
                `Desde: ${since}`,
                `Claves de correlación del test: ${keysLabel}`,
                isFiltered
                    ? `Filtrado por claves del test (${lines.length} líneas)`
                    : `SIN filtro por test: últimas ${lines.length} líneas de la ventana (puede incluir otros workers)`,
            ].join('\n');

            await testInfo.attach(`backend-log-${container.id}`, {
                body: `${header}\n\n${lines.join('\n')}`,
                contentType: 'text/plain',
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            await testInfo.attach(`backend-log-error-${container.id}`, {
                body: `No se pudo obtener logs de ${container.id}: ${errorMessage}`,
                contentType: 'text/plain',
            });
        }
    }
}
