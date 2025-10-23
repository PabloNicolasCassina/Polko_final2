import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionFormaPago {
    readonly page: Page;

    readonly formaPagoSelect: Locator;
    readonly CBU: Locator;
    readonly marcaTarjeta: Locator;
    readonly marcaTarjetaMoto: Locator;
    readonly nroTarjeta: Locator;
    readonly vencimientoTarjetaMes: Locator;
    readonly vencimientoTarjetaAnio: Locator;



    constructor(page: Page) {
        this.page = page;
        this.formaPagoSelect = page.locator('[id="select_infoDePago.formaDePago"]');
        this.CBU = page.locator('[id="input_infoDePago.numeroCbu"]');
        this.marcaTarjeta = page.locator('[id="input_infoDePago.marcaTarjeta"]');
        this.marcaTarjetaMoto = page.getByRole('searchbox', { name: 'Marca de la tarjeta' });
        this.nroTarjeta = page.locator('[id="input_infoDePago.numeroTarjeta"]');
        this.vencimientoTarjetaMes = page.getByRole('textbox', { name: 'MM', exact: true });
        this.vencimientoTarjetaAnio = page.getByRole('textbox', { name: 'YY', exact: true });


    }

    public getFormaPago(auto: any): Locator {
        if (auto.zurich) {
            return this.page.getByRole('option', { name: auto.formaPagoZurich });
        } else {
            return this.page.getByRole('option', { name: auto.formaPago });
        }

    }


}