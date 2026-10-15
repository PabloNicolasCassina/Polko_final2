/// <reference types="node" />
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

// Ruta para el archivo de autenticación de usuario admin
const authDir = '.auth';
const authFile = path.join(authDir, 'userAdmin.json');

// Build estático de admin (se sirve interceptando localhost:3000, sin levantar su dev server)
const adminBuildDir = path.resolve(process.cwd(), '..', 'admin', 'build');

/**
 * Script de setup MANUAL para usuario admin (consola de administración).
 *
 * EJECUTAR CON: npx ts-node tests/auth.setup.admin.ts
 *
 * Requiere el build de admin apuntando a localhost:3000 (Auth0 solo acepta ese callback) y con
 * REACT_APP_AUTH0_CACHE=localstorage: admin guarda el token en memoria por defecto y Auth0 no
 * permite re-loguear en silencio desde localhost (consent_required), así que sin eso el storageState
 * no alcanza. Con Node 16 (react-scripts 4 no buildea en Node 17+):
 *   cd ../admin && nvm use 16.2.0 && REACT_APP_AUTH0_CACHE=localstorage REACT_APP_URL=http://localhost:3000/ REACT_APP_CALLBACK_URL=http://localhost:3000/callback npm run build
 *
 * No hace falta levantar admin ni bajar frontend_general: el contexto intercepta
 * http://localhost:3000/** y responde con los archivos del build. Las llamadas a los
 * backends (:8080, :8082, Hasura) pasan directo.
 *
 * Este script usa Chrome real (no Chromium de Playwright) para evitar
 * la detección de Google "This browser or app may not be secure".
 */
function tieneTokenAuth0(state: { origins?: { origin: string; localStorage: { name: string }[] }[] }): boolean {
    return (state.origins ?? []).some(
        (o) => o.origin === 'http://localhost:3000' && o.localStorage.some((item) => item.name.startsWith('@@auth0spajs@@')),
    );
}

function authFileValido(): boolean {
    if (!fs.existsSync(authFile)) return false;
    try {
        const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
        return tieneTokenAuth0(state);
    } catch {
        return false;
    }
}

async function setupAdminAuth() {
    // Verifica si el archivo ya existe (sin token de Auth0 en localStorage se regenera)
    if (authFileValido()) {
        console.log(`El archivo ${authFile} ya existe.`);
        console.log('Si querés regenerarlo, eliminá el archivo y ejecutá de nuevo:');
        console.log(`  rm ${authFile}`);
        return;
    }

    // Verificar que exista el build de admin
    if (!fs.existsSync(path.join(adminBuildDir, 'index.html'))) {
        console.error(`❌ No se encontró el build de admin en ${adminBuildDir}`);
        console.error('Generalo con:');
        console.error('  cd ../admin && nvm use 16.2.0 && REACT_APP_AUTH0_CACHE=localstorage REACT_APP_URL=http://localhost:3000/ REACT_APP_CALLBACK_URL=http://localhost:3000/callback npm run build');
        process.exit(1);
    }

    // Crear directorio si no existe
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    console.log('\n======================================================================');
    console.log('=== SETUP DE USUARIO ADMIN ===');
    console.log('======================================================================\n');

    // Lanzar Chrome REAL (no Chromium) con canal 'chrome'
    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome', // Usa Chrome instalado en el sistema
        args: [
            '--disable-blink-features=AutomationControlled',
            // El HTML servido por route.fulfill queda en address space "unknown" y Chrome bloquea los fetch a localhost:8080/8082
            '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults',
        ],
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        serviceWorkers: 'block',
    });

    // Servir el build de admin en localhost:3000 (rutas de la SPA → index.html)
    await context.route('http://localhost:3000/**', async (route) => {
        const { pathname } = new URL(route.request().url());
        const archivo = path.join(adminBuildDir, decodeURIComponent(pathname));
        const esArchivo = archivo.startsWith(adminBuildDir) && fs.existsSync(archivo) && fs.statSync(archivo).isFile();
        await route.fulfill({ path: esArchivo ? archivo : path.join(adminBuildDir, 'index.html') });
    });

    const page = await context.newPage();

    // Navegar a la consola de admin
    await page.goto("http://localhost:3000/", { waitUntil: 'domcontentloaded' });

    console.log('Navegador abierto con la consola de ADMIN. Ahora:');
    console.log('');
    console.log('1. Hacé click en INGRESAR');
    console.log('2. Completá el login con la cuenta ADMIN');
    console.log('3. Esperá a volver a la consola de admin ya logueado');
    console.log('   (si queda trabado en /callback, no hace falta F5: el script recarga solo)');
    console.log('');
    console.log('Una vez logueado en admin (o trabado en /callback), VOLVÉ A ESTA TERMINAL y presioná ENTER.');
    console.log('======================================================================\n');

    // Esperar a que el usuario presione Enter
    await new Promise<void>((resolve) => {
        process.stdin.once('data', () => {
            resolve();
        });
    });

    // Admin a veces queda trabado en /callback?code=...; con la cookie de Auth0 ya creada, recargar entra
    if (page.url().includes('/callback')) {
        console.log('Quedó en /callback, recargando...');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForURL((url) => !url.pathname.startsWith('/callback'), { timeout: 30000 }).catch(() => {});
    }

    // Verificar URL
    const currentUrl = page.url();
    if (currentUrl.startsWith('http://localhost:3000/') && !currentUrl.includes('/callback')) {
        console.log('✅ URL verificada correctamente:', currentUrl);
    } else {
        console.warn('⚠️  URL actual:', currentUrl);
        console.warn('No parece ser la consola de admin, pero se guardará el estado de todas formas.');
    }

    // Guardar estado
    const state = await context.storageState({ path: authFile });

    console.log(`\n✅ Estado guardado en: ${authFile}`);
    if (!tieneTokenAuth0(state)) {
        console.warn('⚠️  No quedó el token de Auth0 en localStorage: los tests no van a poder entrar a admin.');
        console.warn('Revisá que el build de admin se haya hecho con REACT_APP_AUTH0_CACHE=localstorage.');
    }
    console.log('Podés cerrar el navegador.');

    await browser.close();
    process.exit(0);
}

setupAdminAuth().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
