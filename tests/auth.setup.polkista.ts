/// <reference types="node" />
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

// Ruta para el archivo de autenticación de usuario polkista
const authDir = '.auth';
const authFile = path.join(authDir, 'userPolkista.json');

/**
 * Script de setup MANUAL para usuario polkista con Google.
 * 
 * EJECUTAR CON: npx ts-node tests/auth.setup.polkista.ts
 * 
 * Este script usa Chrome real (no Chromium de Playwright) para evitar
 * la detección de Google "This browser or app may not be secure".
 */
async function setupPolkistaAuth() {
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
    console.log('=== SETUP DE USUARIO POLKISTA ===');
    console.log('======================================================================\n');

    // Lanzar Chrome REAL (no Chromium) con canal 'chrome'
    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome', // Usa Chrome instalado en el sistema
        args: [
            '--disable-blink-features=AutomationControlled',
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
    console.log('3. Completá el login con la cuenta POLKISTA (con códigos, sin ser master)');
    console.log('4. Esperá a llegar al dashboard');
    console.log('');
    console.log('Una vez en el dashboard, VOLVÉ A ESTA TERMINAL y presioná ENTER.');
    console.log('======================================================================\n');

    // Esperar a que el usuario presione Enter
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

setupPolkistaAuth().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
