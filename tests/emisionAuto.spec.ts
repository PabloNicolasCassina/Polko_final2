import { test, expect, type TestInfo, type Page, Download } from "@playwright/test";
import path from 'path'; // Se agrega la importación de 'path'
import fs from 'fs';     // Se agrega la importación de 'fs'
import DashboardPage from "../pages/dashboardPage";
import EmisionAutoPage from "../pages/emisionAutoPage";
import data from "../data/autos.json";
import configs from "../data/configsAvanzadas.json";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTabla from "../components/auto/cotizacionTabla";
import { mockUserDataString } from "../helpers/mockUser";

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

    await page.route("http://localhost:8080/newGetDatosUsuario?es_master=true*", async route => {
            await route.fulfill({
                contentType: 'application/json',
                body: mockUserDataString,
            })
        });

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


const companiasPosibles = [
    'zurich', 'sancor', 'federacion_patronal',
    'rivadavia', 'rus', 'experta', 'atm', 'triunfo'
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
        test(`Cotizar ${auto.marca} ${auto.modelo} ${auto.año} con ${compania}`, async ({ page }, testInfo) => {
            test.setTimeout(1200000);
            dashboardPage = new DashboardPage(page);
            emisionAutoPage = new EmisionAutoPage(page);
            commonButtons = new CommonButtons(page);
            companias = new Companias(page);
            cotizacionTabla = new CotizacionTabla(page);

            // 5. ¡IMPORTANTE! Prepara una copia de los datos para este test específico

            page.on('request', async (request) => { // La función debe ser async
                
                // 1. Verificamos si es la llamada a 'sse' y si es un POST
                if (request.url().includes('/sse') && request.method() === 'POST') {
                    
                    // 2. ¡Lo adjuntamos al reporte!
                    await testInfo.attach('SSE POST Payload', {
                        body: request.postData() || 'Payload no encontrado (null)', // Manejamos el 'null'
                        contentType: 'application/json', // Asumiendo que es JSON
                    });
                }
            });


            await page.goto("http://localhost:3000/u/cotizar/automotor");
            await commonButtons.siguienteBtn.waitFor();
            const valorTabla = await cotizar(test, auto, compania);
            await emitir(test, auto, compania, valorTabla);

            // 6. Llama a tus métodos del Page Object con los datos ya preparados

        });
    }
}

async function cotizar(test: any, auto: any, compania: string) {
    const configEspecifica = configs.autos[compania as keyof typeof configs.autos];
    const datosCombinados = { ...auto, ...configEspecifica };
    const datosDelTest = prepararDatosAuto(datosCombinados, compania);
    let valorTabla: string | null = null;
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
            await emisionAutoPage.tablaCotizacion(datosDelTest);
            valorTabla = await cotizacionTabla.getValorCoberturaTabla(compania);
            await cotizacionTabla.getCompaniaBtn(compania).click();
        });




    });

    return valorTabla;
}

async function emitir(test: any, auto: any, compania: string, valorTabla: string | null) {
    const datosDelTest = prepararDatosAuto({ ...auto }, compania);
    await test.step(`📝Flujo emisión póliza para: ${compania}`, async () => {
        await test.step("1- Seleccionar forma de pago", async () => {
            await emisionAutoPage.emitirFormaPago(datosDelTest);
        });
        await test.step("2- Completar datos del cliente", async () => {
            await emisionAutoPage.emitirCliente();
        });
        await test.step("3- Completar detalle del auto", async () => {
            await emisionAutoPage.emitirDetalleAuto(datosDelTest);
        });
        await test.step("4- Completar inspección", async () => {
            await emisionAutoPage.emitirInspeccion();
        });
        await test.step("5- Emisión de póliza", async () => {
            
            await emisionAutoPage.emitirFinal(compania, valorTabla);
            
        });
        await test.step("6- Descargar y validar póliza", async () => {
            await descargarYAdjuntarPoliza(emisionAutoPage.page, test.info());
        });

    });
}


async function descargarYAdjuntarPoliza(page: Page, testInfo: TestInfo) {
    console.log("Iniciando descarga de póliza...");

    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    const errorPromise = emisionAutoPage.emisionFinal.errorDocumentacion
        .waitFor({ state: 'visible', timeout: 60000 }); 
    await emisionAutoPage.emisionFinal.descargaBtn.click();
    console.log("Clic en Descargar. Esperando resultado...");

    let download: Download;
    try {
        const firstResult = await Promise.race([ downloadPromise, errorPromise ]);
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

    // Solo adjunta, no valida contenido
    await testInfo.attach('Poliza-Descargada', {
        path: savePath,
        contentType: 'application/pdf', 
    });
}