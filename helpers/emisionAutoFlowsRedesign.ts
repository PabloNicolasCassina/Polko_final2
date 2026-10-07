import { type Page, type TestInfo, type Download, expect } from "@playwright/test";
import path from 'path';
import fs from 'fs';
import EmisionAutoPage from "../pages/emisionAutoPage";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTabla from "../components/auto/cotizacionTabla";
import QuotationSidebar from "../components/quotationSidebar";
import EmisionFinal from "../components/emisionFinal";

export interface EmitirAutoOptions {
    incluirDescarga?: boolean;
}

interface DescargableEmisionPage {
    emisionFinal: Pick<EmisionFinal, "descargaBtn" | "errorDocumentacion">;
}

export async function cotizarAuto(
    test: any,
    page: Page,
    datosDelTest: any,
    compania: string,
    emisionAutoPage: EmisionAutoPage,
    companias: Companias,
    cotizacionTabla: CotizacionTabla,
    blacklisted: boolean = false
): Promise<string | null> {
    const commonButtons = new CommonButtons(page);
    let valorTabla: string | null = null;

    await test.step(`📝Flujo cotización póliza para: ${compania}`, async () => {
        await test.step("1- Seleccionar Compañía", async () => {
            await companias.seleccionarCompania(compania);
        });

        await test.step("2- Completar datos del auto", async () => {
            await emisionAutoPage.seleccionarAuto(datosDelTest, compania);
        });

        await test.step("3- Completar datos del asegurado", async () => {
            await emisionAutoPage.seleccionarPersona(datosDelTest);
        });

        if (blacklisted) {
            await test.step("4- Verificar descuento adicional bloqueado", async () => {
                await expect(cotizacionTabla.configAvanzadaBtn.or(cotizacionTabla.cotizacionErrorText)).toBeVisible({ timeout: 180000 });
                const errorVisible = await cotizacionTabla.cotizacionErrorText.isVisible();
                if (errorVisible) {
                    throw new Error("Hubo un problema al cotizar la póliza.");
                }
                await new QuotationSidebar(page).abrirConfigAvanzada();
                await expect(cotizacionTabla.cboxDescAdicional).toBeHidden({ timeout: 180000 });
                await expect(cotizacionTabla.cboxTextDescAdicional).toBeHidden({ timeout: 180000 });
                await expect(cotizacionTabla.descuentoBar15.or(cotizacionTabla.descuentoBar10)).toBeVisible({ timeout: 180000 });
                console.log(`✓ Compañía ${compania} aparece como bloqueada (blacklisted) en la tabla`);
            });
        } else {
            await test.step("4- Flujo tabla de cotización", async () => {
                await emisionAutoPage.tablaCotizacion(datosDelTest, compania);
                valorTabla = await cotizacionTabla.getValorCoberturaTabla(compania);
                await cotizacionTabla.clickEmitirHandlingDirtyModal(compania);
            });
        }
    });

    return valorTabla;
}

export async function emitirAuto(
    test: any,
    page: Page,
    datosDelTest: any,
    compania: string,
    valorTabla: string | null,
    emisionAutoPage: EmisionAutoPage,
    options: EmitirAutoOptions = {}
): Promise<void> {
    await test.step(`📝Flujo emisión póliza para: ${compania}`, async () => {
        await test.step("1- Seleccionar forma de pago", async () => {
            await emisionAutoPage.emitirFormaPago(datosDelTest);
        });
        await test.step("2- Completar datos del cliente", async () => {
            await emisionAutoPage.emitirCliente(datosDelTest);
        });
        await test.step("3- Completar detalle del auto", async () => {
            await emisionAutoPage.emitirDetalleAuto(datosDelTest);
        });
        if (!datosDelTest.zurich) {
            // Mercantil Andina completa la inspección en una pestaña externa
            // (tst.barbara.com.ar); ver pages/emisionAutoPage.ts#emitirInspeccion.
            const descripcionInspeccion = datosDelTest.mercantil_andina
                ? "4- Completar inspección (digital externa Mercantil Andina)"
                : "4- Completar inspección";
            await test.step(descripcionInspeccion, async () => {
                await emisionAutoPage.emitirInspeccion(datosDelTest);
            });
        }
        await test.step("5- Emisión de póliza", async () => {
            await emisionAutoPage.emitirFinal(compania, valorTabla);
        });
        if (options.incluirDescarga) {
            await test.step("6- Descargar y validar póliza", async () => {
                await descargarYAdjuntarPoliza(page, test.info(), emisionAutoPage);
            });
        }
    });
}

export async function descargarYAdjuntarPoliza(
    page: Page,
    testInfo: TestInfo,
    emisionPage: DescargableEmisionPage
): Promise<void> {
    console.log("Iniciando descarga de póliza...");

    await expect(emisionPage.emisionFinal.descargaBtn).toBeEnabled({ timeout: 360000 });
    const downloadPromise = page.waitForEvent('download', { timeout: 180000 });
    const errorPromise = emisionPage.emisionFinal.errorDocumentacion
        .waitFor({ state: 'visible', timeout: 180000 });
    await emisionPage.emisionFinal.descargaBtn.click();
    console.log("Clic en Descargar. Esperando resultado...");

    let download: Download;
    try {
        const firstResult = await Promise.race([downloadPromise, errorPromise]);
        if (firstResult && typeof (firstResult as Download).saveAs === 'function') {
            console.log("¡Descarga detectada!");
            download = firstResult as Download;
        } else {
            throw new Error("Apareció el error 'Error al descargar la documentación' en lugar de la descarga.");
        }
    } catch (e) {
        console.error("Falló la carrera de promesas:", e);
        throw e;
    }

    const downloadDir = path.join(__dirname, '..', 'resultados-polizas');
    fs.mkdirSync(downloadDir, { recursive: true });
    const savePath = path.join(downloadDir, download.suggestedFilename());
    await download.saveAs(savePath);
    console.log(`Póliza guardada en: ${savePath}`);

    await testInfo.attach('Poliza-Descargada', {
        path: savePath,
        contentType: 'application/pdf',
    });
}
