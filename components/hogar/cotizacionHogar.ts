import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";
import { get } from "http";


export default class CotizacionVehiculo {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly tipoViviendaSelector: Locator;
    readonly tamanioViviendaSelector: Locator;
    readonly codigoPostalSelector: Locator;
    readonly localidadSelector: Locator;

    




    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.tipoViviendaSelector = page.getByRole('searchbox', { name: 'Tipo de vivienda' });
        this.tamanioViviendaSelector = page.getByRole('searchbox', { name: 'Tamaño de vivienda' });
        this.codigoPostalSelector = page.getByRole('textbox', { name: 'Código postal' });
        this.localidadSelector = page.getByRole('searchbox', { name: 'Localidad' });
        



    }

    public getOptionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option});
    }

}