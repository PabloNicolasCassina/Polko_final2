import { test, expect, type TestInfo, type Page, Download } from "@playwright/test";
import path from 'path';
import fs from 'fs';
import DashboardPage from "../pages/dashboardPage";
import EmisionMotoPage from "../pages/emisionMotoPage";
import data from "../data/motos.json";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTablaMoto from "../components/moto/cotizacionTablaMoto";
// Importaciones añadidas
import { companyConfigsMoto } from "../data/companyConfigsMoto"; // (Del archivo nuevo)
import { buildMotoTestData } from "../helpers/testDataBuilder"; // (De la función helper)

let dashboardPage: DashboardPage;
let emisionMotoPage: EmisionMotoPage;
let commonButtons: CommonButtons;
let companias: Companias;
let cotizacionTabla: CotizacionTablaMoto;
let buttons: CommonButtons;

test.beforeEach('Reutilizar el estado de autenticación de Facebook', async ({ page }, testInfo) => {
    // ... (tu beforeEach existente) ...
});

test.afterEach(async ({ page }, testInfo) => {
  // ... (tu afterEach existente) ...
});

/**
 * Añade el flag booleano de la compañía (ej: sancor: true) al objeto de datos.
 */
// tests/emisionMoto.spec.ts

const companiasPosibles = [
    'sancor', 'rivadavia', 'rus', 'atm'
];

function prepararDatosMoto(moto: any, companiaActiva: string): any {
    // 1. Pone todos los flags en 'false'
    for (const compania of companiasPosibles) {
        moto[compania] = false; // Añade la propiedad y la setea en false
    }
    
    // 2. Pone el activo en 'true'
    moto[companiaActiva] = true; // Setea el flag de la compañía activa

    return moto;
}

// --- NUEVA LÓGICA DE BUCLES ANIDADOS ---
for (const moto of data.motos) {
    for (const compania of companiasPosibles) {
        // Bucle para CON y SIN config avanzada
        for (const tieneConfigAvanzada of [true, false]) {
            
            const configsCompania = companyConfigsMoto[compania];
            
            // Lógica para manejar la iteración
            let configsParaIterar;
            if (tieneConfigAvanzada) {
                // Si es 'con config', itera sobre todas las configs definidas
                configsParaIterar = configsCompania;
                if (!configsParaIterar || configsParaIterar.length === 0) {
                     console.warn(`Se esperaba 'con config' pero no hay configs definidas para MOTO: ${compania}. Saltando...`);
                     continue; // Salta esta iteración de 'con config'
                }
            } else {
                // Si es 'sin config', crea un solo caso de prueba
                // usando la primera config como default (o una config vacía)
                configsParaIterar = [ (configsCompania && configsCompania[0]) || { formaPago: "Efectivo", cantCuotas: 1 } ]; // Default si no hay nada
            }

            for (const config of configsParaIterar) {
                
                const testTitle = `Cotizar ${moto.marca} ${moto.version} ${moto.año} con ${compania} ${tieneConfigAvanzada ? 'con config' : 'sin config'} - Pago: ${config.formaPago} - Cuotas: ${config.cantCuotas} - Ajuste Automático: ${config.ajusteAutomatico || 'N/A'} - Uso Vehículo: ${config.usoVehiculo || 'N/A'}`;
                
                test(testTitle, async ({ page }, testInfo) => {
                    test.setTimeout(1200000);
                    dashboardPage = new DashboardPage(page);
                    emisionMotoPage = new EmisionMotoPage(page);
                    commonButtons = new CommonButtons(page);
                    companias = new Companias(page);
                    cotizacionTabla = new CotizacionTablaMoto(page);

                    // Construye el objeto de datos
                    const datosMotoParaTest = buildMotoTestData({
                        motoBase: moto,
                        compania: compania,
                        tieneConfigAvanzada: tieneConfigAvanzada,
                        config: config
                    });
                    
                    // Añade el flag booleano (ej: sancor: true)
                    prepararDatosMoto(datosMotoParaTest, compania); 

                    await page.goto("http://localhost:3000/u/cotizar/motovehiculo");
                    await commonButtons.siguienteBtn.waitFor();
                    
                    await cotizar(test, datosMotoParaTest, compania);
                    await emitir(test, datosMotoParaTest, compania);
                });
            }
        }
    }
}
// --- FIN BUCLES ANIDADOS ---


async function cotizar(test: any, datosDelTest: any, compania: string) {
    await test.step(`📝Flujo cotización póliza para: ${compania}`, async () => {
        await test.step("1- Seleccionar Compañía", async () => {
            // Esta lógica de Sancor/Rus es extraña, pero la mantengo
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
            // Pasa los datos completos
            await emisionMotoPage.tablaCotizacion(datosDelTest);
            await cotizacionTabla.getValorCobertura(compania);
            await cotizacionTabla.getCompaniaBtn(compania).click();
        });
    });
}

async function emitir(test: any, datosDelTest: any, compania: string) {
    await test.step(`📝Flujo emisión póliza para: ${compania}`, async () => {
        await test.step("1- Seleccionar forma de pago", async () => {
            // Pasa los datos completos
            await emisionMotoPage.emitirFormaPago(datosDelTest);
        });
        await test.step("2- Completar datos del cliente", async () => {
            await emisionMotoPage.emitirCliente();
        });
        await test.step("3- Completar detalle del auto", async () => {
            await emisionMotoPage.emitirDetalleAuto();
        });
        await test.step("4- Completar inspección", async () => {
            await emisionMotoPage.emitirInspeccion();
        });
        await test.step("5- Emisión de póliza", async () => {
            await emisionMotoPage.emitirFinal();
        });
        await test.step("6- Descargar y adjuntar póliza", async () => {
            await descargarYAdjuntarPoliza(emisionMotoPage.page, test.info());
        });
    });
}

async function descargarYAdjuntarPoliza(page: Page, testInfo: TestInfo) {
    // ... (tu función descargarYAdjuntarPoliza existente) ...
    console.log("Iniciando descarga de póliza...");

    // 1. Prepara la Promesa A: la descarga
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 }); // Damos 60s para la descarga

    // 2. Prepara la Promesa B: la aparición del error
    const errorPromise = emisionMotoPage.emisionFinal.errorDocumentacion
        .waitFor({ state: 'visible', timeout: 60000 }); // El error debe aparecer rápido (10s)

    // 3. Haz clic en el botón de descarga
    await emisionMotoPage.emisionFinal.descargaBtn.click();
    console.log("Clic en Descargar. Esperando resultado...");

    // 4. Espera a ver qué promesa se resuelve primero
    let download: Download;
    try {
        const firstResult = await Promise.race([
            downloadPromise,
            errorPromise
        ]);

        // 5. Comprueba qué fue lo que pasó
        if (firstResult && typeof (firstResult as Download).saveAs === 'function') {
            console.log("¡Descarga detectada!");
            download = firstResult as Download;
        } else {
            throw new Error("Apareció el error 'Error al descargar la documentación' en lugar de la descarga.");
        }

    } catch (e) {
        console.error("Falló la carrera de promesas (ni descarga ni error aparecieron a tiempo):", e);
        throw e; // Falla el test
    }


    // 4. Define tu directorio de destino de forma robusta
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