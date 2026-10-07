import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionInspeccion {
    readonly page: Page;
    readonly inspecciondpzone: Locator;
    readonly imgInspeccionObjVarios: Locator;
    readonly imgInspeccionBici: Locator;
    readonly etiquetaImg:Locator;
    readonly descObjVariosInput: Locator;
    readonly montoObjVariosInput: Locator;
    readonly dropzoneObjVarios: Locator;
    readonly descBiciInput: Locator;
    readonly montoBiciInput: Locator;
    readonly dropzoneBici: Locator;




    constructor(page: Page) {
        this.page = page;
        this.inspecciondpzone = page.locator('[id="file_inspeccionPrevia.archivos"] input[type="file"]');
        this.etiquetaImg = page.getByText('Etiqueta');
        this.imgInspeccionObjVarios = page.getByRole('img', { name: 'preview_file' });
        this.imgInspeccionBici = page.getByRole('img', { name: 'preview_file' }).nth(1);
        this.descObjVariosInput = page.locator('[id="detalleEquipoElectronico[0].descripcionElectronico"]');
        this.montoObjVariosInput = page.locator('[name="detalleEquipoElectronico[0]\\.sumaAseguradaElectronico"]');
        this.descBiciInput = page.locator('[id="detalleBicicletas[0].descripcionBicicletas"]');
        this.montoBiciInput = page.locator('[name="detalleBicicletas[0]\\.sumaAseguradaBicicletas"]');
        this.dropzoneObjVarios = page.locator('.mantine-Dropzone-root input[type="file"]').first();
        this.dropzoneBici = page.locator('.mantine-Dropzone-root input[type="file"]').nth(1);

    }

}