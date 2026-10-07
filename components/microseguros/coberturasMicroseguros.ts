import { Page, Locator } from "@playwright/test";

export default class CoberturasMicroseguros {
    readonly page: Page;
    readonly codigoPostalInput: Locator;
    readonly provinciaSearchbox: Locator;
    readonly localidadSearchbox: Locator;

    constructor(page: Page) {
        this.page = page;
        this.codigoPostalInput = page.getByRole('textbox', { name: 'Código postal' });
        this.provinciaSearchbox = page.getByRole('searchbox', { name: 'Provincia' });
        this.localidadSearchbox = page.getByRole('searchbox', { name: 'Localidad' });
    }

    coberturaCheckbox(numeroCobertura: string): Locator {
        return this.page.locator(`[id="${numeroCobertura}"]`);
    }
}
