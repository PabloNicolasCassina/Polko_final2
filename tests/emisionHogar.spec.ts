import { test, expect, type TestInfo, type Page, Download } from "@playwright/test";
import path from 'path'; // Se agrega la importación de 'path'
import fs from 'fs';     // Se agrega la importación de 'fs'
import DashboardPage from "../pages/dashboardPage";
import EmisionHogarPage from "../pages/emisionHogarPage";
import data from "../data/hogar.json";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTabla from "../components/auto/cotizacionTabla";

let dashboardPage: DashboardPage;
let emisionHogarPage: EmisionHogarPage;
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



function prepararDatosHogar(hogar: any): any {
    // 1. Ponemos todas las compañías en 'false'

    return hogar;
}

//const companiasParaProbar = ['sancor', 'zurich', 'atm'];

// 2. Bucle externo: recorre cada auto del JSON
for (const hogar of data.hogares) {

    // 3. Bucle interno: recorre cada compañía que quieres probar

        // 4. Crea un test para CADA combinación de hogar y compañía
        test(`Cotizar ${hogar.tipoVivienda} ${hogar.tamanioVivienda} ${hogar.localidad}`, async ({ page }) => {
            test.setTimeout(1200000);
            dashboardPage = new DashboardPage(page);
            emisionHogarPage = new EmisionHogarPage(page);
            commonButtons = new CommonButtons(page);
            companias = new Companias(page);
            cotizacionTabla = new CotizacionTabla(page);

            // 5. ¡IMPORTANTE! Prepara una copia de los datos para este test específico


            await page.goto("http://localhost:3000/u/cotizar/hogar");
            await commonButtons.siguienteBtn.waitFor();
            await cotizar(test, hogar);
            //await emitir(test, hogar, compania);

            // 6. Llama a tus métodos del Page Object con los datos ya preparados

        });
}

async function cotizar(test: any, hogar: any) {
    const datosDelTest = prepararDatosHogar({ ...hogar });
    await test.step(`📝Flujo cotización póliza para: ${hogar}`, async () => {

        await test.step("1- Completar datos del Hogar", async () => {
            await emisionHogarPage.seleccionarHogar(datosDelTest);
        });
        
/*
        await test.step("2- Flujo tabla de cotización", async () => {
            await emisionHogarPage.tablaCotizacion();
            await cotizacionTabla.getValorCobertura(compania);
            await cotizacionTabla.getCompaniaBtn(compania).click();
        });*/




    });
}
/*
async function emitir(test: any, auto: any, compania: string) {
    const datosDelTest = prepararDatosAuto({ ...auto }, compania);
    await test.step(`📝Flujo emisión póliza para: ${compania}`, async () => {
        await test.step("1- Seleccionar forma de pago", async () => {
            await emisionHogarPage.emitirFormaPago(datosDelTest);
        });
        await test.step("2- Completar datos del cliente", async () => {
            await emisionHogarPage.emitirCliente();
        });
        await test.step("3- Completar detalle del auto", async () => {
            await emisionHogarPage.emitirDetalleAuto();
        });
        await test.step("4- Completar inspección", async () => {
            await emisionHogarPage.emitirInspeccion();
        });
        await test.step("5- Emisión de póliza", async () => {
            
            await emisionHogarPage.emitirFinal();
        });
        await test.step("6- Descargar y adjuntar póliza", async () => {
            await descargarYAdjuntarPoliza(emisionHogarPage.page, test.info());
        });

    });
}


async function descargarYAdjuntarPoliza(page: Page, testInfo: TestInfo) {
    console.log("Iniciando descarga de póliza...");

    // 1. Prepara la Promesa A: la descarga
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 }); // Damos 60s para la descarga

    // 2. Prepara la Promesa B: la aparición del error
    // (Asegúrate que 'emisionMotoPage.emisionFinal.errorDocumentacion' sea el selector
    // correcto para el toast/popup de error "Error al descargar...")
    const errorPromise = emisionHogarPage.emisionFinal.errorDocumentacion
        .waitFor({ state: 'visible', timeout: 60000 }); // El error debe aparecer rápido (10s)

    // 3. Haz clic en el botón de descarga
    await emisionHogarPage.emisionFinal.descargaBtn.click();
    console.log("Clic en Descargar. Esperando resultado...");

    // 4. Espera a ver qué promesa se resuelve primero
    let download: Download;
    try {
        const firstResult = await Promise.race([
            downloadPromise,
            errorPromise
        ]);

        // 5. Comprueba qué fue lo que pasó
        // Si 'firstResult' tiene 'saveAs', es una Descarga (Promesa A ganó)
        if (firstResult && typeof (firstResult as Download).saveAs === 'function') {
            // ¡Éxito! Es la descarga.
            console.log("¡Descarga detectada!");
            download = firstResult as Download;
        } else {
            // ¡Error! El error apareció primero (Promesa B ganó)
            console.error("¡Error de documentación detectado!");
            // ESTO ES LO QUE TERMINA EL TEST Y AVISA
            throw new Error("Apareció el error 'Error al descargar la documentación' en lugar de la descarga.");
        }

    } catch (e) {
        // Si Promise.race falla (ej. por timeout de ambas promesas), lo relanzamos
        console.error("Falló la carrera de promesas (ni descarga ni error aparecieron a tiempo):", e);
        throw e; // Falla el test
    }


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
}*/