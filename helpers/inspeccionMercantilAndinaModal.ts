import { type Page, expect } from "@playwright/test";
import EmisionAutoPage from "../pages/emisionAutoPage";

const OTRAS_COMPANIAS = [
    "Sancor",
    "Rivadavia",
    "Zurich",
    "RUS",
    "Federación",
    "Experta",
    "ATM",
    "Triunfo",
] as const;

async function dejarSoloMercantilSeleccionada(page: Page): Promise<void> {
    for (const name of OTRAS_COMPANIAS) {
        const btn = page.getByRole("button", { name, exact: true });
        if (!(await btn.isVisible().catch(() => false))) continue;
        const selected = (await btn.locator("svg").count()) > 0;
        if (selected) {
            await btn.click();
        }
    }
    const merc = page.getByRole("button", { name: "Mercantil", exact: true });
    await expect(merc).toBeVisible({ timeout: 15000 });
    if ((await merc.locator("svg").count()) === 0) {
        await merc.click();
    }
}

/**
 * Cotiza + avanza emisión hasta el step de inspección (sin completar el modal).
 */
export async function navegarHastaInspeccionMercantilAndina(
    test: any,
    page: Page,
    datosDelTest: any
): Promise<EmisionAutoPage> {
    const emisionAutoPage = new EmisionAutoPage(page);
    const compania = "mercantil_andina";

    await test.step("Seleccionar solo Mercantil Andina", async () => {
        await dejarSoloMercantilSeleccionada(page);
    });

    await test.step("Completar vehículo y titular", async () => {
        await emisionAutoPage.seleccionarAuto(datosDelTest, compania);
        await emisionAutoPage.seleccionarPersona(datosDelTest);
    });

    await test.step("Emitir cobertura B1/923", async () => {
        // Sidebar rediseño: tras cotizar hay que activar el tile Mercantil
        // (si no, puede quedar Sancor y #emitirButton_923 no existe).
        const mercTile = page.getByRole("button", { name: "Mercantil", exact: true });
        await expect(mercTile).toBeVisible({ timeout: 60000 });
        await mercTile.click();

        const emitirB1 = page.locator("#emitirButton_923");
        await expect(emitirB1).toBeVisible({ timeout: 180000 });
        await emitirB1.click();

        const continuarSinCambios = page.getByRole("button", { name: "CONTINUAR SIN CAMBIOS" });
        if (await continuarSinCambios.isVisible({ timeout: 4000 }).catch(() => false)) {
            await continuarSinCambios.click();
        }
        await expect(page.getByRole("heading", { name: "Emisión" })).toBeVisible({ timeout: 60000 });
    });

    await test.step("Emitir hasta inspección", async () => {
        await emisionAutoPage.emitirFormaPago(datosDelTest);
        await emisionAutoPage.emitirCliente(datosDelTest);
        await emisionAutoPage.emitirDetalleAuto(datosDelTest);
        await expect(emisionAutoPage.emisionInspeccion.btnIrAInspeccion).toBeVisible({ timeout: 120000 });
    });

    return emisionAutoPage;
}
