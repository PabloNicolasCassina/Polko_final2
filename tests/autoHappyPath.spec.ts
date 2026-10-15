import { test, expect } from "@playwright/test";
import CotizarAutoIAPage, { PLAN_CODES_AUTO } from "../pages/cotizarAutoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import {
    descargarPolizaDesdeMiCartera,
    TIMEOUT_EXTRA_POLIZA_MI_CARTERA,
    TOLERANCIA_PRECIO_POLIZA as TOLERANCIA_PRECIO,
    validarPdfPoliza,
} from "../helpers/polizaMiCartera";
import { COBERTURAS_PDF_AUTO, validarComparadorCtrowAuto } from "../helpers/comparadorCotizacion";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import data from "../data/autos.json";
import {
    FORMA_PAGO_POR_COMPANIA,
    PLAN_POR_COMPANIA,
    SKIP_INSPECCION,
} from "../data/autoEmisionPorCompania";

/**
 * Happy path E2E de automotor con `mocks/mockUserDataATM.json` (habilita
 * Federación y Mercantil; Experta sigue fallando al cotizar).
 *
 * Se repite por cada vehículo único (marca/año/modelo/versión) de data/autos.json.
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

type VehiculoBase = {
    marca: string;
    año: string;
    modelo: string;
    version: string;
    c_postal: string;
};

/** Un vehículo por combinación única marca/año/modelo/versión de data/autos.json. */
const VEHICULOS: VehiculoBase[] = Array.from(
    new Map(
        data.autos.map((a: VehiculoBase) => [
            `${a.marca}|${a.año}|${a.modelo}|${a.version}`,
            { marca: a.marca, año: a.año, modelo: a.modelo, version: a.version, c_postal: a.c_postal },
        ]),
    ).values(),
);

const CUIT_DEFAULT = "27381618426";
const CUIT_JURIDICA = "30711392404";
const CUIT_FISICA_RI = "23343180489";
const LOCALIDAD_CORDOBA = "(5000) CORDOBA";
const LOCALIDAD_PDF = "CORDOBA";

async function applyUserMock(page: import("@playwright/test").Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

type VehiculoCotizar = VehiculoBase & {
    tipoPersona?: string;
    sitImpositiva?: string;
};

function registerHappyPathSuite(
    suiteTitle: string,
    vehiculo: VehiculoCotizar,
    emitOpts: { dniCuit: string; localidad?: string; mail?: string; telefono?: string },
): void {
    test.describe(suiteTitle, () => {
        test.afterEach(async ({ page }, testInfo) => {
            await attachBackendLogsOnFailure(testInfo, page);
        });

        for (const [compania, nombrePlan] of Object.entries(PLAN_POR_COMPANIA)) {
            const codigo = PLAN_CODES_AUTO[compania][nombrePlan];

            test(`${compania}: cotizar y emitir "${nombrePlan}" (${codigo})`, async ({ page }, testInfo) => {
                test.setTimeout(360000);
                const formaPago = FORMA_PAGO_POR_COMPANIA[compania] ?? "Efectivo";

                await documentarCaso({
                    epic: "Auto",
                    feature: "Happy path por aseguradora",
                    story: suiteTitle,
                    severidad: "critical",
                    prioridad: "high",
                    descripcion:
                        `Cotiza un ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.año} con el cotizador de Auto IA, ` +
                        `selecciona ${compania}, agrega el plan "${nombrePlan}" (${codigo}) al comparador, verifica que el ` +
                        "drawer y el PDF de cotización muestren el mismo premio que la tarjeta, que el PDF incluya el " +
                        "nombre del plan, los datos del vehículo (marca, versión, año, CP y localidad), las cuotas, " +
                        'la tabla de coberturas y que los links "Emitir" aparezcan solo con "Habilitar compra", ' +
                        `y emite el plan pagando con ${formaPago}. ` +
                        "Espera emisión exitosa con número de emisión y documentos descargables. " +
                        "Luego busca la póliza por patente en Mi cartera, descarga la póliza y verifica que el PDF " +
                        `corresponda a esa patente y contenga el precio cotizado (±${TOLERANCIA_PRECIO * 100}%).`,
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

                const precio = await test.step(`Seleccionar ${compania} y validar que el plan ${codigo} tenga precio`, async () => {
                    await cotizarAutoIA.selectCompania(compania);
                    const plan = cotizarAutoIA.planCard(codigo);
                    await expect(plan).toBeVisible();
                    await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");
                    const leido = await cotizarAutoIA.precioPlan(codigo);
                    expect(leido.premio, "El premio del plan debería ser un número positivo").toBeGreaterThan(0);
                    testInfo.annotations.push({
                        type: "Precio cotizado",
                        description: `$${leido.premio.toLocaleString("es-AR")} x ${leido.cuotas} cuota(s)`,
                    });
                    return leido;
                });

                await test.step(`Comparar el plan ${codigo} y validar el PDF de cotización (premio, plan, vehículo, cuotas, coberturas y links Emitir)`, async () => {
                    const premio = await validarComparadorCtrowAuto(
                        page,
                        testInfo,
                        cotizarAutoIA.ctrowTable,
                        codigo,
                        `${compania}-${codigo}`,
                        {
                            textosVehiculo: [vehiculo.marca, vehiculo.version, vehiculo.año, vehiculo.c_postal, LOCALIDAD_PDF],
                            textosNombreArchivo: [vehiculo.marca, vehiculo.modelo, vehiculo.año],
                            coberturas: COBERTURAS_PDF_AUTO,
                            cuotas: precio.cuotas,
                            validarCompra: true,
                        },
                    );
                    expect(premio, "El premio comparado no coincide con el cotizado").toBe(precio.premio);
                });

                const { patente } = await test.step(`Emitir el plan ${codigo} con ${formaPago}`, async () => {
                    return cotizarAutoIA.emitirPlan(codigo, {
                        formaPago,
                        skipInspeccion: SKIP_INSPECCION[compania] === true,
                        ...emitOpts,
                    });
                });

                const emision = await test.step("Validar emisión exitosa, número de emisión y documentos", async () => {
                    await expect(
                        cotizarAutoIA.emisionExitosaHeading.or(cotizarAutoIA.emisionFinal.errorEmision),
                    ).toBeVisible();
                    await expect(cotizarAutoIA.emisionFinal.errorEmision).not.toBeVisible();
                    const numero = await cotizarAutoIA.assertNumeroEmision();
                    await expect(cotizarAutoIA.anyDocumentoDescargarBtn.first()).toBeEnabled();
                    return numero;
                });

                test.setTimeout(testInfo.timeout + TIMEOUT_EXTRA_POLIZA_MI_CARTERA);
                const pdfPath = await test.step(`Buscar la póliza en Mi cartera por patente ${patente} y descargarla`, async () =>
                    descargarPolizaDesdeMiCartera(page, testInfo, patente, compania),
                );

                if (!pdfPath) return;

                await test.step(`Validar que el PDF sea la póliza de ${patente} y el precio coincida (±${TOLERANCIA_PRECIO * 100}%)`, async () => {
                    await validarPdfPoliza(testInfo, pdfPath, {
                        patente,
                        numero: emision.tipo === "Número de póliza" ? { tipo: emision.tipo, valor: emision.numero } : undefined,
                        premio: precio.premio,
                        cuotas: precio.cuotas,
                    });
                });
            });
        }
    });
}

test.describe("Auto - Happy path por aseguradora @regression", () => {
    for (const vehiculo of VEHICULOS) {
        test.describe(`${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.año}`, () => {
            registerHappyPathSuite("Física / Consumidor final", vehiculo, {
                dniCuit: CUIT_DEFAULT,
            });

            registerHappyPathSuite(
                "Jurídica / Responsable inscripto",
                { ...vehiculo, tipoPersona: "Jurídica", sitImpositiva: "Responsable inscripto" },
                {
                    dniCuit: CUIT_JURIDICA,
                    localidad: LOCALIDAD_CORDOBA,
                },
            );

            registerHappyPathSuite(
                "Física / Responsable inscripto",
                { ...vehiculo, tipoPersona: "Física", sitImpositiva: "Responsable inscripto" },
                {
                    dniCuit: CUIT_FISICA_RI,
                    mail: "cassinanico@gmail.com",
                    telefono: "3512334798",
                },
            );
        });
    }
});
