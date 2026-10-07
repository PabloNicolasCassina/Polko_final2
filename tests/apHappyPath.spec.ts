import { test, expect } from "@playwright/test";
import CotizarAPIAPage, {
    PLANES_AP,
    PRODUCTOS_AP,
    type DatosCotizacionAP,
    type EmitirOptsAP,
} from "../pages/cotizarAPIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import { CUIT_ASEGURADO, CUIT_ASEGURADO_B, CUIT_TOMADOR_FISICA, CUIT_TOMADOR_JURIDICA } from "../data/apRoles";

/**
 * Happy path E2E de Accidentes Personales con `mocks/mockUserDataATM.json`.
 * Única aseguradora: Sancor. Se cotiza y emite cada plan estándar
 * (Intermedio / Sugerido) de cada producto (OCASION DE TRABAJO / INTEGRO).
 *
 * Variantes:
 *   - +30 días / Física consumidor final (tomador CUIT 27381618426, Sartori Carla)
 *   - +30 días / Jurídica responsable inscripto (tomador CUIT 30709938734)
 *   - Por día  / Física consumidor final (vigencia de 35 días, superior a 1 mes)
 * Asegurados (2): 20432715753 (Colla Federico) + 27410884629 (Cecchi Camila), con fecha de nacimiento de 30
 * años (rango default "Entre 16 y 70 años", ver `fechaNacimientoParaRango`).
 *
 * En fallo/timeout, `afterEach` adjunta al reporte las últimas 100 líneas de
 * `main-gral` (general_api) y `main-prod-pre` (microservice_products).
 *
 * Auth por project (storageState) + mock de usuario por route:
 *   npx playwright test tests/apHappyPath.spec.ts --project=chromium
 *   npx playwright test tests/apHappyPath.spec.ts --project=chromiumPolkista
 *   npx playwright test tests/apHappyPath.spec.ts --project=mobile
 */

const COTIZACION_BASE: DatosCotizacionAP = {
    vigencia: "+30 días",
    cantPersonas: "2",
    actividad: "Servicios Comunales, Sociales y Personales",
    clasificacion: "Otros Servicios sin uso de herramientas",
    tarea: "Administrativo",
    c_postal: "5000",
};

const COTIZACION_FISICA: DatosCotizacionAP = { ...COTIZACION_BASE };

const COTIZACION_JURIDICA: DatosCotizacionAP = {
    ...COTIZACION_BASE,
    situacionImpositiva: "Responsable inscripto",
};

const COTIZACION_POR_DIA: DatosCotizacionAP = {
    ...COTIZACION_BASE,
    vigencia: "Por día",
    diasVigencia: 35,
};

const ASEGURADOS = [CUIT_ASEGURADO, CUIT_ASEGURADO_B];
const TOMADOR_FISICA = CUIT_TOMADOR_FISICA;
const TOMADOR_JURIDICA = CUIT_TOMADOR_JURIDICA;

async function applyUserMock(page: import("@playwright/test").Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

function registerHappyPathSuite(
    suiteTitle: string,
    cotizacion: DatosCotizacionAP,
    emitOpts: EmitirOptsAP,
): void {
    test.describe(suiteTitle, () => {
        test.afterEach(async ({}, testInfo) => {
            await attachBackendLogsOnFailure(testInfo);
        });

        for (const producto of Object.values(PRODUCTOS_AP)) {
            for (const plan of PLANES_AP) {
                test(`Sancor ${producto}: cotizar y emitir "${plan}"`, async ({ page }) => {
                    // Alta de matriz + emisión Sancor ≈ 70s; cotizar ≈ 15s.
                    test.setTimeout(300000);
                    const formaPago = emitOpts.formaPago ?? "Efectivo";

                    await documentarCaso({
                        epic: "Accidentes Personales",
                        feature: "Happy path por producto y plan",
                        story: suiteTitle,
                        severidad: "critical",
                        prioridad: "high",
                        descripcion:
                            `Cotiza Accidentes Personales (${cotizacion.vigencia}, ${cotizacion.cantPersonas} personas, ` +
                            `tarea "${cotizacion.tarea}") con el cotizador de AP IA y emite en Sancor el plan "${plan}" ` +
                            `del producto ${producto} pagando con ${formaPago}. ` +
                            "Espera que el plan tenga precio y que la emisión sea exitosa.",
                        precondiciones:
                            "Usuario logueado (storageState del project), datos de usuario mockeados con Sancor habilitada, " +
                            "frontend en localhost:3000 y backends levantados.",
                        parametros: {
                            Compañía: "Sancor",
                            Producto: producto,
                            Plan: plan,
                            Variante: suiteTitle,
                            Tomador: emitOpts.tomador,
                            "Forma de pago": formaPago,
                        },
                        tags: ["ap", "happy-path", "regression"],
                    });

                    await applyUserMock(page);
                    const cotizarAP = new CotizarAPIAPage(page);

                    await test.step("Ingresar al cotizador de AP IA", async () => {
                        await cotizarAP.goto();
                    });

                    await test.step(`Cotizar AP ${cotizacion.vigencia} para ${cotizacion.cantPersonas} personas`, async () => {
                        await cotizarAP.cotizarAP(cotizacion);
                    });

                    await test.step(`Validar que ${producto} / ${plan} tenga precio`, async () => {
                        await cotizarAP.esperarPlan(producto, plan);
                        expect(await cotizarAP.planPrecio(producto, plan)).toBeGreaterThan(0);
                    });

                    await test.step(`Emitir ${producto} / ${plan} con ${formaPago}`, async () => {
                        await cotizarAP.emitirPlan(producto, plan, emitOpts);
                    });

                    await test.step("Validar emisión exitosa", async () => {
                        await cotizarAP.assertEmisionExitosa();
                    });
                });
            }
        }
    });
}

test.describe("AP - Happy path por producto y plan @regression", () => {
    registerHappyPathSuite("+30 días / Física / Consumidor final", COTIZACION_FISICA, {
        formaPago: "Efectivo",
        tomador: TOMADOR_FISICA,
        asegurados: ASEGURADOS,
    });

    registerHappyPathSuite("+30 días / Jurídica / Responsable inscripto", COTIZACION_JURIDICA, {
        formaPago: "Débito por CBU",
        tomador: TOMADOR_JURIDICA,
        asegurados: ASEGURADOS,
    });

    registerHappyPathSuite("Por día / Física / Consumidor final", COTIZACION_POR_DIA, {
        formaPago: "Tarjeta de crédito",
        tomador: TOMADOR_FISICA,
        asegurados: ASEGURADOS,
    });
});
