/// <reference types="node" />
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

// Ruta para el archivo de autenticación de usuario orgánico
const authDir = '.auth';
const authFile = path.join(authDir, 'userOrganic.json');

/**
 * Script de setup MANUAL para usuario orgánico con Google.
 * 
 * EJECUTAR CON: npx ts-node tests/auth.setup.organic.ts
 * 
 * Este script usa Chrome real (no Chromium de Playwright) para evitar
 * la detección de Google "This browser or app may not be secure".
 */
async function setupOrganicAuth() {
    // Verifica si el archivo ya existe
    if (fs.existsSync(authFile)) {
        console.log(`El archivo ${authFile} ya existe.`);
        console.log('Si querés regenerarlo, eliminá el archivo y ejecutá de nuevo:');
        console.log(`  rm ${authFile}`);
        return;
    }

    // Crear directorio si no existe
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    console.log('\n======================================================================');
    console.log('=== SETUP DE USUARIO ORGÁNICO ===');
    console.log('======================================================================\n');

    // Lanzar Chrome REAL (no Chromium) con canal 'chrome'
    // Esto evita la detección de automatización de Google
    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome', // Usa Chrome instalado en el sistema
        args: [
            '--disable-blink-features=AutomationControlled', // Oculta flag de automatización
        ],
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // Navegar a la landing
    await page.goto("http://localhost:3000/", { waitUntil: 'domcontentloaded' });

    console.log('Navegador abierto. Ahora:');
    console.log('');
    console.log('1. Hacé click en INGRESAR');
    console.log('2. Elegí "Ingresar con Google"');
    console.log('3. Completá el login con la cuenta ORGÁNICA');
    console.log('4. Esperá a llegar al dashboard');
    console.log('');
    console.log('Una vez en el dashboard, VOLVÉ A ESTA TERMINAL y presioná ENTER.');
    console.log('======================================================================\n');

    // Esperar a que el usuario presione Enter en la terminal
    await new Promise<void>((resolve) => {
        process.stdin.once('data', () => {
            resolve();
        });
    });

    // Verificar URL
    const currentUrl = page.url();
    if (currentUrl.includes('/u/dashboard') || currentUrl.includes('/u/')) {
        console.log('✅ URL verificada correctamente:', currentUrl);
    } else {
        console.warn('⚠️  URL actual:', currentUrl);
        console.warn('No parece ser el dashboard, pero se guardará el estado de todas formas.');
    }

    // Guardar estado
    await context.storageState({ path: authFile });

    console.log(`\n✅ Estado guardado en: ${authFile}`);
    console.log('Podés cerrar el navegador.');

    await browser.close();
    process.exit(0);
}

setupOrganicAuth().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
