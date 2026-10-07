/// <reference types="node" />
/**
 * POL-2951 — FedPat: confirmación de premio actualizado (PriceUpdated) en emisión auto.
 *
 * Orkest Paso 3c / Fase 2 — mapeo casos:
 *   C01 (worker PASS, no relanzar): emisión OK sin modal cuando premio coincide
 *       → test "C01/C04: premio igual (mock éxito) no muestra modal"
 *   C02 (BLOCKED tarifa → recuperado con mock): Continuar + confirmaPrecioActualizado
 *   C03 (BLOCKED tarifa → recuperado con mock): Volver a la cotización
 *   C05 (BLOCKED tarifa → recuperado con mock): modal PriceUpdated visible (títulos/CTAs)
 *
 * Mock usuario: mocks/mockUserDataATM.json (via mockUserDataString).
 * Cotiza FedPat real; corta /newemitir con fulfill (PriceUpdated vs éxito).
 */
import { test, expect, type Page } from "@playwright/test";
import EmisionAutoPage from "../pages/emisionAutoPage";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTabla from "../components/auto/cotizacionTabla";
import EmissionPriceUpdated from "../components/emissionPriceUpdated";
import data from "../data/autos.json";
import { companyBillingConfigs } from "../data/tiposFacturacion";
import { buildAutoTestData } from "../helpers/testDataBuilder";
import { mockUserDataString } from "../helpers/mockUser";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({}, testInfo) => {
    await attachBackendLogsOnFailure(testInfo);
});

const PRICE_UPDATED_BODY = {
    estado: "PriceUpdated",
    status: "PriceUpdated",
    code: "PRICE_UPDATED",
    message: "Se actualizo el precio",
    requiereConfirmacionPrecio: true,
    company: "Federacion_Patronal",
    idCobertura: "CF",
    nombreCobertura: "CF",
    premio: 78523,
    premioAnterior: 79314,
    cotizacionActualizada: {
        numero_cotizacion: "pol2951-mock",
        premio: 78523,
        sumaAseguradaVehiculo: 15000000,
    },
    status_code: 200,
};

const EMISSION_SUCCESS_BODY = {
    status_code: 200,
    estado: "Emitida",
    status: "Emitida",
    id_emision: "pol2951-mock-emision",
    identificadores: [
        { key: "poliza", nombre: "Número de póliza", valor: "999001" },
        { key: "tramite", nombre: "Número de trámite", valor: "888001" },
    ],
    documentacion: ["POLIZA"],
};

const logan2022 = data.autos.find(
    (a: any) =>
        a.marca === "RENAULT" &&
        a.modelo === "LOGAN" &&
        a.año === "2022" &&
        !a.testType &&
        a.tipoPersona === "Física" &&
        a.sitImpositiva === "Consumidor final"
)!;

function buildFedPatDatos() {
    const billing =
        companyBillingConfigs.federacion_patronal?.find((c: any) => c.type === "Mensual") ?? {
            type: "Mensual",
            validPaymentCombinations: [{ primary: "Efectivo" }],
            validInstallments: ["1"],
        };
    const efectivo =
        billing.validPaymentCombinations.find((c: any) => c.primary === "Efectivo") ??
        billing.validPaymentCombinations[0];
    return buildAutoTestData({
        autoBase: { ...logan2022 },
        compania: "federacion_patronal",
        tieneGNC: false,
        billingConfig: billing,
        paymentCombo: efectivo,
        installment: "1",
        tieneConfigAvanzada: false,
        descuento: 0,
    });
}

async function setupPageWithMock(page: Page, targetUrl: string): Promise<void> {
    // mockUserDataString ← mocks/mockUserDataATM.json
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
}

async function selectOnlyFedPat(page: Page, companias: Companias, cotizacionTabla: CotizacionTabla, buttons: CommonButtons) {
    const tiles = page.locator("button.QuotationSidebar__companyTile");
    const n = await tiles.count();
    if (n > 0) {
        for (let i = 0; i < n; i++) {
            const tile = tiles.nth(i);
            const text = ((await tile.innerText()) || "").trim();
            const active = ((await tile.getAttribute("class")) || "").includes("is-active");
            if (/Federaci/i.test(text)) {
                if (!active) await tile.click({ force: true });
            } else if (active) {
                await tile.click({ force: true });
            }
        }
        return;
    }
    if (!(await cotizacionTabla.companyTile("Federación").isVisible().catch(() => false))) {
        await companias.getCompaniaLogo("federacion_patronal").click();
        if (await buttons.aceptarSelector.isVisible().catch(() => false)) {
            await buttons.aceptarSelector.click();
        }
    }
}

async function cotizarYAbrirEmisionFedPat(page: Page) {
    const emision = new EmisionAutoPage(page);
    const cotizacionTabla = new CotizacionTabla(page);
    const buttons = new CommonButtons(page);
    const companias = new Companias(page);
    const datos = buildFedPatDatos();

    await setupPageWithMock(page, "http://localhost:3000/u/cotizar/automotor");
    await selectOnlyFedPat(page, companias, cotizacionTabla, buttons);
    await emision.seleccionarAuto(datos, "federacion_patronal");
    await emision.seleccionarPersona(datos);
    await expect(page.getByText("Suma asegurada:", { exact: true })).toBeVisible({ timeout: 180000 });
    await emision.tablaCotizacion(datos, "federacion_patronal");
    // Worker LOCATORS: #emitirButton_CF / button.QuotationSidebar__companyTile Federación
    await cotizacionTabla.clickEmitirHandlingDirtyModal("federacion_patronal");
    return { emision, buttons, datos };
}

async function completarEmisionHastaClickEmitir(page: Page, emision: EmisionAutoPage, datos: any) {
    // Worker LOCATORS: [id="select_infoDePago.formaDePago"], DNI/CUIT textbox,
    // patente/motor/chasis, inspección file+etiquetas, getByRole Emitir
    await emision.emitirFormaPago(datos);
    await emision.emitirCliente(datos);
    await emision.emitirDetalleAuto(datos);
    await emision.emitirInspeccion(datos);
    await expect(emision.buttons.emitirBtn).toBeEnabled({ timeout: 180000 });
    await emision.buttons.emitirBtn.click();
}

type NewemitirCapture = { bodies: any[]; dispose: () => void };

function mockNewemitir(
    page: Page,
    mode: "priceUpdated" | "success" | "confirmThenSuccess"
): NewemitirCapture {
    const bodies: any[] = [];
    const handler = async (route: any) => {
        const req = route.request();
        if (req.method() !== "POST") {
            await route.continue();
            return;
        }
        let body: any = {};
        try {
            body = req.postDataJSON() ?? {};
        } catch {
            body = {};
        }
        bodies.push(body);
        if (mode === "success") {
            await route.fulfill({ contentType: "application/json", body: JSON.stringify(EMISSION_SUCCESS_BODY) });
            return;
        }
        if (mode === "confirmThenSuccess" && body.confirmaPrecioActualizado === true) {
            await route.fulfill({ contentType: "application/json", body: JSON.stringify(EMISSION_SUCCESS_BODY) });
            return;
        }
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(PRICE_UPDATED_BODY) });
    };
    page.route("**/newemitir*", handler);
    return { bodies, dispose: () => page.unroute("**/newemitir*") };
}

test.describe("POL-2951 FedPat PriceUpdated", () => {
    test("C05: modal PriceUpdated al emitir (mock /newemitir)", async ({ page }, testInfo) => {
        test.setTimeout(420000);
        testInfo.annotations.push({ type: "ticket", description: "POL-2951" });
        const capture = mockNewemitir(page, "priceUpdated");
        const modal = new EmissionPriceUpdated(page);

        const { emision, datos } = await cotizarYAbrirEmisionFedPat(page);
        await completarEmisionHastaClickEmitir(page, emision, datos);

        await expect(modal.root).toBeVisible({ timeout: 60000 });
        await expect(modal.anyTitle).toBeVisible();
        await expect(modal.confirmBtn).toBeVisible();
        await expect(modal.backToQuotationBtn).toBeVisible();
        await expect(modal.previousPremioLabel).toBeVisible();
        await expect(modal.updatedPremioLabel).toBeVisible();
        const modalShot = testInfo.outputPath("POL-2951-modal-price-updated.png");
        await page.screenshot({ path: modalShot });
        await testInfo.attach("modal-price-updated", { path: modalShot, contentType: "image/png" });
        await expect(page.getByText("¡Póliza emitida con éxito!", { exact: true })).toHaveCount(0);
        expect(capture.bodies.length).toBeGreaterThan(0);
        expect(capture.bodies[0].confirmaPrecioActualizado).toBeUndefined();
        capture.dispose();
    });

    test("C02: Continuar reintenta /newemitir con confirmaPrecioActualizado", async ({ page }, testInfo) => {
        test.setTimeout(420000);
        testInfo.annotations.push({ type: "ticket", description: "POL-2951" });
        const capture = mockNewemitir(page, "confirmThenSuccess");
        const modal = new EmissionPriceUpdated(page);

        const { emision, datos } = await cotizarYAbrirEmisionFedPat(page);
        await completarEmisionHastaClickEmitir(page, emision, datos);

        await expect(modal.confirmBtn).toBeVisible({ timeout: 60000 });
        await modal.confirmBtn.click();
        await expect(page.getByText("¡Póliza emitida con éxito!", { exact: true })).toBeVisible({ timeout: 60000 });
        expect(capture.bodies.length).toBeGreaterThanOrEqual(2);
        expect(capture.bodies[0].confirmaPrecioActualizado).toBeUndefined();
        expect(capture.bodies[capture.bodies.length - 1].confirmaPrecioActualizado).toBe(true);
        capture.dispose();
    });

    test("C03/C04: Volver a la cotización cierra el modal", async ({ page }, testInfo) => {
        test.setTimeout(420000);
        testInfo.annotations.push({ type: "ticket", description: "POL-2951" });
        const capture = mockNewemitir(page, "priceUpdated");
        const modal = new EmissionPriceUpdated(page);

        const { emision, datos } = await cotizarYAbrirEmisionFedPat(page);
        await completarEmisionHastaClickEmitir(page, emision, datos);

        await expect(modal.backToQuotationBtn).toBeVisible({ timeout: 60000 });
        await modal.backToQuotationBtn.click();
        await expect(modal.root).toHaveCount(0);
        await expect(page.getByText("Suma asegurada:", { exact: true })).toBeVisible({ timeout: 30000 });
        await expect(page.getByText("¡Póliza emitida con éxito!", { exact: true })).toHaveCount(0);
        capture.dispose();
    });

    test("C01: premio igual (mock éxito) no muestra modal", async ({ page }, testInfo) => {
        test.setTimeout(420000);
        testInfo.annotations.push({ type: "ticket", description: "POL-2951" });
        const capture = mockNewemitir(page, "success");
        const modal = new EmissionPriceUpdated(page);

        const { emision, datos } = await cotizarYAbrirEmisionFedPat(page);
        await completarEmisionHastaClickEmitir(page, emision, datos);

        await expect(page.getByText("¡Póliza emitida con éxito!", { exact: true })).toBeVisible({ timeout: 60000 });
        await expect(modal.root).toHaveCount(0);
        await expect(modal.confirmBtn).toHaveCount(0);
        expect(capture.bodies[0]?.confirmaPrecioActualizado).toBeUndefined();
        capture.dispose();
    });
});