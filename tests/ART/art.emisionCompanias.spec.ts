/// <reference types="node" />
/// <reference lib="dom" />
import { test, expect, type Page } from "@playwright/test";
import DashboardPage from "../../pages/dashboardPage";
import EmisionArtPage from "../../pages/emisionArtPage";
import data from "../../data/art.json";
import CommonButtons from "../../components/commonButtons";
import { CompanyKey, COMPANY_NAMES } from "../../components/ART/tablaEmision";
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

test.setTimeout(180000);

test.describe("Emisión ART por Compañía", () => {

    test.describe.parallel("Emisión individual por compañía", () => {
        for (const compania of COMPANY_NAMES) {
            test(`Emitir póliza ART con ${compania}`, async ({ page }) => {
                const deps = buildEmisionDependencies(page);

                await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
                await deps.dashboardPage.retirarFondos.waitFor();

                await test.step(`1- Filtrar cotizaciones ART y seleccionar ${compania}`, async () => {
                    await deps.emisionArtPage.tablaUltCotizacionesEmision(compania);
                });

                await test.step(`2- Seleccionar cobertura de ${compania}`, async () => {
                    await deps.emisionArtPage.seleccionarCobertura(compania);
                });

                await test.step("3- Completar detalles del cliente", async () => {
                    await deps.emisionArtPage.detallesClientes();
                });

                await test.step("4- Emitir póliza", async () => {
                    await deps.emisionArtPage.emitirFinal();
                });

                await test.step("5- Verificar emisión exitosa", async () => {
                    await expect(deps.emisionArtPage.emisionFinal.emisionExitosaText).toBeVisible();
                });
            });
        }
    });

    test.describe("Verificación de isologos en tabla", () => {

        test("Isologos de compañías visibles y sin errores en tabla de cotizaciones", async ({ page }) => {
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            await deps.dashboardPage.retirarFondos.waitFor();

            await test.step("1- Filtrar por producto ART", async () => {
                await deps.emisionArtPage.tablaUltCotizaciones.filterBox.click();
                await deps.emisionArtPage.tablaUltCotizaciones.selectARTOption().click();
            });

            await test.step("2- Verificar que los isologos no están rotos", async () => {
                // Buscar todas las imágenes de compañías en la tabla
                const companyLogos = page.locator('.QT__companies img, .QT__company img');
                const logoCount = await companyLogos.count();

                for (let i = 0; i < logoCount; i++) {
                    const logo = companyLogos.nth(i);

                    // Verificar que la imagen está cargada (naturalWidth > 0)
                    const isLoaded = await logo.evaluate((img: HTMLImageElement) => {
                        return img.complete && img.naturalWidth > 0;
                    });

                    expect.soft(isLoaded, `Logo ${i + 1} debería estar cargado correctamente`).toBe(true);
                }
            });

            await test.step("3- Verificar que no hay placeholders de error", async () => {
                // Verificar que no hay texto alt visible (señal de imagen rota)
                const brokenImages = page.locator('.QT__companies img[alt]:not([src])');
                await expect(brokenImages).toHaveCount(0);
            });
        });

        test("Cada fila de cotización muestra las compañías cotizadas correctamente", async ({ page }) => {
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            await deps.dashboardPage.retirarFondos.waitFor();

            await test.step("1- Filtrar por ART", async () => {
                await deps.emisionArtPage.tablaUltCotizaciones.filterBox.click();
                await deps.emisionArtPage.tablaUltCotizaciones.selectARTOption().click();
            });

            await test.step("2- Verificar estructura de filas con compañías", async () => {
                const rows = page.locator('table tbody tr').filter({ has: page.locator('.QT__companies') });
                const rowCount = await rows.count();

                expect(rowCount).toBeGreaterThan(0);

                // Verificar que al menos la primera fila tiene compañías visibles
                const firstRowCompanies = rows.first().locator('.QT__companies');
                await expect(firstRowCompanies).toBeVisible();
            });
        });
    });
});
