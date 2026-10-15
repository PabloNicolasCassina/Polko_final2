import { test, expect, type Page } from "@playwright/test";
import CotizarAutoIAPage, { PLAN_CODES_AUTO } from "../pages/cotizarAutoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import {
    fallarPedidoInspeccionMercantil,
    INSPECCION_MERCANTIL_ENDPOINT,
    polkoErrorsInspeccionMercantil,
    type TipoFalloInspeccion,
} from "../helpers/inspeccionMercantilAndinaMock";
import autosData from "../data/autos.json";

/**
 * POL-3182: el paso Inspección de Mercantil Andina no deja avanzar a emisión
 * cuando falla `POST /inspeccion/automotor/Mercantil_Andina`, reintenta con
 * Siguiente y registra el fallo como `polko_error`.
 *
 * Mock: `mocks/mockUserDataATM.json` (habilita Mercantil). El fallo del pedido se
 * fuerza con `page.route` (500 o corte de red).
 *
 *   npx playwright test tests/autoMercantilInspeccionFallo.spec.ts --project=chromium
 */

type AutoFixture = {
    marca: string;
    año: string;
    modelo: string;
    version: string;
    c_postal: string;
    tipoPersona?: string;
    sitImpositiva?: string;
    testType?: string;
};

const VEHICULO = (autosData.autos as AutoFixture[]).find(
    (a) => !a.testType && a.tipoPersona === "Física" && a.sitImpositiva === "Consumidor final",
)!;

const COMPANIA = "Mercantil";
const NOMBRE_PLAN = "B1";
const CODIGO = PLAN_CODES_AUTO[COMPANIA][NOMBRE_PLAN];
const FORMA_PAGO = "Efectivo";
const TEXTO_VIEJO = /Volvé al paso\s+anterior/;

async function applyUserMock(page: Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

async function cotizarYAbrirInspeccion(cotizarAutoIA: CotizarAutoIAPage): Promise<void> {
    await test.step("Ingresar al cotizador de Auto IA", async () => {
        await cotizarAutoIA.goto();
    });

    await test.step(`Cotizar ${VEHICULO.marca} ${VEHICULO.modelo} ${VEHICULO.año} y seleccionar ${COMPANIA}`, async () => {
        await cotizarAutoIA.cotizarVehiculo(VEHICULO);
        await cotizarAutoIA.selectCompania(COMPANIA);
        await expect(cotizarAutoIA.planCard(CODIGO)).toBeVisible();
    });

    await test.step(`Emitir ${NOMBRE_PLAN} (${CODIGO}) hasta el paso Inspección`, async () => {
        await cotizarAutoIA.avanzarHastaPasoInspeccion(CODIGO, { formaPago: FORMA_PAGO });
    });
}

async function validarPasoBloqueado(cotizarAutoIA: CotizarAutoIAPage): Promise<void> {
    await expect(cotizarAutoIA.emisionInspeccion.msgFetchError).toBeVisible({ timeout: 60000 });
    await expect(cotizarAutoIA.emisionInspeccion.msgFetchError).toContainText(
        "Tocá Siguiente para reintentar",
    );
    await expect(cotizarAutoIA.page.getByText(TEXTO_VIEJO)).toHaveCount(0);
    await expect(cotizarAutoIA.emisionInspeccion.btnIrAInspeccion).toBeHidden();
    await expect(cotizarAutoIA.emitirFinalBtn).toBeHidden();
}

const FALLOS: Array<{ tipo: TipoFalloInspeccion; titulo: string }> = [
    { tipo: "http", titulo: "error HTTP 500" },
    { tipo: "red", titulo: "error de red" },
];

test.describe("Auto - Mercantil Andina: fallo del pedido de inspección (POL-3182) @regression", () => {
    test.describe.configure({ mode: "parallel" });

    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    for (const { tipo, titulo } of FALLOS) {
        test(`Pedido de inspección con ${titulo}: bloquea el avance, reintenta con Siguiente y registra polko_error`, async ({
            page,
        }) => {
            test.setTimeout(360000);

            await documentarCaso({
                epic: "Auto",
                feature: "Inspección Mercantil Andina",
                story: "Fallo del pedido de inspección",
                severidad: "critical",
                prioridad: "high",
                tickets: ["POL-3182"],
                descripcion:
                    `Cotiza un ${VEHICULO.marca} ${VEHICULO.modelo} ${VEHICULO.año}, emite ${COMPANIA} ${NOMBRE_PLAN} ` +
                    `y fuerza un ${titulo} en POST ${INSPECCION_MERCANTIL_ENDPOINT}. Espera que el paso Inspección ` +
                    "muestre el mensaje nuevo (sin pedir volver al paso anterior), que Siguiente no lleve a Solicitud " +
                    "sino que reintente el pedido, y que cada fallo quede en el dataLayer como polko_error " +
                    "(tipo backend, URL del endpoint y compañía).",
                precondiciones:
                    "Usuario logueado (storageState del project), datos de usuario mockeados con Mercantil habilitada, " +
                    "frontend con el fix de POL-3182 en localhost:3000 y backends levantados.",
                parametros: {
                    Compañía: COMPANIA,
                    Plan: `${NOMBRE_PLAN} (${CODIGO})`,
                    Fallo: titulo,
                },
                tags: ["auto", "mercantil", "inspeccion", "POL-3182"],
            });

            await applyUserMock(page);
            const inspeccion = await fallarPedidoInspeccionMercantil(page, { tipo });
            const cotizarAutoIA = new CotizarAutoIAPage(page);

            await cotizarYAbrirInspeccion(cotizarAutoIA);

            await test.step("El paso Inspección explica el fallo y no ofrece el link", async () => {
                await validarPasoBloqueado(cotizarAutoIA);
                expect(inspeccion.intentos(), "El paso debería haber pedido la inspección al entrar").toBeGreaterThanOrEqual(1);
            });

            await test.step("El fallo queda registrado como polko_error", async () => {
                await expect
                    .poll(async () => (await polkoErrorsInspeccionMercantil(page)).length, { timeout: 15000 })
                    .toBeGreaterThanOrEqual(1);
                const [evento] = await polkoErrorsInspeccionMercantil(page);
                expect(evento.type).toBe("backend");
                expect(evento.source).toContain(INSPECCION_MERCANTIL_ENDPOINT);
                expect(evento.company).toBe("Mercantil_Andina");
            });

            const intentosAntes = inspeccion.intentos();
            const erroresAntes = (await polkoErrorsInspeccionMercantil(page)).length;

            await test.step("Siguiente reintenta el pedido y sigue sin dejar avanzar", async () => {
                await cotizarAutoIA.buttons.siguienteBtn.click();
                await expect
                    .poll(() => inspeccion.intentos(), { timeout: 30000 })
                    .toBeGreaterThan(intentosAntes);
                await validarPasoBloqueado(cotizarAutoIA);
            });

            await test.step("El reintento fallido también se registra como polko_error", async () => {
                await expect
                    .poll(async () => (await polkoErrorsInspeccionMercantil(page)).length, { timeout: 15000 })
                    .toBeGreaterThan(erroresAntes);
            });

            await test.step("Un segundo Siguiente vuelve a reintentar y no avanza", async () => {
                const intentosPrevios = inspeccion.intentos();
                await cotizarAutoIA.buttons.siguienteBtn.click();
                await expect
                    .poll(() => inspeccion.intentos(), { timeout: 30000 })
                    .toBeGreaterThan(intentosPrevios);
                await validarPasoBloqueado(cotizarAutoIA);
            });
        });
    }

    test("Pedido de inspección que falla y luego responde: Siguiente muestra el link y se puede emitir", async ({
        page,
    }) => {
        test.setTimeout(480000);

        await documentarCaso({
            epic: "Auto",
            feature: "Inspección Mercantil Andina",
            story: "Fallo del pedido de inspección",
            severidad: "critical",
            prioridad: "high",
            tickets: ["POL-3182"],
            descripcion:
                `Cotiza un ${VEHICULO.marca} ${VEHICULO.modelo} ${VEHICULO.año}, emite ${COMPANIA} ${NOMBRE_PLAN} ` +
                `y hace fallar con 500 solo el primer POST ${INSPECCION_MERCANTIL_ENDPOINT}. Al tocar Siguiente ` +
                "el pedido se reintenta contra el backend real y debe aparecer el modal \"Ir a la inspección\". " +
                "Completa la inspección digital y espera emisión exitosa con número de emisión.",
            precondiciones:
                "Usuario logueado (storageState del project), datos de usuario mockeados con Mercantil habilitada, " +
                "frontend con el fix de POL-3182 en localhost:3000, backends levantados y Barbara (tst) accesible.",
            parametros: {
                Compañía: COMPANIA,
                Plan: `${NOMBRE_PLAN} (${CODIGO})`,
                Fallo: "error HTTP 500 en el primer pedido",
            },
            tags: ["auto", "mercantil", "inspeccion", "POL-3182"],
        });

        await applyUserMock(page);
        const inspeccion = await fallarPedidoInspeccionMercantil(page, { tipo: "http", veces: 1 });
        const cotizarAutoIA = new CotizarAutoIAPage(page);

        await cotizarYAbrirInspeccion(cotizarAutoIA);

        await test.step("El primer pedido falla y el paso queda bloqueado", async () => {
            await validarPasoBloqueado(cotizarAutoIA);
        });

        await test.step("Siguiente reintenta y muestra el modal de inspección", async () => {
            await cotizarAutoIA.buttons.siguienteBtn.click();
            await expect.poll(() => inspeccion.intentos(), { timeout: 30000 }).toBeGreaterThanOrEqual(2);
            await expect(cotizarAutoIA.emisionInspeccion.btnIrAInspeccion).toBeVisible({ timeout: 60000 });
            await expect(cotizarAutoIA.emisionInspeccion.msgFetchError).toBeHidden();
        });

        await test.step("Completar la inspección digital y avanzar a Solicitud", async () => {
            await cotizarAutoIA.completarPasoInspeccion();
        });

        await test.step("Emitir y validar emisión exitosa", async () => {
            await expect(cotizarAutoIA.emitirFinalBtn).toBeVisible({ timeout: 60000 });
            await cotizarAutoIA.emitirFinalBtn.click();
            await expect(
                cotizarAutoIA.emisionExitosaHeading.or(cotizarAutoIA.emisionFinal.errorEmision),
            ).toBeVisible({ timeout: 240000 });
            await expect(cotizarAutoIA.emisionFinal.errorEmision).not.toBeVisible();
            await cotizarAutoIA.assertNumeroEmision();
        });
    });
});
