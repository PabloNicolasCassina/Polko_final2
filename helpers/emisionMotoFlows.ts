import { type Download, type Page, type TestInfo } from "@playwright/test";
import path from "path";
import fs from "fs";
import EmisionMotoPage from "../pages/emisionMotoPage";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTablaMoto from "../components/moto/cotizacionTablaMoto";
import EmisionFinal from "../components/emisionFinal";

export interface EmitirMotoOptions {
    incluirDescarga?: boolean;
}

interface DescargableEmisionPage {
    emisionFinal: Pick<EmisionFinal, "descargaBtn" | "errorDocumentacion">;
}

export async function cotizarMoto(
    test: any,
    page: Page,
    datosDelTest: any,
    compania: string,
    emisionMotoPage: EmisionMotoPage,
    companias: Companias,
    cotizacionTabla: CotizacionTablaMoto
): Promise<string | null> {
    const commonButtons = new CommonButtons(page);
    let valorTabla: string | null = null;

    await test.step(`📝Flujo cotización póliza moto para: ${compania}`, async () => {
        await test.step("1- Seleccionar Compañía", async () => {
            await companias.sancorLogo.click();
            await companias.rusLogo.click();
            await companias.getCompaniaLogo(compania).click();
            await commonButtons.aceptarSelector.click();
        });

        await test.step("2- Completar datos de la moto", async () => {
            await emisionMotoPage.seleccionarMoto(datosDelTest, compania);
        });

        await test.step("3- Completar datos del asegurado", async () => {
            await emisionMotoPage.seleccionarPersona(datosDelTest);
        });

        await test.step("4- Flujo tabla de cotización", async () => {
            await emisionMotoPage.tablaCotizacion(datosDelTest);
            valorTabla = await cotizacionTabla.getValorCobertura(compania);
            const companiaBtn = await cotizacionTabla.getCompaniaBtn(compania);
            await companiaBtn.click();
        });
    });

    return valorTabla;
}

export async function emitirMoto(
    test: any,
    page: Page,
    datosDelTest: any,
    compania: string,
    emisionMotoPage: EmisionMotoPage,
    options: EmitirMotoOptions = {}
): Promise<void> {
    await test.step(`📝Flujo emisión póliza moto para: ${compania}`, async () => {
        await test.step("1- Seleccionar forma de pago", async () => {
            await emisionMotoPage.emitirFormaPago(datosDelTest);
        });
        await test.step("2- Completar datos del cliente", async () => {
            await emisionMotoPage.emitirCliente();
        });
        await test.step("3- Completar detalle de la moto", async () => {
            await emisionMotoPage.emitirDetalleAuto();
        });
        await test.step("4- Completar inspección", async () => {
            await emisionMotoPage.emitirInspeccion();
        });
        await test.step("5- Emisión de póliza", async () => {
            await emisionMotoPage.emitirFinal();
        });
        if (options.incluirDescarga) {
            await test.step("6- Descargar y validar póliza", async () => {
                await descargarYAdjuntarPoliza(page, test.info(), emisionMotoPage);
            });
        }
    });
}

export async function descargarYAdjuntarPoliza(
    page: Page,
    testInfo: TestInfo,
    emisionPage: DescargableEmisionPage
): Promise<void> {
    const downloadPromise = page.waitForEvent("download", { timeout: 180000 });
    const errorPromise = emisionPage.emisionFinal.errorDocumentacion
        .waitFor({ state: "visible", timeout: 180000 });

    await emisionPage.emisionFinal.descargaBtn.click();

    let download: Download;
    try {
        const firstResult = await Promise.race([downloadPromise, errorPromise]);
        if (firstResult && typeof (firstResult as Download).saveAs === "function") {
            download = firstResult as Download;
        } else {
            throw new Error("Apareció el error 'Error al descargar la documentación' en lugar de la descarga.");
        }
    } catch (e) {
        console.error("Falló la carrera de promesas:", e);
        throw e;
    }

    const downloadDir = path.join(__dirname, "..", "resultados-polizas");
    fs.mkdirSync(downloadDir, { recursive: true });
    const savePath = path.join(downloadDir, download.suggestedFilename());
    await download.saveAs(savePath);

    await testInfo.attach("Poliza-Descargada", {
        path: savePath,
        contentType: "application/pdf",
    });
}
