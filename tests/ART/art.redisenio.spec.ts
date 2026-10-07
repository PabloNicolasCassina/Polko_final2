/// <reference types="node" />
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import ArtCotizarLayout from "../../components/ART/artCotizarLayout";
import { attachBackendLogsOnFailure } from "../../helpers/backendLogs";
import { mockUserDataString } from "../../helpers/mockUser";

/**
 * POL-2882 — Rediseño ART (casos sin admin aprobados Orkest Paso 3).
 * Casos: 1 layout, 3 general popup, 4 especial local, 5 validaciones.
 * C6 organic / C9 compare ≥2: documentados como skip (BLOCKED en Fase 1).
 */
test.describe.configure({ mode: "parallel" });

async function setupPageWithMock(page: Page, targetUrl: string): Promise<void> {
    await page.route("http://localhost:8080/newGetDatosUsuario?es_master=true*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
}

test.afterEach(async ({}, testInfo) => {
    await attachBackendLogsOnFailure(testInfo);
});

test.describe("POL-2882 Rediseño ART — sin admin", () => {
    test("C1 — Layout cotización ART extended", async ({ page }) => {
        test.setTimeout(120000);
        const art = new ArtCotizarLayout(page);
        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/art");
        await expect(art.empleadorHeading).toBeVisible({ timeout: 60000 });
        await art.assertExtendedLayout();
    });

    test("C5 — Validaciones CUIT, requeridos y F.931", async ({ page }) => {
        test.setTimeout(120000);
        const art = new ArtCotizarLayout(page);
        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/art");
        await expect(art.empleadorHeading).toBeVisible({ timeout: 60000 });
        await expect(art.f931Label).toBeVisible();

        await art.siguienteBtn.click();
        await expect(art.empleadorHeading).toBeVisible();
        await expect(page.getByRole("heading", { name: "Datos de los empleados" })).toHaveCount(0);

        await art.empleadorInput.fill("Empresa Validacion QA");
        await art.cuitInput.fill("12345");
        await art.siguienteBtn.click();
        await expect(page.getByText(/El CUIT ingresado no es válido/i)).toBeVisible({ timeout: 15000 });
        await expect(art.empleadorHeading).toBeVisible();

        await art.cuitInput.fill("20386485446");
        await art.siguienteBtn.click();
        await expect(page.getByRole("heading", { name: "Datos de los empleados" })).toBeVisible({
            timeout: 30000,
        });
        await expect(art.regimenSelect).toBeVisible();
    });

    test("C3 — Cotizar régimen general → popup → Mis Solicitudes ART", async ({ page }) => {
        test.setTimeout(180000);
        const art = new ArtCotizarLayout(page);
        const empleador = `Empresa Test QA General ${Date.now()}`;
        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/art");
        await expect(art.empleadorHeading).toBeVisible({ timeout: 60000 });
        await art.fillEmpleador(empleador, "20386485446");
        await art.selectRegimen("Régimen General");
        await art.cantEmpleadosInput.fill("25");
        await art.masaSalarialInput.fill("5000000");
        await art.cotizarBtn.click();
        await expect(art.successPopupTitle).toBeVisible({ timeout: 90000 });
        await expect(page.getByText(/Recibimos tu pedido de cotización/i)).toBeVisible();
        await art.verMisSolicitudesBtn.click();
        await expect(page).toHaveURL(/missolicitudes/, { timeout: 30000 });
        await expect(page.getByRole("tab", { name: "ART" })).toBeVisible({ timeout: 30000 });
        await expect(page.getByRole("tab", { name: "ART" })).toHaveAttribute("aria-selected", "true");
        await expect(page.getByText(empleador).first()).toBeVisible({ timeout: 30000 });
        await expect(page.getByText(/Pendiente de cotización/i).first()).toBeVisible();
    });

    test("C4 — Cotizar régimen especial → ofertas locales", async ({ page }) => {
        test.setTimeout(180000);
        const art = new ArtCotizarLayout(page);
        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/art");
        await expect(art.empleadorHeading).toBeVisible({ timeout: 60000 });
        await art.fillEmpleador("Empresa Test Especial", "20386485446");
        await art.selectRegimen("Régimen Especial");
        await art.cantEmpleadosInput.fill("10");
        await art.horasSelect.click();
        await page.getByRole("option", { name: "12 a 16", exact: true }).click();
        await art.cotizarBtn.click();
        await expect(page.getByText(/\d+\s+Coberturas?\s+disponibles?/i)).toBeVisible({
            timeout: 90000,
        });
        await expect(page.getByRole("button", { name: /^Emitir$/i }).first()).toBeVisible();
        await expect(page.getByRole("button", { name: /Cotizar otras opciones/i })).toBeVisible();
        await expect(art.compararSticky).toBeVisible();
        await expect(page.getByText("Habilitar compra")).toHaveCount(0);
    });

    test.skip("C6 — Usuario orgánico cotizar ART bloqueado", async ({ page }, testInfo: TestInfo) => {
        testInfo.annotations.push({
            type: "blocked",
            description: "userOrganic.json expirado en Fase 1 (Auth0). Regenerar auth organic.",
        });
        await page.goto("http://localhost:3000/u/cotizar/art");
    });

    test.skip("C9 — CoverageComparison ART sin Habilitar compra (≥2 ofertas)", async ({ page }, testInfo: TestInfo) => {
        testInfo.annotations.push({
            type: "note",
            description:
                "Cubierto en art.redisenioPostAdmin.spec.ts (ola post-admin con Cotizada ≥2 ofertas). Skip legado de ola sin admin.",
        });
        await page.goto("http://localhost:3000/u/cotizar/art");
    });
});
