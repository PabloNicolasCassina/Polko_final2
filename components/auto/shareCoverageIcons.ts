import { Page, Locator } from "@playwright/test";

/**
 * Locators del ShareIcon en resultados de cotización automotor (POL-2786).
 * Table/card: share solo si automotor && !isExtraCoverage (table también !isOutStandard).
 * En la UI actual el SVG expone botón accesible "Compartir cobertura".
 */
export default class ShareCoverageIcons {
    readonly page: Page;
    readonly shareIcons: Locator;
    readonly shareButtons: Locator;
    readonly emitirButtons: Locator;
    readonly solicitarButtons: Locator;

    constructor(page: Page) {
        this.page = page;
        this.shareButtons = page.getByRole("button", { name: /Compartir cobertura/i });
        this.shareIcons = page.locator(".response__tab__shareIcon").or(this.shareButtons);
        this.emitirButtons = page.getByRole("button", { name: /^Emitir$/i });
        this.solicitarButtons = page.getByRole("button", { name: /^Solicitar$/i });
    }

    shareInRow(rowText: string | RegExp): Locator {
        return this.page
            .locator(".ctrow, [class*='Coverage'], [class*='coverage']")
            .filter({ hasText: rowText })
            .getByRole("button", { name: /Compartir cobertura/i });
    }
}
