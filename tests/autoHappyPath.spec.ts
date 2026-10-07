import { test, expect } from "@playwright/test";
import CotizarAutoIAPage, { PLAN_CODES_AUTO } from "../pages/cotizarAutoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import {
    FORMA_PAGO_POR_COMPANIA,
    PLAN_POR_COMPANIA,
    SKIP_INSPECCION,
} from "../data/autoEmisionPorCompania";

/**
 * Happy path E2E de automotor con `mocks/mockUserDataATM.json` (habilita
 * Federación y Mercantil; Experta sigue fallando al cotizar).
 *
 * Variantes de titular (data/autos.json):
 *   - Física / Consumidor final (default, CUIT 27381618426)
 *   - Jurídica / Responsable inscripto (CUIT 30711392404)
 *   - Física / Responsable inscripto (CUIT 23343180489)
 *
 * Auth por project (storageState) + mock de usuario por route:
 *   npx playwright test tests/autoHappyPath.spec.ts --project=chromium
 *   npx playwright test tests/autoHappyPath.spec.ts --project=chromiumPolkista
 *   npx playwright test tests/autoHappyPath.spec.ts --project=mobile
 */

const VEHICULO_BASE = {
    marca: "RENAULT",
    año: "2022",
    modelo: "LOGAN",
    version: "LOGAN II 1.6 16V INTENS L/19",
    c_postal: "5000",
};

/** Física consumidor final — default histórico del happy path. */
const VEHICULO = { ...VEHICULO_BASE };

/** Jurídica + RI — autos.json (cuitDni 30711392404). */
const VEHICULO_JURIDICA = {
    ...VEHICULO_BASE,
    tipoPersona: "Jurídica",
    sitImpositiva: "Responsable inscripto",
};

/** Física + RI — autos.json (cuitDni 23343180489). */
const VEHICULO_FISICA_RI = {
    ...VEHICULO_BASE,
    tipoPersona: "Física",
    sitImpositiva: "Responsable inscripto",
};

const CUIT_DEFAULT = "27381618426";
const CUIT_JURIDICA = "30711392404";
const CUIT_FISICA_RI = "23343180489";
const LOCALIDAD_CORDOBA = "(5000) CORDOBA";

async function applyUserMock(page: import("@playwright/test").Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

type VehiculoCotizar = typeof VEHICULO_BASE & {
    tipoPersona?: string;
    sitImpositiva?: string;
};

function registerHappyPathSuite(
    suiteTitle: string,
    vehiculo: VehiculoCotizar,
    emitOpts: { dniCuit: string; localidad?: string; mail?: string; telefono?: string },
): void {
    test.describe(suiteTitle, () => {
        test.afterEach(async ({}, testInfo) => {
            await attachBackendLogsOnFailure(testInfo);
        });

        for (const [compania, nombrePlan] of Object.entries(PLAN_POR_COMPANIA)) {
            const codigo = PLAN_CODES_AUTO[compania][nombrePlan];

            test(`${compania}: cotizar y emitir "${nombrePlan}" (${codigo})`, async ({ page }) => {
                test.setTimeout(180000);
                const formaPago = FORMA_PAGO_POR_COMPANIA[compania] ?? "Efectivo";

                await documentarCaso({
                    epic: "Auto",
                    feature: "Happy path por aseguradora",
                    story: suiteTitle,
                    severidad: "critical",
                    prioridad: "high",
                    descripcion:
                        `Cotiza un ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.año} con el cotizador de Auto IA, ` +
                        `selecciona ${compania} y emite el plan "${nombrePlan}" (${codigo}) pagando con ${formaPago}. ` +
                        "Espera emisión exitosa con número de emisión y documentos descargables.",
                    precondiciones:
                        "Usuario logueado (storageState del project), datos de usuario mockeados con compañías habilitadas, " +
                        "frontend en localhost:3000 y backends levantados.",
                    parametros: {
                        Compañía: compania,
                        Plan: `${nombrePlan} (${codigo})`,
                        Titular: suiteTitle,
                        CUIT: emitOpts.dniCuit,
                        "Forma de pago": formaPago,
                    },
                    tags: ["auto", "happy-path", "regression"],
                });

                await applyUserMock(page);
                const cotizarAutoIA = new CotizarAutoIAPage(page);

                await test.step("Ingresar al cotizador de Auto IA", async () => {
                    await cotizarAutoIA.goto();
                });

                await test.step(`Cotizar ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.año} (CP ${vehiculo.c_postal})`, async () => {
                    await cotizarAutoIA.cotizarVehiculo(vehiculo);
                });

                await test.step(`Seleccionar ${compania} y validar que el plan ${codigo} tenga precio`, async () => {
                    await cotizarAutoIA.selectCompania(compania);
                    const plan = cotizarAutoIA.planCard(codigo);
                    await expect(plan).toBeVisible();
                    await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");
                });

                await test.step(`Emitir el plan ${codigo} con ${formaPago}`, async () => {
                    await cotizarAutoIA.emitirPlan(codigo, {
                        formaPago,
                        skipInspeccion: SKIP_INSPECCION[compania] === true,
                        ...emitOpts,
                    });
                });

                await test.step("Validar emisión exitosa, número de emisión y documentos", async () => {
                    await expect(
                        cotizarAutoIA.emisionExitosaHeading.or(cotizarAutoIA.emisionFinal.errorEmision),
                    ).toBeVisible();
                    await expect(cotizarAutoIA.emisionFinal.errorEmision).not.toBeVisible();
                    await cotizarAutoIA.assertNumeroEmision();
                    await expect(cotizarAutoIA.anyDocumentoDescargarBtn.first()).toBeEnabled();
                });
            });
        }
    });
}

test.describe("Auto - Happy path por aseguradora @regression", () => {
    registerHappyPathSuite("Física / Consumidor final", VEHICULO, {
        dniCuit: CUIT_DEFAULT,
    });

    registerHappyPathSuite("Jurídica / Responsable inscripto", VEHICULO_JURIDICA, {
        dniCuit: CUIT_JURIDICA,
        localidad: LOCALIDAD_CORDOBA,
    });

    registerHappyPathSuite("Física / Responsable inscripto", VEHICULO_FISICA_RI, {
        dniCuit: CUIT_FISICA_RI,
        mail: "cassinanico@gmail.com",
        telefono: "3512334798",
    });
});
