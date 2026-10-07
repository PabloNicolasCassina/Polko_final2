/// <reference types="node" />
import { test as setup } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import * as fs from 'fs';
import path from 'path';

const authDir = '.auth';
const authFile = path.join(authDir, 'sancorPortal.json');

const PORTAL_URL = 'https://portalcotizadorintermediarios.gruposancorseguros.com';
const AUTH0_DOMAIN = 'login.gruposancorseguros.com.ar';

setup('sancor portal authentication', async ({ page }) => {
  qase.ignore();
  if (fs.existsSync(authFile)) {
    console.log(`Sesión Sancor existente en ${authFile}. Saltando setup.`);
    return;
  }

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir);
  }

  const user = process.env.SANCOR_PORTAL_USER;
  const pass = process.env.SANCOR_PORTAL_PASS;

  await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded' });

  // Espera la redirección a Auth0
  await page.waitForURL(`**/${AUTH0_DOMAIN}/**`, { timeout: 10000 });
  console.log('Redirigido a Auth0 Sancor:', page.url());

  if (user && pass) {
    // Login automático con credenciales del .env
    await page.getByLabel(/email|usuario|identifier/i).fill(user);
    await page.getByRole('button', { name: /continuar|continue|siguiente|next/i }).click();

    await page.getByRole('textbox', { name: /password|contraseña/i }).fill(pass);
    await page.getByRole('button', { name: /continuar|continue|ingresar|log in/i }).click();

    console.log('Credenciales enviadas, esperando redirección al portal...');
  } else {
    console.log('\n======================================================================');
    console.log('=== CREDENCIALES NO ENCONTRADAS EN .env ===');
    console.log('Completá el login manualmente en la ventana del navegador.');
    console.log('Una vez en el portal Sancor, presioná "Resume" (▶️) en el inspector.');
    console.log('======================================================================\n');
    await page.pause();
  }

  // Espera volver al portal
  await page.waitForURL(`**/${new URL(PORTAL_URL).hostname}/**`, { timeout: 20000 });
  console.log('Login exitoso. Guardando sesión...');

  await page.context().storageState({ path: authFile });
  console.log(`Sesión guardada en: ${authFile}`);
});
