import { test, expect, type Page, type Response } from "@playwright/test";
import ArtCotizarLayout from "../components/ART/artCotizarLayout";
import ArtMisSolicitudes from "../components/ART/artMisSolicitudes";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import { guardarOpfPendiente } from "../helpers/opfMocks";

/**
 * Happy path de emisión ART (régimen general). Como OPF, el flujo cruza Polko → admin → Polko:
 *   1. Polko: se cotiza ART y la solicitud queda "Pendiente de cotización" en Mis Solicitudes → ART.
 *   2. Admin: operaciones cotiza la solicitud (pendiente de automatizar).
 *   3. Polko: "Ver cotización y emitir" → emisión (pendiente de automatizar).
 *
 * La fase 1 deja el ID de la cotización en `.opf-pendientes/ART_<project>.json` para la fase admin.
 *   npx playwright test tests/emisionARTHappyPath.spec.ts --project=chromium
 */

const CUIT_EMPLEADOR = "20386485446";

const COTIZACION_GENERAL = {
    regimen: "Régimen General" as const,
    cantEmpleados: "25",
    masaSalarial: "5000000",
};

const ART_COTIZACION_PATH = "/cotizacion/art";

function isArtCotizacionCreateResponse(response: Response): boolean {
    return (
        response.request().method() === "POST"
        && new URL(response.url()).pathname.endsWith(ART_COTIZACION_PATH)
    );
}

async function applyUserMock(page: Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

test.describe("ART - Happy path de emisión @regression", () => {
    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    test("Régimen general: cotizar y dejar la solicitud pendiente de cotización en Mis Solicitudes", async ({
        page,
    }, testInfo) => {
        test.setTimeout(180000);
        const empleador = `QA ART Happy Path ${Date.now()}`;

        await documentarCaso({
            epic: "ART",
            feature: "Happy path de emisión",
            story: "Fase Polko: solicitud de cotización",
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
        const misSolicitudes = new ArtMisSolicitudes(page);

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

        const cotizacionResponsePromise = page.waitForResponse(isArtCotizacionCreateResponse, { timeout: 90000 });

        await test.step("Cotizar", async () => {
            await art.cotizarBtn.click();
        });

        const cotizacionResponse = await cotizacionResponsePromise;
        const cotizacionPayload = cotizacionResponse.request().postDataJSON();
        const cotizacionResult = await cotizacionResponse.json().catch(() => null);
        const cotizacionId = String(cotizacionResult?._id ?? cotizacionResult?.id ?? "");

        await testInfo.attach("art-cotizacion-request.json", {
            body: JSON.stringify(cotizacionPayload, null, 2),
            contentType: "application/json",
        });
        await testInfo.attach("art-cotizacion-response.json", {
            body: JSON.stringify(cotizacionResult, null, 2),
            contentType: "application/json",
        });

        await test.step("Validar la solicitud de cotización creada", async () => {
            expect(cotizacionResponse.ok(), `POST ${ART_COTIZACION_PATH} respondió ${cotizacionResponse.status()}`).toBe(true);
            expect(cotizacionPayload?.empleador).toBe(empleador);
            expect(String(cotizacionPayload?.cuit)).toBe(CUIT_EMPLEADOR);
            expect(cotizacionId, "la cotización no devolvió ID").toBeTruthy();
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

        const clave = `ART_${testInfo.project.name.replace(/\W+/g, "-")}`;
        guardarOpfPendiente(clave, { estado: "creada", compania: "ART", id: cotizacionId, cobertura: empleador });
        console.log(`📝 ART: cotización ${cotizacionId} (${empleador}) lista para cotizar en admin`);
        testInfo.annotations.push({ type: "ART a cotizar en admin", description: `${empleador} · ${cotizacionId}` });
    });
});
