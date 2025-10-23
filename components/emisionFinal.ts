import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionFinal {
    readonly page: Page;
    readonly descargaBtn: Locator;
    readonly emisionExitosaText: Locator;
    readonly errorDocumentacion: Locator;
    readonly errorEmision: Locator;
    




    constructor(page: Page) {
        this.page = page;
        this.descargaBtn = page.getByRole('button', { name: 'DESCARGAR' });
        this.emisionExitosaText = page.getByText('¡Felicitaciones, la operación');
        this.errorDocumentacion = page.getByText("Error al descargar");
        this.errorEmision = page.getByText("Hubo un problema al emitir");
        
    }

}