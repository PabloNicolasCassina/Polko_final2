import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionInspeccion {
    readonly page: Page;
    readonly inspecciondpzone: Locator;
    readonly imgInspeccion: Locator;
    readonly etiquetaImg:Locator;
    readonly etiquetaOption: Locator;




    constructor(page: Page) {
        this.page = page;
        this.inspecciondpzone = page.locator('[id="file_inspeccionPrevia.archivos"] input[type="file"]');
        this.etiquetaImg = page.getByText('Etiqueta');
        this.imgInspeccion = page.getByRole('img', { name: 'preview_file' });
        this.etiquetaOption = page.getByRole('menuitem', { name: 'FRENTE' });

    }

}