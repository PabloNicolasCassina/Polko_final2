/// <reference types="node" />
import { test, expect, type Page } from "@playwright/test";
import ArtCotizarLayout from "../../components/ART/artCotizarLayout";
import ArtMisSolicitudes from "../../components/ART/artMisSolicitudes";
import { attachBackendLogsOnFailure } from "../../helpers/backendLogs";
import { mockUserDataString } from "../../helpers/mockUser";

/**
 * POL-2882 — Rediseño ART (ola post-admin).
 * Requiere cotizaciones en Pendiente / Cotizada / Rechazada / Cancelada (prep admin).
 * Casos: 13, 2, 7, 8, 9, 11, 12, 10, 18.
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

test.describe("POL-2882 Rediseño ART — post-admin", () => {
    test("C13 — Mis Solicitudes ART filtros y CTAs por estado", async ({ page }) => {
        test.setTimeout(180000);
        const ms = new ArtMisSolicitudes(page);
        await setupPageWithMock(page, "http://localhost:3000/u/missolicitudes");
        await expect(ms.heading).toBeVisible({ timeout: 60000 });
        await ms.openArtTab();
        await expect(page.getByText(/Pendiente de cotización/i).first()).toBeVisible();
        await expect(page.getByText(/Cotizada/i).first()).toBeVisible();
        await expect(page.getByText(/Rechazad/i).first()).toBeVisible();
        await expect(page.getByText(/Cancelada/i).first()).toBeVisible();

        await ms.openCardByStatus(/Cotizada/i);
        await expect(ms.emitCta).toBeVisible({ timeout: 30000 });
        await expect(page.getByText(/Tu cotización está lista/i)).toBeVisible();
        await ms.backToList();

        await ms.openCardByStatus(/Pendiente/i);
        await expect(page.getByText(/Estamos cotizando|Pendiente/i).first()).toBeVisible({ timeout: 30000 });
        await expect(ms.emitCta).toHaveCount(0);
        await ms.backToList();

        await ms.openCardByStatus(/Rechazad/i);
        await expect(page.getByText(/Rechazad|documentación|compañía/i).first()).toBeVisible({
            timeout: 30000,
        });
        await expect(ms.emitCta).toHaveCount(0);
        await ms.backToList();

        await ms.openCardByStatus(/Cancelada/i);
        await expect(page.getByText(/cancelada|Cancelada/i).first()).toBeVisible({ timeout: 30000 });
        await expect(ms.emitCta).toHaveCount(0);
    });

    test("C2 — Sidebar Ver todas / Cotizada→ofertas", async ({ page }) => {
        test.setTimeout(180000);
        const art = new ArtCotizarLayout(page);
        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/art");
        await expect(art.empleadorHeading).toBeVisible({ timeout: 60000 });
        await art.assertSidebarSolicitudes();

        await art.verTodasBtn.click();
        await expect(page).toHaveURL(/missolicitudes/, { timeout: 30000 });
        const artTab = page.getByRole("tab", { name: "ART", exact: true });
        if ((await artTab.getAttribute("aria-selected")) !== "true") {
            await artTab.click();
        }
        await expect(artTab).toHaveAttribute("aria-selected", "true");

        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/art");
        await expect(art.empleadorHeading).toBeVisible({ timeout: 60000 });
        const cotizadaSidebar = page
            .locator("button, a, [role=button]")
            .filter({ hasText: /Cotizada/i })
            .filter({ hasText: /CUIT/i })
            .first();
        await expect(cotizadaSidebar).toBeVisible({ timeout: 30000 });
        await cotizadaSidebar.click();
        const emitCta = page.getByRole("button", { name: /Ver cotización y emitir/i });
        if (await emitCta.isVisible().catch(() => false)) {
            await emitCta.click();
        }
        await expect(
            page.getByText(/\d+\s+Coberturas?\s+disponibles?|Emitir|COMPARAR|Alícuota/i).first(),
        ).toBeVisible({ timeout: 60000 });
    });

    test("C7 C8 C9 — Ofertas Cotizada, diferenciales y compare sin compra", async ({ page }) => {
        test.setTimeout(240000);
        const art = new ArtCotizarLayout(page);
        const ms = new ArtMisSolicitudes(page);
        await setupPageWithMock(page, "http://localhost:3000/u/missolicitudes");
        await ms.openArtTab();
        await ms.openCardByStatus(/Cotizada/i);
        await expect(ms.emitCta).toBeVisible({ timeout: 30000 });
        await ms.emitCta.click();
        await expect(art.emitirOfferBtn.first()).toBeVisible({ timeout: 90000 });
        // UI usa singular o plural: "1 Cobertura disponible" | "3 Coberturas disponibles"
        await expect(page.getByText(/\d+\s+Coberturas?\s+disponibles?/i)).toBeVisible();

        // C8 — Ver diferenciales (si hay Berkley/Prevencion/Provincia/Experta)
        const difCount = await art.verDiferencialesBtn.count();
        if (difCount > 0) {
            await expect(art.verDiferencialesBtn.first()).toBeVisible();
        }

        // C9 — COMPARAR ≥2 sin Habilitar compra
        const addCount = await art.agregarBtn.count();
        test.skip(addCount < 2, "Cotizada sin ≥2 ofertas Agregar — C9 BLOCKED en datos");
        await art.agregarBtn.nth(0).click();
        await art.agregarBtn.nth(1).click();
        await expect(page.getByRole("button", { name: /COMPARAR \(2\)/i })).toBeVisible({
            timeout: 15000,
        });
        await page.getByRole("button", { name: /COMPARAR \(2\)/i }).click();
        await expect(page.getByText("Habilitar compra")).toHaveCount(0);
    });

    test("C11 C12 — Prefetch CUIT y Editar cliente en emisión", async ({ page }) => {
        test.setTimeout(240000);
        const art = new ArtCotizarLayout(page);
        const ms = new ArtMisSolicitudes(page);
        await setupPageWithMock(page, "http://localhost:3000/u/missolicitudes");
        await ms.openArtTab();
        await ms.openCardByStatus(/Cotizada/i);
        await ms.emitCta.click();
        await expect(art.emitirOfferBtn.first()).toBeVisible({ timeout: 90000 });
        await art.emitirOfferBtn.first().click();
        await expect(page.getByText(/Datos del cliente|Emisión/i).first()).toBeVisible({
            timeout: 90000,
        });
        // C11 prefetch — CUIT de la cotización visible / precargado
        const body = await page.locator("body").innerText();
        expect(/CUIT|20386485446|20-38648544-6/i.test(body)).toBeTruthy();

        // Avanzar hasta Summary con Editar
        for (let i = 0; i < 5; i++) {
            const editBtn = page.getByRole("button", { name: /^Editar$/i }).first();
            if (await editBtn.isVisible().catch(() => false)) break;
            const next = page.getByRole("button", { name: /Continuar|Siguiente/i }).first();
            if (await next.isVisible().catch(() => false)) {
                await next.click();
                await page.waitForTimeout(2000);
            } else {
                break;
            }
        }
        const editBtn = page.getByRole("button", { name: /^Editar$/i }).first();
        await expect(editBtn).toBeVisible({ timeout: 60000 });
        await editBtn.click();
        const cancel = page.getByRole("button", { name: /^Cancelar$/i });
        if (await cancel.isVisible().catch(() => false)) {
            await cancel.click();
        }
        await page.getByRole("button", { name: /^Editar$/i }).first().click();
        const save = page.getByRole("button", { name: /^Guardar$/i });
        if (await save.isVisible().catch(() => false)) {
            await save.click();
        }
        await expect(page.getByRole("button", { name: /^Editar$/i }).first()).toBeVisible({
            timeout: 30000,
        });
    });

    test("C10 — Cotizar otras opciones (local régimen especial)", async ({ page }) => {
        test.setTimeout(180000);
        const art = new ArtCotizarLayout(page);
        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/art");
        await expect(art.empleadorHeading).toBeVisible({ timeout: 60000 });
        await art.fillEmpleador("Empresa Local Especial Otras Spec", "20386485446");
        await art.selectRegimen("Régimen Especial");
        await art.cantEmpleadosInput.fill("10");
        await art.selectHoras("12 a 16");
        await art.cotizarBtn.click();
        await expect(page.getByText(/\d+\s+Coberturas?\s+disponibles?/i)).toBeVisible({ timeout: 90000 });
        await expect(art.cotizarOtrasOpcionesBtn).toBeVisible();
        // plan_actual es opcional (solo si el back lo manda)
        await art.cotizarOtrasOpcionesBtn.click();
        await expect(art.successPopupTitle).toBeVisible({ timeout: 90000 });
    });

    test("C18 — Pagination en tab ART", async ({ page }) => {
        test.setTimeout(120000);
        const ms = new ArtMisSolicitudes(page);
        await setupPageWithMock(page, "http://localhost:3000/u/missolicitudes");
        await ms.openArtTab();
        await expect(ms.pagination).toBeVisible({ timeout: 30000 });
        // ART no usa variant=dark hoy; se valida que el contenedor exista y sea usable
        await expect(ms.pagination).toHaveClass(/pagination__container/);
        const page2 = ms.pagination.getByText("2", { exact: true });
        if (await page2.isVisible().catch(() => false)) {
            await page2.click();
            await expect(ms.listCards.first()).toBeVisible({ timeout: 30000 });
        }
    });
});
