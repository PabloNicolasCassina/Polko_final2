import { test, expect } from "@playwright/test";
import CotizarMotoIAPage, { PLAN_CODES_MOTO } from "../pages/cotizarMotoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { reportarNumeroEmision } from "../helpers/reportePoliza";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";

/**
 * Happy path E2E de motovehículo con `mocks/mockUserDataATM.json` (habilita
 * Triunfo + Fed/Mercantil del mock; una vez por cada una de las 5 aseguradoras
 * soportadas: Sancor, RUS, Rivadavia, ATM, Triunfo). A diferencia del smoke
 * (que solo corre Rivadavia), esto cubre que las 5 integraciones cotizan Y
 * emiten de punta a punta — corre más seguido que la matrix de config
 * avanzada, pero no en cada PR (pensado para nightly/pre-merge a main).
 *
 * Variantes de titular (misma data que autos.json):
 *   - Física / Consumidor final (default, CUIT 27381618426)
 *   - Jurídica / Responsable inscripto (CUIT 30711392404)
 *   - Física / Responsable inscripto (CUIT 23343180489)
 *
 * Cada test es independiente (cotiza desde cero) para poder correr en
 * paralelo con los 4 workers ya configurados en playwright.config.ts.
 * Plan elegido por aseguradora: uno representativo de gama media, no el más
 * barato (RC solo) ni el más caro, para ejercitar un plan con cobertura real.
 *
 * En fallo/timeout, `afterEach` adjunta al reporte las últimas 100 líneas de
 * `main-gral` (general_api) y `main-prod-pre` (microservice_products).
 *
 * Auth por project (storageState) + mock de usuario por route:
 *   npx playwright test tests/motoHappyPath.spec.ts --project=chromium
 *   npx playwright test tests/motoHappyPath.spec.ts --project=chromiumPolkista
 *   npx playwright test tests/motoHappyPath.spec.ts --project=mobile
 */

const VEHICULO_BASE = { marca: "BENELLI", año: "2022", version: "LEONCINO 250", c_postal: "5000" };

const VEHICULO = { ...VEHICULO_BASE };

const VEHICULO_JURIDICA = {
    ...VEHICULO_BASE,
    tipoPersona: "Jurídica",
    sitImpositiva: "Responsable inscripto",
};

const VEHICULO_FISICA_RI = {
    ...VEHICULO_BASE,
    tipoPersona: "Física",
    sitImpositiva: "Responsable inscripto",
};

const CUIT_DEFAULT = "27381618426";
const CUIT_JURIDICA = "30711392404";
const CUIT_FISICA_RI = "23343180489";
const LOCALIDAD_CORDOBA = "(5000) CORDOBA";

const PLAN_POR_COMPANIA: Record<string, string> = {
    Sancor: "Moto Premium", // código 17
    RUS: "RCM c/grúa", // código RCM-G
    Rivadavia: "Base Plus", // código F — verificado en vivo (smoke)
    ATM: "Robo Premium", // código C
    Triunfo: "C8", // misma gama media que autoHappyPath
};

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
            const codigo = PLAN_CODES_MOTO[compania][nombrePlan];

            test(`${compania}: cotizar y emitir "${nombrePlan}" (${codigo})`, async ({ page }) => {
                // Triunfo puede tardar >60s en cotizar; 180s cubre cotizar+emitir.
                test.setTimeout(180000);

                await documentarCaso({
                    epic: "Moto",
                    feature: "Happy path por aseguradora",
                    story: suiteTitle,
                    severidad: "critical",
                    prioridad: "high",
                    descripcion:
                        `Cotiza una ${vehiculo.marca} ${vehiculo.version} ${vehiculo.año} con el cotizador de Moto IA, ` +
                        `selecciona ${compania} y emite el plan "${nombrePlan}" (${codigo}) intentando pagar con Efectivo ` +
                        "(si la aseguradora no lo ofrece, usa la forma de pago disponible). " +
                        "Espera emisión exitosa con número de póliza y documentos descargables.",
                    precondiciones:
                        "Usuario logueado (storageState del project), datos de usuario mockeados con compañías habilitadas, " +
                        "frontend en localhost:3000 y backends levantados.",
                    parametros: {
                        Compañía: compania,
                        Plan: `${nombrePlan} (${codigo})`,
                        Titular: suiteTitle,
                        CUIT: emitOpts.dniCuit,
                        "Forma de pago": "Efectivo",
                    },
                    tags: ["moto", "happy-path", "regression"],
                });

                await applyUserMock(page);
                const cotizarMotoIA = new CotizarMotoIAPage(page);

                await test.step("Ingresar al cotizador de Moto IA", async () => {
                    await cotizarMotoIA.goto();
                });

                await test.step(`Cotizar ${vehiculo.marca} ${vehiculo.version} ${vehiculo.año} (CP ${vehiculo.c_postal})`, async () => {
                    await cotizarMotoIA.cotizarVehiculo(vehiculo);
                });

                await test.step(`Seleccionar ${compania} y validar que el plan ${codigo} tenga precio`, async () => {
                    await cotizarMotoIA.selectCompania(compania);
                    const plan = cotizarMotoIA.planCard(codigo);
                    await expect(plan).toBeVisible();
                    await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");
                });

                await test.step(`Emitir el plan ${codigo}`, async () => {
                    // Efectivo no existe en todas (Sancor/ATM); emitirPlan lo intenta
                    // best-effort y completa CBU/TC según lo que quede seleccionado.
                    await cotizarMotoIA.emitirPlan(codigo, {
                        formaPago: "Efectivo",
                        ...emitOpts,
                    });
                });

                await test.step("Validar emisión exitosa, número de póliza y documentos", async () => {
                    await expect(
                        cotizarMotoIA.emisionExitosaHeading.or(cotizarMotoIA.emisionFinal.errorEmision),
                    ).toBeVisible();
                    await expect(cotizarMotoIA.emisionFinal.errorEmision).not.toBeVisible();
                    // Label y docs varían por aseguradora (Rivadavia: "Número de Póliza" +
                    // "Póliza completa"; RUS: "Número de poliza" + "PDF Frente Póliza").
                    await reportarNumeroEmision(cotizarMotoIA.numeroPolizaValue);
                    await expect(cotizarMotoIA.anyDocumentoDescargarBtn.first()).toBeEnabled();
                });
            });
        }
    });
}

test.describe("Moto - Happy path por aseguradora @regression", () => {
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
