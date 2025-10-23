import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";
import CommonButtons from "../commonButtons";


export default class CotizacionPersona {
    readonly page: Page;
    readonly buttons: CommonButtons;

    readonly tipoPersona: Locator;
    readonly sitImpositiva: Locator;
    readonly codPostal: Locator;
    readonly provincia: Locator;
    readonly localidad: Locator;





    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.tipoPersona = page.getByRole('searchbox', { name: 'Tipo de persona' })
        this.sitImpositiva = page.getByRole('searchbox', { name: 'Situación impositiva' })
        this.codPostal = page.getByRole('textbox', { name: 'Código postal' })
        this.provincia = page.locator('#select_idProvincia');
        this.localidad = page.getByRole('searchbox', { name: 'Localidad' })
    }

    public getTipoPersonaLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getSitImpositivaLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getProvinciaLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option});
    }

    public getLocalidadLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option });
    }
}