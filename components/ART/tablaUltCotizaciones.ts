import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";
import CommonButtons from "../commonButtons";


export default class TablaUltCotizaciones {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly filterBox : Locator;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.filterBox = page.getByRole('searchbox', { name: 'Producto' });

    }

    public selectARTOption(): Locator {
        return this.page.getByRole("option", { name: "ART", exact: true });
    }

    
}