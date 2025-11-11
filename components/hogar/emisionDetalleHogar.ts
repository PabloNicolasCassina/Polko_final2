import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionDetalleHogar {
    readonly page: Page;

    readonly descObjVariosInput: Locator;
    readonly montoObjVariosInput: Locator;
    readonly dropzoneObjVarios: Locator;
    readonly descBiciInput: Locator;
    readonly montoBiciInput: Locator;
    readonly dropzoneBici: Locator;




    constructor(page: Page) {
        this.page = page;
        this.descObjVariosInput = page.locator('[id="detalleEquipoElectronico[0].descripcionElectronico"]');
        this.montoObjVariosInput = page.locator('[name="detalleEquipoElectronico[0]\\.sumaAseguradaElectronico"]');
        this.descBiciInput = page.locator('[id="detalleBicicletas[0].descripcionBicicletas"]');
        this.montoBiciInput = page.locator('[name="detalleBicicletas[0]\\.sumaAseguradaBicicletas"]');
        this.dropzoneObjVarios = page.locator('.mantine-Dropzone-root').first();
        this.dropzoneBici = page.locator('.mantine-Dropzone-root').nth(1);
    }

}






