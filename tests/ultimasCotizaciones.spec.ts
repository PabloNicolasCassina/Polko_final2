/// <reference types="node" />
import { test, expect } from "@playwright/test";
import CotizarMotoIAPage from "../pages/cotizarMotoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { SSECapture } from "../helpers/sseCapture";
import {
    MOTO_COMPANIES,
    N,
    ROW_DESCRIPTION,
    dismissAceptarIfPresent,
    goToDashboardUltimas,
} from "../helpers/ultimasCotizacionesMoto";

/**
 * Fase 2 — RECOTIZAR + EMITIR desde Últimas cotizaciones (moto).
 *
 * Un test por compañía (sin `mode: 'serial'`): si RUS falla, ATM igual corre.
 * El project `ultimas-cotizaciones` usa `fullyParallel: false` para ejecutarlos
 * en orden (evita carreras en el dashboard) sin saltear el resto al fallar.
 *
 * Requiere el seed previo (`ultimas-seed` / `ultimas-seed-polkista`). Correr:
 *   npx playwright test --project=ultimas-cotizaciones
 *   npx playwright test --project=ultimas-cotizaciones-polkista
 * Solo acciones (sin seed):
 *   npx playwright test --project=ultimas-cotizaciones --no-deps
 *   npx playwright test --project=ultimas-cotizaciones-polkista --no-deps
 */

test.describe("Últimas cotizaciones - Moto RECOTIZAR/EMITIR @regression", () => {
    test.afterEach(async ({}, testInfo) => {
        await attachBackendLogsOnFailure(testInfo);
    });

    for (const company of MOTO_COMPANIES) {
        test(`RECOTIZAR + emitir ${company.label} (${company.planName})`, async ({ page }, testInfo) => {
            test.setTimeout(360000);

            const sseCapture = new SSECapture(page);
            await sseCapture.setup("sse");

            try {
                const cotizar = new CotizarMotoIAPage(page);

                await test.step("Abrir RECOTIZAR desde Últimas cotizaciones", async () => {
                    const ultimas = await goToDashboardUltimas(page);
                    await ultimas.clickRecotizarMotovehiculo({ description: ROW_DESCRIPTION });
                    await dismissAceptarIfPresent(page);
                    await expect(page).toHaveURL(/\/u\/cotizar\/motovehiculo/);
                });

                await test.step("Completar recotización hasta resultados", async () => {
                    await cotizar.avanzarRecotizacionHastaResultados(company.label);
                });

                await test.step(`Emitir plan ${company.planName} en ${company.label}`, async () => {
                    await cotizar.selectCompania(company.label);
                    await expect(cotizar.planCard(company.planCode)).toBeVisible();
                    await cotizar.emitirPlan(company.planCode, { formaPago: "Efectivo" });
                    await cotizar.assertEmisionExitosa();
                });
            } finally {
                await sseCapture.attachToReport(testInfo, `ultimas-moto-recotizar-${company.label}`);
            }
        });
    }

    for (const company of MOTO_COMPANIES) {
        test(`EMITIR + emitir ${company.label} (${company.planName})`, async ({ page }, testInfo) => {
            test.setTimeout(360000);

            const sseCapture = new SSECapture(page);
            await sseCapture.setup("sse");

            try {
                const cotizar = new CotizarMotoIAPage(page);

                await test.step("Abrir EMITIR desde Últimas cotizaciones", async () => {
                    const ultimas = await goToDashboardUltimas(page);
                    await ultimas.clickEmitirMotovehiculo({
                        description: ROW_DESCRIPTION,
                        skipMatches: 2 * N,
                    });
                    await dismissAceptarIfPresent(page);
                    await expect(page).toHaveURL(/\/u\/cotizar\/motovehiculo/);
                });

                await test.step("Esperar resultados de cotización (action=emitir)", async () => {
                    await cotizar.esperarResultadosCotizacion(180000, company.label);
                });

                await test.step(`Emitir plan ${company.planName} en ${company.label}`, async () => {
                    await cotizar.selectCompania(company.label);
                    await expect(cotizar.planCard(company.planCode)).toBeVisible();
                    await cotizar.emitirPlan(company.planCode, { formaPago: "Efectivo" });
                    await cotizar.assertEmisionExitosa();
                });
            } finally {
                await sseCapture.attachToReport(testInfo, `ultimas-moto-emitir-${company.label}`);
            }
        });
    }
});
