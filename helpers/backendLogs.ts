import { execSync } from 'child_process';
import type { TestInfo } from '@playwright/test';

const CONTAINERS = [
    { id: 'main-gral', label: 'main-gral (general_api)' },
    { id: 'main-prod-pre', label: 'main-prod-pre (microservice_products)' },
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

export async function attachBackendLogsOnFailure(testInfo: TestInfo): Promise<void> {
    if (testInfo.status !== 'failed' && testInfo.status !== 'timedOut') {
        return;
    }

    for (const container of CONTAINERS) {
        try {
            const logs = execSync(`docker logs ${container.id} --tail 100 2>&1`, {
                encoding: 'utf8',
                timeout: 8000,
            });
            await testInfo.attach(`backend-log-${container.id}`, {
                body: `--- ${container.label} - Últimas 100 líneas ---\n\n${logs}`,
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
