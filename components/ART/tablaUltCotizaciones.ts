import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";
import CommonButtons from "../commonButtons";


export default class TablaUltCotizaciones {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly filterBox: Locator;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.filterBox = page.getByRole('searchbox', { name: 'Producto' });

    }

    public selectARTOption(): Locator {
        return this.page.getByRole("option", { name: "ART", exact: true });
    }

    public getEmitirButtonByCompania(compania: string): Locator {
        // Convierte el nombre de la compañía al formato usado en CSS:
        // - Minúsculas
        // - Espacios reemplazados por guiones bajos
        // Ejemplo: "Federacion Patronal" -> "federacion_patronal", "SMG" -> "smg"
        const companiaFormatted = compania.toLowerCase().replace(/\s+/g, '_');
        return this.page
            .locator(`.QT__companies.QT__company--${companiaFormatted}`)
            .locator('xpath=ancestor::tr')
            .first()
            .getByRole("button", { name: "EMITIR" });
    }

    /**
     * Obtiene el locator del premio/precio de una compañía específica en la tabla de cotizaciones.
     * El formato del precio es "$XX.XXX" (ej: $43.111)
     */
    public getPremioByCompania(compania: string): Locator {
        const companiaFormatted = compania.toLowerCase().replace(/\s+/g, '_');
        return this.page
            .locator(`.QT__companies.QT__company--${companiaFormatted}`)
            .locator('xpath=ancestor::tr')
            .first()
            .locator('text=/\\$[\\d.,]+/').first();
    }
}