import { Page, Locator } from "@playwright/test";

export default class CotizacionTitular {
    readonly page: Page;
    readonly situacionImpositivaCombobox: Locator;
    readonly codigoPostalInput: Locator;
    readonly noSeCodigoLink: Locator;
    readonly provinciaCombobox: Locator;
    readonly localidadCombobox: Locator;

    constructor(page: Page) {
        this.page = page;
        this.situacionImpositivaCombobox = page.locator('#dependant_situacionImpositiva');
        this.codigoPostalInput = page.locator('#number_codigoPostal');
        this.noSeCodigoLink = page.getByText('No sé mi código');
        this.provinciaCombobox = page.locator('[id*="provincia"]').locator('input').first();
        this.localidadCombobox = page.locator('#select_codigosLocalidad');
    }

    getLocalidadOption(localidad: string): Locator {
        return this.page.getByRole('option', { name: localidad });
    }

    async ingresarCodigoPostal(codigo: string) {
        await this.codigoPostalInput.fill(codigo);
    }
    getSituacionImpositivaOption(situacionImpositiva: string): Locator {
        return this.page.getByRole('option' , { name: situacionImpositiva, exact: true });
    }
}
