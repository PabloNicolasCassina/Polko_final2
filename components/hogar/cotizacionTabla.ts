import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";
import { get } from "http";


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

        this.cotizacionErrorText = page.locator('.errorModal__icon');


    }

    public getInputByHogarLabel(inputName: string): Locator {
        const labelParagraph = this.page.locator(`.mantine-Grid-col:has-text("${inputName}")`);
        const inputLocator = labelParagraph.locator('+ .mantine-Grid-col').getByRole('textbox');
        return inputLocator;
    }


    public async getValorCoberturaTabla(): Promise<string | null> {
        const coberturaText = await this.page.getByText('Cuota Mensual: $').textContent();
        console.log("Texto cobertura es: " + coberturaText); // "Cuota Mensual: $73.758"

        if (coberturaText === null) {
            console.log("No se pudo obtener el valor de la cobertura");
            return null;
        }

        // --- CORRECCIÓN AQUÍ ---
        // 1. Divide el string usando '$' como separador
        // Esto crea un array: ["Cuota Mensual: ", "73.758"]
        const partesDelTexto = coberturaText.split('$');

        // 2. Toma la segunda parte (el número) y limpia espacios
        // Si partesDelTexto[1] no existe, usa un string vacío para evitar errores
        const valorSucio = (partesDelTexto[1] || '').trim(); // valorSucio ahora es "73.758"
        // --- FIN CORRECCIÓN ---

        // 3. Tu RegExp ahora SÍ funciona, porque valorSucio empieza con un número
        const match = valorSucio.match(/^[\d.,]+/);

        if (match && match[0]) {
            const valorLimpio = match[0]; // ej: "73.758"
            console.log("Valor cobertura es: " + valorLimpio);
            return valorLimpio;
        }

        console.error(`No se pudo extraer el valor numérico de: "${valorSucio}"`);
        return null;
    }



}