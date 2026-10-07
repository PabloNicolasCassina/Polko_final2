import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";

export default class CotizacionTablaHogar {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly descuentoBar: Locator;
    readonly descuentoBar20: Locator;
    readonly incendioText: Locator;
    readonly cotizacionErrorText: Locator;
    readonly rBtnBici: Locator;
    readonly rBtnNotebook: Locator;
    readonly rBtnTablet: Locator;
    readonly rBtnVarios: Locator;
    readonly rBtnMascotas: Locator;
    readonly rcLinderosText: Locator;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.descuentoBar = page.locator('div').filter({ hasText: /^0$/ }).first();
        this.descuentoBar20 = page.getByText("20%");
        this.incendioText = page.getByText("Incendio Edificio");
        this.rBtnBici = page.locator('[id="48"]');
        this.rBtnNotebook = page.locator('[id="36"]');
        this.rBtnTablet = page.locator('[id="37"]');
        this.rBtnVarios = page.locator('[id="26"]');
        this.rBtnMascotas = page.locator('[id="43"]');
        this.cotizacionErrorText = page.locator('.errorModal__icon');
        this.rcLinderosText = page.getByText(/Responsabilidad Civil a Consecuencia de Incendio|RC Linderos|Linderos/i).first();
    }

    public getInputByHogarLabel(inputName: string): Locator {
        const labelParagraph = this.page.locator(`.mantine-Grid-col:has-text("${inputName}")`);
        const inputLocator = labelParagraph.locator('+ .mantine-Grid-col').getByRole('textbox');
        return inputLocator;
    }

    public async getValorCoberturaTabla(): Promise<string | null> {
        const coberturaText = await this.page.getByText('Cuota Mensual: $').textContent();
        console.log("Texto cobertura es: " + coberturaText);

        if (coberturaText === null) {
            console.log("No se pudo obtener el valor de la cobertura");
            return null;
        }

        const partesDelTexto = coberturaText.split('$');
        const valorSucio = (partesDelTexto[1] || '').trim();
        const match = valorSucio.match(/^[\d.,]+/);

        if (match && match[0]) {
            const valorLimpio = match[0];
            console.log("Valor cobertura es: " + valorLimpio);
            return valorLimpio;
        }

        console.error(`No se pudo extraer el valor numérico de: "${valorSucio}"`);
        return null;
    }
}
