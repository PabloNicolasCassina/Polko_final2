import { Page, Locator } from "@playwright/test";

export default class CotizacionCobertura {
    readonly page: Page;
    readonly radioPorDia: Locator;
    readonly radioMasTreintaDias: Locator;

    constructor(page: Page) {
        this.page = page;
        this.radioPorDia = page.getByRole('radio', { name: 'Por día Cobertura flexible' });
        this.radioMasTreintaDias = page.getByRole('radio', { name: '+30 días Cobertura extendida' });
    }

    async seleccionarPorDia() {
        await this.radioPorDia.click();
    }

    async seleccionarMasTreintaDias() {
        await this.radioMasTreintaDias.click();
    }
}
