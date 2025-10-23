import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionFormaPago {
    readonly page: Page;

    readonly formaPagoSelect: Locator;
    readonly CBU: Locator;
    readonly marcaTarjeta: Locator;
    readonly nroTarjeta: Locator;
    readonly vencimientoTarjetaMes: Locator;
    readonly vencimientoTarjetaAnio: Locator;



    constructor(page: Page) {
        this.page = page;
        this.formaPagoSelect = page.getByRole('searchbox', { name: 'Forma De Pago' });
        this.CBU = page.locator('input[name="infoDePago.numeroCbu"]');
        this.marcaTarjeta = page.getByRole('searchbox', { name: 'Marca de la tarjeta' });
        this.nroTarjeta = page.locator('[id="infoDePago.numeroTarjeta"]');
        this.vencimientoTarjetaMes = page.getByRole('textbox', { name: 'MM', exact: true });
        this.vencimientoTarjetaAnio = page.getByRole('textbox', { name: 'YY', exact: true });


    }

    public getFormaPago(auto: any): Locator {
        return this.page.getByRole('option', { name: auto.formaPago })

    }


}