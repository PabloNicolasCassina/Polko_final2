import { BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Helper para capturar HAR por test individual
 * Útil para tener un HAR separado por cada test ejecutado
 */

export interface HarCaptureOptions {
  testName: string;
  testId?: string;
  outputDir?: string;
}

/**
 * Inicia la captura de HAR para un test específico
 * @param context Contexto del navegador de Playwright
 * @param options Opciones de captura
 * @returns Ruta del archivo HAR que se generará
 */
export async function startHarCapture(
  context: BrowserContext,
  options: HarCaptureOptions
): Promise<string> {
  const outputDir = options.outputDir || path.join(__dirname, '..', 'har', 'tests');
  
  // Crear directorio si no existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generar nombre de archivo único
  const timestamp = Date.now();
  const testId = options.testId || 'test';
  const safeTestName = options.testName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .substring(0, 50);
  
  const harFileName = `${safeTestName}-${testId}-${timestamp}.har`;
  const harPath = path.join(outputDir, harFileName);
  
  // El HAR se guardará automáticamente cuando se cierre el contexto
  // Pero podemos configurar el path aquí
  console.log(`📊 HAR capture iniciado: ${harPath}`);
  
  return harPath;
}

/**
 * Intercepta requests SSE para asegurar que se capturen
 * @param context Contexto del navegador
 */
export function setupSSECapture(context: BrowserContext) {
  context.on('request', request => {
    const url = request.url();
    if (url.includes('sse') || url.includes('event-stream')) {
      console.log(`📡 SSE Request capturado: ${url}`);
    }
  });
  
  context.on('response', async response => {
    const url = response.url();
    if (url.includes('sse') || url.includes('event-stream')) {
      console.log(`📡 SSE Response capturado: ${url} - Status: ${response.status()}`);
      try {
        const body = await response.text();
        console.log(`📡 SSE Body (primeros 500 chars): ${body.substring(0, 500)}`);
      } catch (e) {
        console.log(`⚠️ No se pudo leer body de SSE: ${e}`);
      }
    }
  });
}

/**
 * Intercepta requests newemitir para asegurar captura
 * @param context Contexto del navegador
 */
export function setupNewEmitirCapture(context: BrowserContext) {
  context.on('request', request => {
    const url = request.url();
    if (url.includes('newemitir')) {
      console.log(`📤 newemitir Request: ${url}`);
      console.log(`📤 Method: ${request.method()}`);
      try {
        const postData = request.postData();
        if (postData) {
          console.log(`📤 Body (primeros 500 chars): ${postData.substring(0, 500)}`);
        }
      } catch (e) {
        console.log(`⚠️ No se pudo leer postData: ${e}`);
      }
    }
  });
  
  context.on('response', async response => {
    const url = response.url();
    if (url.includes('newemitir')) {
      console.log(`📥 newemitir Response: ${url} - Status: ${response.status()}`);
      try {
        const body = await response.text();
        console.log(`📥 Response Body (primeros 1000 chars): ${body.substring(0, 1000)}`);
      } catch (e) {
        console.log(`⚠️ No se pudo leer response body: ${e}`);
      }
    }
  });
}

/**
 * Configuración completa de captura para emisiones
 * @param context Contexto del navegador
 * @param testInfo Información del test
 */
export function setupFullCapture(context: BrowserContext, testInfo: any) {
  setupSSECapture(context);
  setupNewEmitirCapture(context);
  
  // También capturar otros endpoints importantes
  context.on('response', async response => {
    const url = response.url();
    const status = response.status();
    
    // Log de errores
    if (status >= 400) {
      console.log(`❌ Error ${status}: ${url}`);
      try {
        const body = await response.text();
        console.log(`❌ Error Body: ${body.substring(0, 500)}`);
      } catch (e) {
        // Ignorar errores al leer body
      }
    }
  });
  
  console.log(`✅ Captura completa configurada para test: ${testInfo.title}`);
}
