/// <reference types="node" />
import { test } from "@playwright/test";
import CotizarMotoIAPage from "../pages/cotizarMotoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { SSECapture } from "../helpers/sseCapture";
import {
    SEED_COUNT,
    VEHICULO_SEED,
    setupPageWithMock,
} from "../helpers/ultimasCotizacionesMoto";

/**
 * Fase 1 — Seed de cotizaciones para Últimas cotizaciones (moto).
 * Parallel / multi-worker. Solo hasta el click de Cotizar (sin esperar resultados).
 *
 * Corre como dependencia del project `ultimas-cotizaciones` (userPre) o
 * `ultimas-cotizaciones-polkista` (userPolkista):
 *   npx playwright test --project=ultimas-cotizaciones
 *   npx playwright test --project=ultimas-cotizaciones-polkista
 */

test.describe("Últimas cotizaciones - Moto seed @regression", () => {
    test.describe.configure({ mode: "parallel" });

    test.afterEach(async ({}, testInfo) => {
        await attachBackendLogsOnFailure(testInfo);
    });

    for (let i = 0; i < SEED_COUNT; i++) {
        test(`cotizar ${i + 1}/${SEED_COUNT}`, async ({ page }, testInfo) => {
            test.setTimeout(90000);

            const sseCapture = new SSECapture(page);
            await sseCapture.setup("sse");

            try {
                const cotizar = new CotizarMotoIAPage(page);
                await setupPageWithMock(page, "http://localhost:3000/u/cotizar/motovehiculo");
                // Solo en este seed: no esperar tabla de planes. El resto de specs
                // usan cotizarVehiculo() sin flag y sí esperan resultados.
                await cotizar.cotizarVehiculo(VEHICULO_SEED, { waitForResults: false });
            } finally {
                await sseCapture.attachToReport(testInfo, `ultimas-moto-seed-${i + 1}`);
            }
        });
    }
});
