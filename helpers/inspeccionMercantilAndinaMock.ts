import type { Page, Route } from "@playwright/test";

export const INSPECCION_MERCANTIL_ENDPOINT = "/inspeccion/automotor/Mercantil_Andina";

export type TipoFalloInspeccion = "http" | "red";

export type PolkoErrorEvento = {
    type?: string;
    source?: string;
    message?: string;
    company?: string;
};

function corsHeaders(route: Route): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": route.request().headers()["origin"] ?? "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };
}

/**
 * Intercepta `POST /inspeccion/automotor/Mercantil_Andina` y hace fallar los primeros
 * `veces` pedidos (todos si no se indica). Los siguientes van al backend real.
 * `intentos()` cuenta los POST que salieron del front (fallados + reales).
 */
export async function fallarPedidoInspeccionMercantil(
    page: Page,
    opts: { tipo: TipoFalloInspeccion; veces?: number },
): Promise<{ intentos: () => number }> {
    let intentos = 0;

    await page.route(`**${INSPECCION_MERCANTIL_ENDPOINT}`, async (route) => {
        if (route.request().method() === "OPTIONS") {
            if (opts.veces !== undefined && intentos >= opts.veces) {
                await route.fallback();
                return;
            }
            await route.fulfill({ status: 204, headers: corsHeaders(route) });
            return;
        }

        intentos += 1;
        if (opts.veces !== undefined && intentos > opts.veces) {
            await route.fallback();
            return;
        }

        if (opts.tipo === "red") {
            await route.abort("failed");
            return;
        }
        await route.fulfill({
            status: 500,
            contentType: "application/json",
            headers: corsHeaders(route),
            body: JSON.stringify({ detail: "Error simulado por E2E (POL-3182)" }),
        });
    });

    return { intentos: () => intentos };
}

/** Eventos `polko_error` del dataLayer cuyo `error.source` es el endpoint de inspección de Mercantil. */
export async function polkoErrorsInspeccionMercantil(page: Page): Promise<PolkoErrorEvento[]> {
    return page.evaluate((endpoint) => {
        const dataLayer: any[] = (window as any).dataLayer ?? [];
        return dataLayer
            .filter(
                (e) =>
                    e?.event === "polko_error" &&
                    typeof e?.error?.source === "string" &&
                    e.error.source.includes(endpoint),
            )
            .map((e) => ({
                type: e.error.type,
                source: e.error.source,
                message: e.error.message,
                company: e.company,
            }));
    }, INSPECCION_MERCANTIL_ENDPOINT);
}
