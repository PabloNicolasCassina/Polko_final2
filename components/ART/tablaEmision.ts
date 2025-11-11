import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";
import CommonButtons from "../commonButtons";


export default class TablaEmision {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly regimenGeneral: Locator;
    readonly regimenEspecial: Locator;
    readonly masBtn: Locator;
    readonly menosBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.regimenGeneral = this.page.getByText('Regimen general');
        this.regimenEspecial = this.page.getByText('Regimen especial');
        this.masBtn = page.getByRole('button', { name: '+' }).first();
        this.menosBtn = page.getByRole('button', { name: '-' }).first();

    }

    

    
}