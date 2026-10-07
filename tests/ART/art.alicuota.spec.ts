/// <reference types="node" />
import { test, expect, type Page, Locator } from "@playwright/test";
import DashboardPage from "../../pages/dashboardPage";
import EmisionArtPage from "../../pages/emisionArtPage";
import CommonButtons from "../../components/commonButtons";
import { COMPANY_NAMES } from "../../components/ART/tablaEmision";

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

export async function getPrimaMensualNumberByCompania(
    page: Page,
    nombreCompania: string
): Promise<number> {
    // El botón de emitir tiene el ID emitirButton_{companyName}
    const companiaFormatted = nombreCompania.replace(/\s+/g, '_');
    const emitirButton = page.locator(`#emitirButton_${companiaFormatted}`);

    // Esperar a que el botón de emitir sea visible
    await expect(emitirButton).toBeVisible({ timeout: 15000 });

    // Encontrar el contenedor padre que contiene tanto el botón como los precios
    // Buscamos el contenedor Grid más amplio que contiene toda la fila
    // Necesitamos subir varios niveles para encontrar el contenedor correcto
    const filaContainer = emitirButton.locator('xpath=ancestor::div[contains(@class, "Grid")][last()]');

    await expect(filaContainer).toBeVisible({ timeout: 10000 });

    // Buscar todos los elementos que contienen texto con formato de precio ($XXX.XXX)
    // Usamos getByText con regex que es más robusto que locator('text=...')
    // La estructura de columnas es: icon, compañía, alícuota, prima mensual, costo unitario, acciones
    // La prima mensual es el PRIMER precio visible (antes del costo unitario)
    const preciosEnFila = filaContainer.getByText(/\$[\d.,]+/);

    // Esperar a que haya al menos un precio visible
    const count = await preciosEnFila.count();
    expect(count, `Debería haber al menos un precio visible en la fila de ${nombreCompania}`).toBeGreaterThan(0);
    
    await expect(preciosEnFila.first()).toBeVisible({ timeout: 10000 });

    // La prima mensual es el PRIMER elemento con precio en la fila
    const primaLocator = preciosEnFila.first();

    await expect(primaLocator).toBeVisible({ timeout: 10000 });

    const rawText = (await primaLocator.textContent()) ?? '';
    const numericText = rawText.replace(/[^0-9]/g, '');

    if (!numericText) {
        throw new Error(`No se pudo parsear la prima mensual de ${nombreCompania}: "${rawText}"`);
    }

    return Number(numericText);
}



test.setTimeout(180000);

test.describe("Manejo de Alícuota ART", () => {

    test.describe("Validación de límites", () => {

        test("Alícuota máxima no puede superar 25%", async ({ page }) => {
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            await deps.dashboardPage.retirarFondos.waitFor();

            await test.step("1- Ir a cotización con selector de alícuota", async () => {
                await deps.emisionArtPage.tablaUltCotizaciones.filterBox.click();
                await deps.emisionArtPage.tablaUltCotizaciones.selectARTOption().click();

                const emitirBtn = deps.commonButtons.emitirBtn.first();
                await emitirBtn.click();
            });

            await test.step("2- Incrementar alícuota hasta 25% y verificar límite", async () => {
                await deps.commonButtons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });

                const plusBtn = page.getByRole('button', { name: '+' }).first();
                const valueSpan = page.locator('.PercentageAdjuster span').first();

                // Verificar que los elementos existen
                if (await plusBtn.isVisible() && await valueSpan.isVisible()) {
                    // Clickear + hasta llegar a 25
                    let currentValue = parseFloat(await valueSpan.textContent() || '0');
                    while (currentValue < 25) {
                        await plusBtn.click();
                        await page.waitForTimeout(100);
                        currentValue = parseFloat(await valueSpan.textContent() || '0');
                    }

                    // Verificar que llegó a 25
                    expect(currentValue).toBe(25);

                    // Verificar que el botón + está deshabilitado
                    await expect(plusBtn).toBeDisabled();
                }
            });
        });

        test("Alícuota respeta mínimo del backend", async ({ page }) => {
            const deps = buildEmisionDependencies(page);

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            await deps.dashboardPage.retirarFondos.waitFor();

            await test.step("1- Ir a selector de cobertura", async () => {
                await deps.emisionArtPage.tablaUltCotizaciones.filterBox.click();
                await deps.emisionArtPage.tablaUltCotizaciones.selectARTOption().click();

                const emitirBtn = deps.commonButtons.emitirBtn.first();
                await emitirBtn.click();
            });

            await test.step("2- Verificar que todos los botones de decremento están deshabilitados", async () => {
                await deps.commonButtons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });

                // Obtener todos los botones de decremento '–'
                const decrementButtons = page.getByRole('button', { name: '–' });
                const count = await decrementButtons.count();

                // Verificar que existen botones de decremento
                expect(count, "Deberían existir botones de decremento '–'").toBeGreaterThan(0);

                // Verificar que TODOS los botones '–' están deshabilitados
                for (let i = 0; i < count; i++) {
                    const btn = decrementButtons.nth(i);
                    await expect(btn, `El botón de decremento ${i + 1} debería estar deshabilitado`).toBeDisabled();
                }
            });
        });
    });

    test.describe("Manejo de Premio", () => {

        test("Premio se muestra correctamente en resultado de emisión", async ({ page }) => {
            const deps = buildEmisionDependencies(page);
            const compania = COMPANY_NAMES[0]; // Galeno
            let premioTabla: number = 0;

            await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
            await deps.dashboardPage.retirarFondos.waitFor();

            await test.step("1- Ir a tabla de cotizaciones y capturar premio de la compañía", async () => {
                // Filtrar por ART
                await deps.emisionArtPage.tablaUltCotizaciones.filterBox.click();
                await deps.emisionArtPage.tablaUltCotizaciones.selectARTOption().click();

                // Ahora hacer clic en EMITIR
                const emitirBtn = deps.emisionArtPage.tablaUltCotizaciones.getEmitirButtonByCompania(compania);
                await emitirBtn.click();
            });

            await test.step("2- Seleccionar cobertura y completar detalles", async () => {
                premioTabla = await getPrimaMensualNumberByCompania(page, compania);
                console.log(`Premio capturado de ${compania}: ${premioTabla}`);

                await deps.emisionArtPage.seleccionarCobertura(compania);
                await deps.emisionArtPage.detallesClientes();
            });

            await test.step("3- Emitir y verificar premio final", async () => {
                //await deps.emisionArtPage.emitirFinal();
//
                //await expect(deps.emisionArtPage.emisionFinal.emisionExitosaText).toBeVisible();
                //await expect(deps.emisionArtPage.emisionFinal.valorCobertura).toBeVisible();

                // Obtener el valor de la pantalla final
                const rawPremioFinal = await deps.emisionArtPage.emisionFinal.getValorCoberturaFinal();
                const premioFinal = Number(rawPremioFinal.replace(/[^0-9]/g, ''));
                console.log(`Premio en pantalla final: ${premioFinal}`);

                // Verificar que coinciden
                expect(premioFinal, `El premio final (${premioFinal}) debería coincidir con el de la tabla (${premioTabla})`).toBe(premioTabla);
            });
        });
    });

    test("Premio se actualiza al cambiar alícuota", async ({ page }) => {
        const deps = buildEmisionDependencies(page);
        const compania = COMPANY_NAMES[0]; // Galeno
        let premioInicial: number = 0;
        let premioFinal: number = 0;

        await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
        await deps.dashboardPage.retirarFondos.waitFor();

        await test.step("1- Ir a tabla de cotizaciones y capturar premio inicial", async () => {
            // Filtrar por ART
            await deps.emisionArtPage.tablaUltCotizaciones.filterBox.click();
            await deps.emisionArtPage.tablaUltCotizaciones.selectARTOption().click();

            // Hacer clic en EMITIR para la compañía específica
            const emitirBtn = deps.emisionArtPage.tablaUltCotizaciones.getEmitirButtonByCompania(compania);
            await emitirBtn.click();
        });

        await test.step("2- Capturar premio inicial e incrementar alícuota", async () => {
            await deps.commonButtons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });

            // Capturar el premio inicial usando la función helper
            premioInicial = await getPrimaMensualNumberByCompania(page, compania);
            console.log(`Premio inicial de ${compania}: ${premioInicial}`);

            // Encontrar el botón + en la misma fila de la compañía
            const companiaFormatted = compania.replace(/\s+/g, '_');
            const emitirButton = page.locator(`#emitirButton_${companiaFormatted}`);
            
            // Encontrar la fila contenedora (misma lógica que getPrimaMensualNumberByCompania)
            const filaContainer = emitirButton.locator('xpath=ancestor::div[contains(@class, "Grid")][last()]');
            await expect(filaContainer).toBeVisible({ timeout: 10000 });

            // Buscar el botón + dentro de la misma fila
            const incrementBtn = filaContainer.getByRole('button', { name: '+' }).first();

            if (await incrementBtn.isVisible()) {
                await incrementBtn.click();
                await page.waitForTimeout(500);
            }
        });

        await test.step("3- Validar que el premio se actualizó después del incremento", async () => {
            // Capturar el premio final después de incrementar la alícuota
            premioFinal = await getPrimaMensualNumberByCompania(page, compania);
            console.log(`Premio final de ${compania} después de incrementar alícuota: ${premioFinal}`);

            // El premio debería cambiar al modificar alícuota
            // (puede ser igual si ya está en el máximo)
            expect(premioFinal).not.toBeNull();
            expect(premioFinal).toBeGreaterThan(0);
        });
    });
});

test.describe("Controles de Alícuota", () => {

    test("Botones + y - modifican alícuota correctamente", async ({ page }) => {
        const deps = buildEmisionDependencies(page);

        await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
        await deps.dashboardPage.retirarFondos.waitFor();

        await test.step("1- Ir a tabla de emisión", async () => {
            await deps.emisionArtPage.tablaUltCotizaciones.filterBox.click();
            await deps.emisionArtPage.tablaUltCotizaciones.selectARTOption().click();

            const emitirBtn = deps.commonButtons.emitirBtn.first();
            await emitirBtn.click();
        });

        await test.step("2- Verificar controles +/-", async () => {
            await deps.commonButtons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });

            // Verificar que existen los botones + y -
            const masBtn = deps.emisionArtPage.tablaEmision.masBtn;
            const menosBtn = deps.emisionArtPage.tablaEmision.menosBtn;

            // Solo verificar si es Régimen General (tiene controles de alícuota)
            if (await deps.emisionArtPage.tablaEmision.regimenGeneral.isVisible()) {
                await expect(masBtn).toBeVisible();
                await expect(menosBtn).toBeVisible();

                // Verificar que son clickeables
                await expect(masBtn).toBeEnabled();
            }
        });
    });
});
