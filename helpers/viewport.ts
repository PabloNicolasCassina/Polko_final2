import type { Locator, Page } from "@playwright/test";

/** Breakpoint del cotizador Auto/Moto (`QuotationMobileSidebar`) y filtros de Mi cartera. */
export const COMPACT_VIEWPORT_MAX_WIDTH = 1024;

/** Breakpoint legacy de `UserContext.isMobile` (p. ej. tarjetas de coberturas AP). */
export const MOBILE_VIEWPORT_MAX_WIDTH = 480;

function viewportWidth(page: Page): number {
    return page.viewportSize()?.width ?? Number.MAX_SAFE_INTEGER;
}

export function isCompactViewport(page: Page): boolean {
    return viewportWidth(page) <= COMPACT_VIEWPORT_MAX_WIDTH;
}

export function isMobileViewport(page: Page): boolean {
    return viewportWidth(page) <= MOBILE_VIEWPORT_MAX_WIDTH;
}

export function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Click que tolera elementos fuera del viewport (slides de carrusel embla en mobile):
 * si el elemento no entra en pantalla, dispara el click por DOM.
 */
export async function clickEvenIfOffscreen(page: Page, locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const box = await locator.boundingBox();
    const size = page.viewportSize();
    const inViewport =
        !!box &&
        !!size &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= size.width &&
        box.y + box.height <= size.height;
    if (inViewport) {
        await locator.click();
    } else {
        await locator.dispatchEvent("click");
    }
}
