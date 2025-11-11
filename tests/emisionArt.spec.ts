import { test, expect, type TestInfo, type Page, Download } from "@playwright/test";
import path from 'path'; // Se agrega la importación de 'path'
import fs from 'fs';     // Se agrega la importación de 'fs'
import DashboardPage from "../pages/dashboardPage";
import EmisionArtPage from "../pages/emisionArtPage";
import data from "../data/art.json";
import CommonButtons from "../components/commonButtons";
import { getRandomInt } from "../helpers/dataUtils";

let dashboardPage: DashboardPage;
let emisionArtPage: EmisionArtPage;
let commonButtons: CommonButtons;
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

test.afterEach(async ({ page }, testInfo) => {

    // 1. Revisa si el test falló o se agotó el tiempo de espera
    if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {

        console.log('El test falló, intentando adjuntar logs del backend...');

        try {
            // 2. Define la ruta a tu archivo de log del backend
            const logFilePath = "C:\\Polko\\microservice_products\\server.log"

            // 3. Lee el contenido del archivo de log
            const logData = fs.readFileSync(logFilePath, 'utf8');

            // 4. (Opcional) Quedarse solo con las últimas líneas
            const logLines = logData.split('\n');
            const lastLines = logLines.slice(-50).join('\n'); // Adjunta las últimas 50 líneas

            // 5. Adjunta el texto del log al reporte de Playwright
            await testInfo.attach('backend-log-on-failure', {
                body: `--- Últimas 50 líneas de server.log ---\n\n${lastLines}`,
                contentType: 'text/plain',
            });

            console.log('Log del backend adjuntado exitosamente.');

        } catch (logError) {
            // Maneja el caso donde el archivo de log no existe o no se puede leer
            console.warn(`No se pudo leer o adjuntar el log del backend.`);

            // --- CORRECCIÓN ---
            let errorMessage = 'Error desconocido al leer el log.';

            if (logError instanceof Error) {
                // Ahora TypeScript sabe que logError es un Error y tiene .message
                errorMessage = logError.message;
                console.warn(logError.message);
            } else {
                // Si no es un Error, al menos reporta lo que sea que se haya capturado
                console.warn(logError);
                errorMessage = String(logError);
            }

            await testInfo.attach('backend-log-error', {
                body: `No se pudo leer el archivo de log del backend: ${errorMessage}`,
                contentType: 'text/plain',
            });
        }
    }
});



for (const artData of data.casos) {
    test(`Cotización ART - Empleador: ${artData.empleador} - CUIT: ${artData.cuit} - Regimen: ${artData.regimen} - Masa salarial/Horas semanales: ${artData.masaSalarial || artData.horasSemanales}`, async ({ page }) => {
        commonButtons = new CommonButtons(page);
        emisionArtPage = new EmisionArtPage(page);

        await page.goto("http://localhost:3000/u/cotizar/art");
        await commonButtons.siguienteBtn.waitFor();

        await cotizar(test, artData);

    });
}

test("Emision ART - Flujo completo", async ({ page }) => {

    commonButtons = new CommonButtons(page);
    emisionArtPage = new EmisionArtPage(page);
    dashboardPage = new DashboardPage(page);
    await page.goto("http://localhost:3000/u/dashboard");
    await dashboardPage.retirarFondos.waitFor();

    await emitir(test);
});



async function cotizar(test: any, art: any) {
    const datosDelTest = { ...art }; // Crea la copia directamente

    datosDelTest.cantEmpleados = getRandomInt(1, 200).toString();

    // 2. Randomiza la masa salarial SOLO si es Régimen General
    if (datosDelTest.regimen === "Régimen General") {
        datosDelTest.masaSalarial = getRandomInt(500000, 99000000).toString(); // ej. 500k a 99M
    }

    await test.step(`📝Flujo cotización póliza para: ${art.empleador}`, async () => {
        await test.step("1- Completar datos del Empleador", async () => {
            await emisionArtPage.completarDatosEmpleador(datosDelTest);
        });

        await test.step("2- Completar datos del Empleado", async () => {
            await emisionArtPage.completarDatosEmpleado(datosDelTest);

        });

    });

    return datosDelTest;
}

async function emitir(test: any) {
    await test.step(`📝Flujo emisión póliza`, async () => {

        await test.step("3- Emitir la cotización seleccionada desde tabla ult cotizaciones", async () => {
            await emisionArtPage.tablaUltCotizacionesEmision();
        });

        await test.step("4- Seleccionar cobertura", async () => {
            await emisionArtPage.seleccionarCobertura();
        });

        await test.step("5- Detalles del Asegurado", async () => {
            await commonButtons.siguienteBtn.click();
        });
        await test.step("6- Detalle del empleado", async () => {
            await commonButtons.emitirBtn.click();
        });
    });

    
    
}