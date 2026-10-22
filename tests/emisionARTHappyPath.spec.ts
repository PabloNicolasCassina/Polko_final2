import { test, expect, type Page, type Response, type TestInfo } from "@playwright/test";
import ArtCotizarLayout from "../components/ART/artCotizarLayout";
import ArtMisSolicitudes from "../components/ART/artMisSolicitudes";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import { guardarOpfPendiente } from "../helpers/opfMocks";

/**
 * Happy path de emisión ART. Como OPF, el flujo cruza Polko → admin → Polko.
 *
 * Régimen General (operaciones cotiza a mano):
 *   1. Polko: se cotiza y la solicitud queda "Pendiente de cotización" en Mis Solicitudes → ART.
 *   2. Admin: operaciones cotiza la solicitud (pendiente de automatizar).
 *   3. Polko: "Ver cotización y emitir" → emisión (pendiente de automatizar).
 *
 * Régimen Especial (casas particulares, oferta local con costo fijo):
 *   1. Polko: cotiza, emite la oferta y la solicitud queda en gestión (CNO / SPD) en Mis Solicitudes → ART.
 *   2. Admin: avanza los pasos del trámite hasta emitida (pendiente de automatizar).
 *
 * Régimen Especial con "Cotizar otras opciones": en vez de emitir la oferta local se pide a operaciones
 * que cotice otras compañías; sigue el mismo camino que régimen general.
 *
 * La fase Polko deja el ID en `.opf-pendientes/ART_<régimen>_<project>.json` para la fase admin.
 *   npx playwright test tests/emisionARTHappyPath.spec.ts --project=chromium
 */

const CUIT_EMPLEADOR = "20386485446";

const COTIZACION_GENERAL = {
    regimen: "Régimen General" as const,
    cantEmpleados: "25",
    masaSalarial: "5000000",
};

const COTIZACION_ESPECIAL = {
    regimen: "Régimen Especial" as const,
    cantEmpleados: "2",
    horasSemanales: "12 a 16",
};

const ESTADOS_EN_GESTION = /Pendiente CNO|CNO en revisión|Pendiente e-servicios|Pendiente SPD|Pendiente de emisión|En gestión/i;

const ART_COTIZACION_PATH = "/cotizacion/art";
const ART_EMISION_PATH = "/emision/art";

function isArtPost(path: string) {
    return (response: Response): boolean =>
        response.request().method() === "POST" && new URL(response.url()).pathname.endsWith(path);
}

async function applyUserMock(page: Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

async function adjuntarIntercambio(testInfo: TestInfo, nombre: string, response: Response): Promise<any> {
    const body = await response.json().catch(() => null);
    await testInfo.attach(`${nombre}-request.json`, {
        body: JSON.stringify(response.request().postDataJSON(), null, 2),
        contentType: "application/json",
    });
    await testInfo.attach(`${nombre}-response.json`, {
        body: JSON.stringify(body, null, 2),
        contentType: "application/json",
    });
    return body;
}

/**
 * Tramo común a régimen general y "Cotizar otras opciones": `accion` dispara el POST de cotización,
 * después popup "Solicitud enviada" → Mis Solicitudes → ART con la solicitud "Pendiente de cotización".
 * Devuelve el `idCotizar`.
 */
async function solicitarCotizacionAOperaciones(
    page: Page,
    testInfo: TestInfo,
    empleador: string,
    accion: { titulo: string; ejecutar: () => Promise<void> },
): Promise<string> {
    const art = new ArtCotizarLayout(page);
    const misSolicitudes = new ArtMisSolicitudes(page);
    const cotizacionResponsePromise = page.waitForResponse(isArtPost(ART_COTIZACION_PATH), { timeout: 90000 });

    await test.step(accion.titulo, accion.ejecutar);

    const cotizacionResponse = await cotizacionResponsePromise;
    const cotizacionPayload = cotizacionResponse.request().postDataJSON();
    const cotizacionResult = await adjuntarIntercambio(testInfo, "art-cotizacion", cotizacionResponse);
    const cotizacionId = String(cotizacionResult?.idCotizar ?? "");

    await test.step("Validar la solicitud de cotización creada", async () => {
        expect(cotizacionResponse.ok(), `POST ${ART_COTIZACION_PATH} respondió ${cotizacionResponse.status()}`).toBe(true);
        expect(cotizacionPayload?.empleador).toBe(empleador);
        expect(String(cotizacionPayload?.cuit)).toBe(CUIT_EMPLEADOR);
        expect(cotizacionId, "la cotización no devolvió idCotizar").toBeTruthy();
    });

    await test.step('Popup "Solicitud enviada"', async () => {
        await expect(art.successPopupTitle).toBeVisible({ timeout: 90000 });
        await expect(page.getByText(/Recibimos tu pedido de cotización/i)).toBeVisible();
    });

    await test.step('"Ver mis solicitudes" abre Mis Solicitudes en la tab ART', async () => {
        await art.verMisSolicitudesBtn.click();
        await expect(page).toHaveURL(/missolicitudes/, { timeout: 30000 });
        await expect(misSolicitudes.tabArt).toHaveAttribute("aria-selected", "true", { timeout: 30000 });
    });

    await test.step(`La solicitud de "${empleador}" figura "Pendiente de cotización"`, async () => {
        const card = misSolicitudes.listCards.filter({ hasText: empleador }).first();
        await expect(card).toBeVisible({ timeout: 60000 });
        await expect(card).toContainText(/Pendiente de cotización/i);
    });

    return cotizacionId;
}

function guardarPendienteAdmin(testInfo: TestInfo, regimen: string, id: string, empleador: string): void {
    const clave = `ART_${regimen}_${testInfo.project.name}`.replace(/\W+/g, "-");
    guardarOpfPendiente(clave, { estado: "creada", compania: "ART", id, cobertura: empleador });
    console.log(`📝 ART ${regimen}: ${id} (${empleador}) listo para admin`);
    testInfo.annotations.push({ type: `ART ${regimen} para admin`, description: `${empleador} · ${id}` });
}

test.describe("ART - Happy path de emisión @regression", () => {
    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    test("Régimen general: cotizar y dejar la solicitud pendiente de cotización en Mis Solicitudes", async ({
        page,
    }, testInfo) => {
        test.setTimeout(180000);
        const empleador = `QA ART General ${Date.now()}`;

        await documentarCaso({
            epic: "ART",
            feature: "Happy path de emisión",
            story: "Régimen general — fase Polko: solicitud de cotización",
            severidad: "critical",
            prioridad: "high",
            descripcion:
                `Cotiza ART en ${COTIZACION_GENERAL.regimen} para el empleador "${empleador}" (CUIT ${CUIT_EMPLEADOR}) ` +
                `con ${COTIZACION_GENERAL.cantEmpleados} empleados y masa salarial ${COTIZACION_GENERAL.masaSalarial}. ` +
                'Espera el popup "Solicitud enviada", que "Ver mis solicitudes" abra Mis Solicitudes en la tab ART ' +
                'y que la solicitud figure como "Pendiente de cotización" a la espera de operaciones.',
            precondiciones:
                "Usuario logueado (storageState del project), datos de usuario mockeados con ART habilitado, " +
                "frontend en localhost:3000, general_api y quotation microservice (:8082) levantados.",
            parametros: {
                Empleador: empleador,
                CUIT: CUIT_EMPLEADOR,
                Régimen: COTIZACION_GENERAL.regimen,
                Empleados: COTIZACION_GENERAL.cantEmpleados,
                "Masa salarial": COTIZACION_GENERAL.masaSalarial,
            },
            tags: ["art", "happy-path", "regression"],
        });

        await applyUserMock(page);
        const art = new ArtCotizarLayout(page);

        await test.step("Ingresar al cotizador de ART", async () => {
            await art.gotoCotizar();
        });

        await test.step(`Completar datos del empleador (${empleador} / CUIT ${CUIT_EMPLEADOR})`, async () => {
            await art.fillEmpleador(empleador, CUIT_EMPLEADOR);
        });

        await test.step(`Completar datos de los empleados (${COTIZACION_GENERAL.regimen})`, async () => {
            await art.selectRegimen(COTIZACION_GENERAL.regimen);
            await art.cantEmpleadosInput.fill(COTIZACION_GENERAL.cantEmpleados);
            await art.masaSalarialInput.fill(COTIZACION_GENERAL.masaSalarial);
        });

        const cotizacionId = await solicitarCotizacionAOperaciones(page, testInfo, empleador, {
            titulo: "Cotizar",
            ejecutar: () => art.cotizarBtn.click(),
        });

        guardarPendienteAdmin(testInfo, "General", cotizacionId, empleador);
    });

    test('Régimen especial: "Cotizar otras opciones" deja la solicitud pendiente de cotización en Mis Solicitudes', async ({
        page,
    }, testInfo) => {
        test.setTimeout(180000);
        const empleador = `QA ART Especial Otras ${Date.now()}`;

        await documentarCaso({
            epic: "ART",
            feature: "Happy path de emisión",
            story: "Régimen especial con otras compañías — fase Polko: solicitud de cotización",
            severidad: "critical",
            prioridad: "high",
            descripcion:
                `Cotiza ART en ${COTIZACION_ESPECIAL.regimen} para el empleador "${empleador}" (CUIT ${CUIT_EMPLEADOR}) ` +
                `con ${COTIZACION_ESPECIAL.cantEmpleados} empleados de ${COTIZACION_ESPECIAL.horasSemanales} horas semanales. ` +
                'En lugar de emitir la oferta local, pide "Cotizar otras opciones": espera el popup "Solicitud enviada" ' +
                'y la solicitud "Pendiente de cotización" en Mis Solicitudes → ART, a la espera de que operaciones cotice otras compañías.',
            precondiciones:
                "Usuario logueado (storageState del project), datos de usuario mockeados con ART habilitado, " +
                "frontend en localhost:3000, general_api y quotation microservice (:8082) levantados.",
            parametros: {
                Empleador: empleador,
                CUIT: CUIT_EMPLEADOR,
                Régimen: COTIZACION_ESPECIAL.regimen,
                Empleados: COTIZACION_ESPECIAL.cantEmpleados,
                "Horas semanales": COTIZACION_ESPECIAL.horasSemanales,
            },
            tags: ["art", "happy-path", "regression"],
        });

        await applyUserMock(page);
        const art = new ArtCotizarLayout(page);

        await test.step("Ingresar al cotizador de ART", async () => {
            await art.gotoCotizar();
        });

        await test.step(`Completar datos del empleador (${empleador} / CUIT ${CUIT_EMPLEADOR})`, async () => {
            await art.fillEmpleador(empleador, CUIT_EMPLEADOR);
        });

        await test.step(`Completar datos de los empleados (${COTIZACION_ESPECIAL.regimen})`, async () => {
            await art.selectRegimen(COTIZACION_ESPECIAL.regimen);
            await art.cantEmpleadosInput.fill(COTIZACION_ESPECIAL.cantEmpleados);
            await art.selectHoras(COTIZACION_ESPECIAL.horasSemanales);
        });

        await test.step("Cotizar y ver la oferta local", async () => {
            await art.cotizarBtn.click();
            await expect(art.coberturasDisponiblesText).toBeVisible({ timeout: 90000 });
            await expect(art.cotizarOtrasOpcionesBtn).toBeVisible();
        });

        const cotizacionId = await solicitarCotizacionAOperaciones(page, testInfo, empleador, {
            titulo: '"Cotizar otras opciones"',
            ejecutar: () => art.cotizarOtrasOpcionesBtn.click(),
        });

        guardarPendienteAdmin(testInfo, "EspecialOtras", cotizacionId, empleador);
    });

    test("Régimen especial: cotizar, emitir la oferta y dejar la solicitud en gestión en Mis Solicitudes", async ({
        page,
    }, testInfo) => {
        test.setTimeout(240000);
        const empleador = `QA ART Especial ${Date.now()}`;

        await documentarCaso({
            epic: "ART",
            feature: "Happy path de emisión",
            story: "Régimen especial — fase Polko: emisión",
            severidad: "critical",
            prioridad: "high",
            descripcion:
                `Cotiza ART en ${COTIZACION_ESPECIAL.regimen} para el empleador "${empleador}" (CUIT ${CUIT_EMPLEADOR}) ` +
                `con ${COTIZACION_ESPECIAL.cantEmpleados} empleados de ${COTIZACION_ESPECIAL.horasSemanales} horas semanales. ` +
                'Emite la oferta local con el cliente precargado desde el CUIT, confirma en el resumen y espera el popup ' +
                '"¡Solicitud enviada!" con el ID de emisión. "Ir a Mis Solicitudes" abre la tab ART con la solicitud en gestión.',
            precondiciones:
                "Usuario logueado (storageState del project), datos de usuario mockeados con ART habilitado, " +
                "frontend en localhost:3000, general_api y quotation microservice (:8082) levantados.",
            parametros: {
                Empleador: empleador,
                CUIT: CUIT_EMPLEADOR,
                Régimen: COTIZACION_ESPECIAL.regimen,
                Empleados: COTIZACION_ESPECIAL.cantEmpleados,
                "Horas semanales": COTIZACION_ESPECIAL.horasSemanales,
            },
            tags: ["art", "happy-path", "regression"],
        });

        await applyUserMock(page);
        const art = new ArtCotizarLayout(page);
        const misSolicitudes = new ArtMisSolicitudes(page);

        await test.step("Ingresar al cotizador de ART", async () => {
            await art.gotoCotizar();
        });

        await test.step(`Completar datos del empleador (${empleador} / CUIT ${CUIT_EMPLEADOR})`, async () => {
            await art.fillEmpleador(empleador, CUIT_EMPLEADOR);
        });

        await test.step(`Completar datos de los empleados (${COTIZACION_ESPECIAL.regimen})`, async () => {
            await art.selectRegimen(COTIZACION_ESPECIAL.regimen);
            await art.cantEmpleadosInput.fill(COTIZACION_ESPECIAL.cantEmpleados);
            await art.selectHoras(COTIZACION_ESPECIAL.horasSemanales);
        });

        await test.step("Cotizar y ver la oferta local", async () => {
            await art.cotizarBtn.click();
            await expect(art.coberturasDisponiblesText).toBeVisible({ timeout: 90000 });
            await expect(art.emitirOfferBtn.first()).toBeVisible();
        });

        await test.step("Emitir la oferta: el cliente viene precargado desde el CUIT", async () => {
            await art.emitirOfferBtn.first().click();
            await expect(art.clienteHeading).toBeVisible({ timeout: 60000 });
            await expect(page.locator(`input[value='${CUIT_EMPLEADOR}']`).first()).toBeVisible({ timeout: 30000 });
            await art.siguienteBtn.click();
        });

        const cotizacionResponsePromise = page.waitForResponse(isArtPost(ART_COTIZACION_PATH), { timeout: 120000 });
        const emisionResponsePromise = page.waitForResponse(isArtPost(ART_EMISION_PATH), { timeout: 120000 });

        await test.step("Confirmar en el resumen y emitir", async () => {
            await expect(art.resumenHeading).toBeVisible({ timeout: 60000 });
            await art.emitirResumenBtn.click();
        });

        const cotizacionResponse = await cotizacionResponsePromise;
        const cotizacionResult = await adjuntarIntercambio(testInfo, "art-cotizacion", cotizacionResponse);
        const emisionResponse = await emisionResponsePromise;
        const emisionResult = await adjuntarIntercambio(testInfo, "art-emision", emisionResponse);
        const idEmision = String(emisionResult?.idEmision ?? emisionResult?.id_emision ?? "");

        await test.step("Validar cotización y emisión creadas", async () => {
            expect(cotizacionResponse.ok(), `POST ${ART_COTIZACION_PATH} respondió ${cotizacionResponse.status()}`).toBe(true);
            expect(cotizacionResult?.idCotizar, "la cotización no devolvió idCotizar").toBeTruthy();
            expect(emisionResponse.ok(), `POST ${ART_EMISION_PATH} respondió ${emisionResponse.status()}`).toBe(true);
            expect(idEmision, "la emisión no devolvió idEmision").toBeTruthy();
        });

        await test.step('Popup "¡Solicitud enviada!" con el ID de emisión', async () => {
            await expect(art.emisionErrorText).toBeHidden();
            await expect(art.emisionSuccessTitle).toBeVisible({ timeout: 60000 });
            await expect(page.getByText(idEmision)).toBeVisible();
        });

        await test.step('"Ir a Mis Solicitudes" abre la tab ART', async () => {
            await art.irAMisSolicitudesBtn.click();
            await expect(page).toHaveURL(/missolicitudes/, { timeout: 30000 });
            await expect(misSolicitudes.tabArt).toHaveAttribute("aria-selected", "true", { timeout: 30000 });
        });

        await test.step(`La solicitud de "${empleador}" figura en gestión`, async () => {
            const card = misSolicitudes.listCards.filter({ hasText: empleador }).filter({ hasText: ESTADOS_EN_GESTION });
            await expect(card.first()).toBeVisible({ timeout: 60000 });
        });

        guardarPendienteAdmin(testInfo, "Especial", idEmision, empleador);
    });
});
