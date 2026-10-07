/// <reference types="node" />
import { test as setup, expect } from '@playwright/test';
import { qase } from 'playwright-qase-reporter';
import * as fs from 'fs';
import path from 'path'; // Es buena práctica importar path para manejar rutas

// Define la ruta al archivo de autenticación
// Se recomienda crear el directorio .auth si no existe
const authDir = '.auth';
const authFile = path.join(authDir, 'userPre.json');

setup('authentication - manual step required', async ({ page }) => {
  qase.ignore();
  // Verifica si el archivo de autenticación ya existe
  if (fs.existsSync(authFile)) {
    console.log(`El archivo de autenticación ya existe en ${authFile}. Saltando setup.`);
    // Puedes opcionalmente verificar si el estado aún es válido aquí
    // navegando a una página protegida y comprobando si funciona.
    return; // Salir del setup si el archivo existe
  }

  // Si el archivo no existe, proceder con el login manual y guardado

  // 1. Crear el directorio si no existe
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir);
  }

  // 2. Ir a la página de inicio
  await page.goto("http://localhost:3000/", { waitUntil: 'domcontentloaded' });

  // 3. Hacer clic en el botón inicial para ingresar
  // Apenas se vea el botón "INGRESAR", hacer click sin esperar a toda la carga de la página
  // El locator.click() espera automáticamente a que el elemento sea visible y clickeable
  // El locator.click() espera automáticamente a que el elemento sea visible y clickeable
  const ingresarButton = page.getByRole('button', { name: 'Ingresar' }).first();
  await ingresarButton.click({ timeout: 10000 });
  const facebookButton = page.getByRole('button', { name: 'Ingresar con Facebook' });
  await page.waitForTimeout(1000);
  await facebookButton.click();
  await page.getByRole('textbox', { name: 'Email or phone number' }).or(page.getByRole('textbox', { name: 'Email or mobile number' })).fill('hermanoscassina@hotmail.com');
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.POLKO_AUTH_PASSWORD ?? 'cambiar-password');
  await page.getByRole('button', { name: 'Log In' }).click();
  //await page.getByRole('button', { name: 'Usar otro método' }).click();
  //await page.getByRole('radio', { name: 'Correo electrónico Enviaremos' }).click();
  //await page.getByRole('button', { name: 'Continuar' }).click();


  // --- PAUSA PARA INTERVENCIÓN MANUAL ---
  console.log('\n======================================================================');
  console.log('=== SCRIPT PAUSADO ===');
  console.log('Por favor, completa el proceso de login (Facebook, Google, etc.) manualmente en la ventana del navegador.');
  console.log('Una vez que hayas sido redirigido a tu dashboard (o página principal post-login),');
  console.log('presiona el botón "Resume" (▶️) en el inspector de Playwright para continuar.');
  console.log('======================================================================\n');

  // 4. Pausar la ejecución. El script esperará aquí hasta que presiones "Resume".
  await page.pause();

  // --- EJECUCIÓN REANUDADA ---
  console.log('\nEjecución reanudada. Guardando estado de autenticación...');

  // 5. Opcional: Verificar que estás en la página correcta después del login manual
  //    Esto es una buena práctica para asegurarte de que el login fue exitoso
  //    antes de guardar el estado. Ajusta la URL según sea necesario.
  try {
    await expect(page).toHaveURL(/.*\/u\/dashboard/, { timeout: 10000 }); // Espera hasta 10s por la URL correcta
    console.log('Verificación de URL post-login exitosa.');
  } catch (error) {
    console.warn('ADVERTENCIA: No se pudo verificar la URL esperada post-login. Asegúrate de haber completado el login correctamente antes de reanudar.');
    console.warn('Se guardará el estado actual de todas formas.');
  }


  // 6. Guardar el estado de la sesión en el archivo especificado
  await page.context().storageState({ path: authFile });

  console.log(`¡Estado de autenticación guardado exitosamente en: ${authFile}!`);
  console.log('Puedes cerrar la ventana del navegador de setup si sigue abierta.');
  console.log('Las próximas ejecuciones de test usarán este estado guardado.');

});

