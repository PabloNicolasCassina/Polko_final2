import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";
import CommonButtons from "../commonButtons";


export default class CotizacionEmpleador {
    readonly page: Page;
    readonly buttons: CommonButtons;

    readonly empleadorInput: Locator;
    readonly cuitInput: Locator;
    readonly f931Input: Locator;
    readonly chkContrato: Locator;





    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.empleadorInput = page.locator('#input_empleador');
        this.cuitInput = page.locator('#number_cuit');
        this.f931Input = page.locator('div:has-text("F.931 (opcional)")').locator('input[type="file"]');
        this.chkContrato = page.getByRole('checkbox', { name: '¿Tiene contrato vigente?*' });

    }

    
}