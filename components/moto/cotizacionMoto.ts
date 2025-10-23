import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";
import { get } from "http";


export default class CotizacionMoto {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly marcaSelector: Locator;
    readonly añoSelector: Locator;
    readonly versionSelector: Locator;
    readonly ceroKmSelector: Locator;
    readonly accesoriosSelector: Locator;




    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.marcaSelector = page.getByRole('searchbox', { name: 'Marca' });
        this.añoSelector = page.getByRole('searchbox', { name: 'Año' });
        this.versionSelector = page.getByRole('searchbox', { name: 'Versión' });
        this.ceroKmSelector = page.getByRole('searchbox', { name: '¿0 Km?' });
        this.accesoriosSelector = page.getByRole('textbox', { name: 'Accesorios' });



    }

    public getMarcaLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getAnioLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getVersionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

}