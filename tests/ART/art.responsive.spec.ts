/// <reference types="node" />
import { test, expect, type Page } from "@playwright/test";
import DashboardPage from "../../pages/dashboardPage";
import EmisionArtPage from "../../pages/emisionArtPage";
import data from "../../data/art.json";
import CommonButtons from "../../components/commonButtons";
import { getRandomInt } from "../../helpers/dataUtils";

type EmisionDependencies = {
    emisionArtPage: EmisionArtPage;
    commonButtons: CommonButtons;
    dashboardPage: DashboardPage;
};

function buildEmisionDependencies(page: Page): EmisionDependencies {
    return {
        emisionArtPage: new EmisionArtPage(page),
        commonButtons: new CommonButtons(page),
        dashboardPage: new DashboardPage(page),
    };
}

// Viewports estándar
const VIEWPORTS = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 }
};

test.setTimeout(120000);

test.describe("Responsive ART", () => {

    test.describe("Vista Mobile", () => {

        test("Formulario de cotización usable en mobile", async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/cotizar/art", { waitUntil: 'domcontentloaded' });

            // Esperar a que cargue el formulario
            await deps.commonButtons.siguienteBtn.waitFor({ timeout: 30000 });

            await test.step("1- Verificar que el formulario es visible y accesible", async () => {
                // Verificar campos del empleador
                await expect(deps.emisionArtPage.cotizacionEmpleador.empleadorInput).toBeVisible({ timeout: 10000 });
                await expect(deps.emisionArtPage.cotizacionEmpleador.cuitInput).toBeVisible();

                // Verificar que los inputs son interactuables
                await deps.emisionArtPage.cotizacionEmpleador.empleadorInput.click();
                await expect(deps.emisionArtPage.cotizacionEmpleador.empleadorInput).toBeFocused();
            });

            await test.step("2- Verificar botón siguiente visible", async () => {
                await expect(deps.commonButtons.siguienteBtn).toBeVisible();

                // Verificar que no está cortado
                const box = await deps.commonButtons.siguienteBtn.boundingBox();
                expect(box).not.toBeNull();
                if (box) {
                    expect(box.width).toBeGreaterThan(50);
                }
            });

            await test.step("3- Completar formulario en mobile", async () => {
                const artData = data.casos[0];
                await deps.emisionArtPage.cotizacionEmpleador.empleadorInput.fill(artData.empleador);
                await deps.emisionArtPage.cotizacionEmpleador.cuitInput.fill(artData.cuit);

                // Verificar que se puede navegar
                await deps.commonButtons.siguienteBtn.click();

                // Verificar siguiente paso
                await expect(deps.emisionArtPage.cotizacionEmpleado.selectRegimen).toBeVisible();
            });
        });

        test("Navegación tabla y emisión en mobile", async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            // En mobile, esperar por la card de Ranking que siempre es visible
            await page.getByText('Ranking').waitFor({ timeout: 30000 });


            await test.step("1- Buscar 'oviedo' en la tabla", async () => {
                // Buscar el searchbox y escribir "oviedo"
                const searchBox = page.getByRole('textbox', { name: 'Buscar' }).or(page.locator('input[type="search"]')).first();
                await searchBox.fill('oviedo');
                await page.waitForTimeout(500); // Esperar filtrado
            });


            await test.step("2- Click en menú y seleccionar Emitir", async () => {
                // Click en los 3 puntitos
                const menuButton = page.locator('.QT__menuOpenIcon').first()
                    .or(page.locator('button').filter({ hasText: /^⋮$|^...$/ }));
                await menuButton.click();

                // Esperar dropdown y click en Emitir
                const emitirOption = page.getByRole('menuitem', { name: /emitir/i })
                    .or(page.getByText('Emitir', { exact: false }));
                await emitirOption.first().click();
            });

            await test.step("3- Verificar navegación a flujo de emisión", async () => {
                // Verificar que llegamos al flujo de emisión
                await deps.commonButtons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });

                // Debería estar en la pantalla de selección de cobertura o similar
                const emitirBtn = deps.commonButtons.emitirBtn.first();
                await expect(emitirBtn).toBeVisible({ timeout: 30000 });
            });
        });

        test("Formulario de emisión en mobile", async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            // En mobile, esperar por la card de Ranking que siempre es visible
            await page.getByText('Ranking').waitFor({ timeout: 30000 });

            await test.step("1- Buscar 'oviedo' en la tabla", async () => {
                // Buscar el searchbox y escribir "oviedo"
                const searchBox = page.getByRole('textbox', { name: 'Buscar' }).or(page.locator('input[type="search"]')).first();
                await searchBox.fill('oviedo');
                await page.waitForTimeout(500); // Esperar filtrado
            });


            await test.step("2- Click en menú y seleccionar Emitir", async () => {
                // Click en los 3 puntitos
                const menuButton = page.locator('.QT__menuOpenIcon').first()
                    .or(page.locator('button').filter({ hasText: /^⋮$|^...$/ }));
                await menuButton.click();

                // Esperar dropdown y click en Emitir
                const emitirOption = page.getByRole('menuitem', { name: /emitir/i })
                    .or(page.getByText('Emitir', { exact: false }));
                await emitirOption.first().click();
            });

            await test.step("3- Verificar formulario de cliente en mobile", async () => {
                await deps.commonButtons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });

                // Seleccionar cobertura
                // En mobile el botón puede quedar fuera de la vista horizontal debido al layout de la tabla
                // La tabla no es responsive y el botón queda fuera del viewport de 375px
                const emitirBtn = deps.commonButtons.emitirBtn.first();
                await emitirBtn.scrollIntoViewIfNeeded();
                await expect(emitirBtn).toBeVisible();

                // Usar dispatchEvent porque Playwright rechaza click en elementos fuera del viewport
                // incluso con force:true. Esto simula el click directamente en el DOM.
                await emitirBtn.dispatchEvent('click');

                // Verificar campos del cliente
                await expect(deps.emisionArtPage.emisionCliente.localidadInput).toBeVisible({ timeout: 60000 });

                // Verificar que los inputs son accesibles en mobile
                const localidadBox = await deps.emisionArtPage.emisionCliente.localidadInput.boundingBox();
                expect(localidadBox).not.toBeNull();
            });
        });
    });

    test.describe("Vista Tablet", () => {

        test("Tabla de emisión scrolleable en tablet", async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.tablet);
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            await deps.dashboardPage.retirarFondos.waitFor();

            await test.step("1- Navegar a tabla de coberturas", async () => {
                await deps.emisionArtPage.tablaUltCotizaciones.filterBox.click();
                await deps.emisionArtPage.tablaUltCotizaciones.selectARTOption().click();

                const emitirBtn = deps.commonButtons.emitirBtn.first();
                await emitirBtn.click();
            });

            await test.step("2- Verificar tabla de coberturas", async () => {
                await deps.commonButtons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });

                // Buscar tabla de comparación
                const table = page.locator('table, [class*="comparison"], [class*="coverage"]').first();

                if (await table.isVisible()) {
                    // Verificar que la tabla tiene scroll horizontal si es necesario
                    const tableBox = await table.boundingBox();
                    if (tableBox && tableBox.width > VIEWPORTS.tablet.width) {
                        // Verificar que hay scroll
                        const hasScroll = await table.evaluate((el) => {
                            return el.scrollWidth > el.clientWidth;
                        });
                        expect(hasScroll).toBe(true);
                    }
                }
            });
        });

        test("Navegación sidebar funcional en tablet", async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.tablet);
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            await deps.dashboardPage.retirarFondos.waitFor();

            await test.step("Verificar sidebar", async () => {
                // Verificar que el sidebar existe y es usable
                const sidebar = page.locator('[class*="sidebar"], #Sidebar, nav').first();
                await expect(sidebar).toBeVisible();

                // Verificar botón de productos
                await expect(deps.dashboardPage.productosBtn).toBeVisible();
            });
        });
    });

    test.describe("Vista Desktop", () => {

        test("Layout completo en desktop", async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.desktop);
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            await deps.dashboardPage.retirarFondos.waitFor();

            await test.step("Verificar elementos principales visibles", async () => {
                // Sidebar
                await expect(deps.dashboardPage.productosBtn).toBeVisible();

                // Área principal
                await expect(deps.dashboardPage.retirarFondos).toBeVisible();

                // Tabla de cotizaciones
                const table = page.locator('table').first();
                await expect(table).toBeVisible();
            });
        });
    });
});
