import { BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

/**
 * Helper para cargar el estado de autenticación de userPre.json
 * en tests de testsprite
 * 
 * USO:
 *   import { loadAuthState } from '../helpers/testspriteAuth';
 *   
 *   test('mi test', async ({ page, context }) => {
 *     await loadAuthState(context, page);
 *     // Ahora estás autenticado y puedes navegar directamente
 *     await page.goto('http://localhost:3000/u/dashboard');
 *   });
 */
export async function loadAuthState(
  context: BrowserContext,
  page: Page
): Promise<void> {
  const authFile = path.join(__dirname, '..', '.auth', 'userPre.json');
  
  if (!fs.existsSync(authFile)) {
    throw new Error(
      `El archivo de autenticación no existe: ${authFile}\n` +
      `Por favor, ejecuta primero: npx playwright test tests/auth.setup.pre.ts --project=setup`
    );
  }

  // Leer el archivo de autenticación
  const authState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));

  // Cargar cookies en el contexto
  if (authState.cookies) {
    await context.addCookies(authState.cookies);
  }

  // Cargar localStorage en la página
  if (authState.origins && authState.origins.length > 0) {
    // Buscar el origen de localhost:3000
    const localhostOrigin = authState.origins.find(
      (origin: any) => origin.origin === 'http://localhost:3000'
    );

    if (localhostOrigin && localhostOrigin.localStorage) {
      // Navegar a la página primero para poder establecer localStorage
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
      
      // Establecer cada item de localStorage
      for (const item of localhostOrigin.localStorage) {
        await page.evaluate(
          ([key, value]) => {
            localStorage.setItem(key, value);
          },
          [item.name, item.value]
        );
      }
    }
  }

  console.log('✅ Estado de autenticación cargado desde userPre.json');
}

/**
 * Helper alternativo: Cargar el estado de autenticación directamente
 * usando storageState de Playwright (método recomendado)
 * 
 * USO en playwright.config.ts:
 *   use: {
 *     storageState: path.join(__dirname, '.auth', 'userPre.json'),
 *   }
 * 
 * O en un test individual:
 *   test.use({
 *     storageState: path.join(__dirname, '../.auth/userPre.json'),
 *   });
 */
export function getAuthStatePath(): string {
  return path.join(__dirname, '..', '.auth', 'userPre.json');
}













