import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionFinal {
    readonly page: Page;
    readonly descargaBtn: Locator;
    readonly nroTramiteText: Locator;
    




    constructor(page: Page) {
        this.page = page;
        this.descargaBtn = page.getByRole('button', { name: 'DESCARGAR' });
        this.nroTramiteText = page.getByText('Número de trámite');
        
    }

}