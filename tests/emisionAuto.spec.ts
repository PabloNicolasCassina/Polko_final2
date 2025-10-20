import { test, expect, type TestInfo, type Page } from "@playwright/test";
import path from 'path'; // Se agrega la importación de 'path'
import fs from 'fs';     // Se agrega la importación de 'fs'
import DashboardPage from "../pages/dashboardPage";
import EmisionAutoPage from "../pages/emisionAutoPage";
import data from "../data/autos.json";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTabla from "../components/cotizacionTabla";

let dashboardPage: DashboardPage;
let emisionAutoPage: EmisionAutoPage;
let commonButtons: CommonButtons;
let companias: Companias;
let cotizacionTabla: CotizacionTabla;
let buttons: CommonButtons;

test.beforeEach('Reutilizar el estado de autenticación de Facebook', async ({ page }, testInfo) => {
    // El hook beforeEach ahora solo se encarga de la configuración común que NO depende de los parámetros del test.
    let urlPrefix;
    let dashPrefix;
    const projectName = testInfo.project.name;

    if (projectName === 'setup-pre' || projectName === 'chromiumPre') {
        urlPrefix = 'http://localhost:8080';
        dashPrefix = "http://localhost:3000";
    } else if (projectName === 'setup-pro' || projectName === 'chromiumPro') {
        urlPrefix = 'https://api.polko.com.ar';
        dashPrefix = "https://www.polko.com.ar";
    }

    // LA NAVEGACIÓN INICIAL SE HA MOVIDO A CADA TEST INDIVIDUAL.
});

const companiasPosibles = [
    'zurich', 'sancor', 'federacion_patronal',
    'rivadavia', 'rus', 'experta', 'atm'
];

function prepararDatosAuto(auto: any, companiaActiva: string): any {
    // 1. Ponemos todas las compañías en 'false'
    for (const compania of companiasPosibles) {
        if (auto.hasOwnProperty(compania)) {
            auto[compania] = false;
        }
    }

    // 2. Ponemos la compañía deseada en 'true'
    if (auto.hasOwnProperty(companiaActiva)) {
        auto[companiaActiva] = true;
    } else {
        // Es bueno tener una verificación por si el nombre de la compañía es incorrecto
        throw new Error(`La compañía "${companiaActiva}" no es una clave válida en el objeto de datos.`);
    }

    return auto;
}

//const companiasParaProbar = ['sancor', 'zurich', 'atm'];

// 2. Bucle externo: recorre cada auto del JSON
for (const auto of data.autos) {

    // 3. Bucle interno: recorre cada compañía que quieres probar
    for (const compania of companiasPosibles) {

        // 4. Crea un test para CADA combinación de auto y compañía
        test(`Cotizar ${auto.marca} ${auto.modelo} ${auto.año} con ${compania}`, async ({ page }) => {
            test.setTimeout(1200000);
            dashboardPage = new DashboardPage(page);
            emisionAutoPage = new EmisionAutoPage(page);
            commonButtons = new CommonButtons(page);
            companias = new Companias(page);
            cotizacionTabla = new CotizacionTabla(page);

            // 5. ¡IMPORTANTE! Prepara una copia de los datos para este test específico


            await page.goto("http://localhost:3000/u/cotizar/automotor");
            await commonButtons.siguienteBtn.waitFor();
            await cotizar(test, auto, compania);
            await emitir(test, auto, compania);

            // 6. Llama a tus métodos del Page Object con los datos ya preparados

        });
    }
}

async function cotizar(test: any, auto: any, compania: string) {
    const datosDelTest = prepararDatosAuto({ ...auto }, compania);
    await test.step(`📝Flujo cotización póliza para: ${compania}`, async () => {
        await test.step("1- Seleccionar Compañía", async () => {
            await companias.getCompaniaLogo(compania).click();
            await commonButtons.aceptarSelector.click();
        });

        await test.step("2- Completar datos del auto", async () => {
            await emisionAutoPage.seleccionarAuto(datosDelTest, compania);
        });
        await test.step("3- Completar datos del asegurado", async () => {
            await emisionAutoPage.seleccionarPersona(datosDelTest);
        });
        await test.step("4- Flujo tabla de cotización", async () => {
            await emisionAutoPage.tablaCotizacion();
            await cotizacionTabla.getCompaniaBtn(compania).click();
        });




    });
}

async function emitir(test: any, auto: any, compania: string) {
    const datosDelTest = prepararDatosAuto({ ...auto }, compania);
    await test.step(`📝Flujo emisión póliza para: ${compania}`, async () => {
        await test.step("1- Seleccionar forma de pago", async () => {
            await emisionAutoPage.emitirFormaPago(datosDelTest);
        });
        await test.step("2- Completar datos del cliente", async () => {
            await emisionAutoPage.emitirCliente();
        });
        await test.step("3- Completar detalle del auto", async () => {
            await emisionAutoPage.emitirDetalleAuto();
        });
        await test.step("4- Completar inspección", async () => {
            await emisionAutoPage.emitirInspeccion();
        });
        await test.step("5- Emisión de póliza", async () => {
            
            await expect(commonButtons.emitirBtn).toBeEnabled({ timeout: 60000 });
            await commonButtons.emitirBtn.click();
            await expect(commonButtons.loadingSpinner).toBeHidden({ timeout: 1200000 });
            await expect(emisionAutoPage.emisionFinal.nroTramiteText).toBeVisible({ timeout: 60000 });
            await expect(emisionAutoPage.emisionFinal.descargaBtn).toBeEnabled({ timeout: 60000 });
        });
        await test.step("6- Descargar y adjuntar póliza", async () => {
            await descargarYAdjuntarPoliza(emisionAutoPage.page, test.info());
        });

    });
}


async function descargarYAdjuntarPoliza(page: Page, testInfo: TestInfo) {
    console.log("Iniciando descarga de póliza...");

    // 1. Prepara la espera del evento de descarga ANTES del clic
    const downloadPromise = page.waitForEvent('download');

    // 2. Haz clic en el botón de descarga (usando tu Page Object)
    await emisionAutoPage.emisionFinal.descargaBtn.click();

    // 3. Espera a que la descarga se complete
    const download = await downloadPromise;

    // 4. Define tu directorio de destino de forma robusta
    const downloadDir = path.join(__dirname, '..', 'resultados-polizas');

    // 5. Asegúrate de que el directorio exista, si no, lo crea
    fs.mkdirSync(downloadDir, { recursive: true });

    // 6. Combina el directorio con el nombre de archivo sugerido para crear la ruta final
    const savePath = path.join(downloadDir, download.suggestedFilename());

    // 7. Guarda el archivo en la ruta especificada
    await download.saveAs(savePath);
    console.log(`Póliza guardada en: ${savePath}`);

    // 8. Adjunta el archivo recién guardado al reporte de Playwright
    await testInfo.attach('Poliza-Descargada', {
        path: savePath,
        contentType: 'application/pdf', // Puedes cambiarlo si es otro tipo de archivo
    });
}