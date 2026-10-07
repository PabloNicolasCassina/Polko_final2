import { type Page } from '@playwright/test';

/**
 * Registra listeners en la página para fallar el test INMEDIATAMENTE cuando
 * ocurre un error de React (pageerror o el overlay "Compiled with problems").
 *
 * - page.on('pageerror') captura "Maximum update depth exceeded" y similares
 *   antes de que el overlay se renderice. Playwright propaga el throw al test
 *   en el próximo await, fallándolo con mensaje claro.
 *
 * Uso: llamar en el constructor del Page Object (es síncrono).
 *   setupReactErrorGuard(page);
 */
export function setupReactErrorGuard(page: Page): void {
    page.on('pageerror', err => {
        // Playwright captura este throw y falla el test en el próximo await
        throw new Error(`[React error] ${err.message}`);
    });
}
