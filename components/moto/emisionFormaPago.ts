import { Page, Locator, expect } from "@playwright/test";

export default class EmisionFormaPagoMoto {
    readonly page: Page;
    readonly formaPagoSelect: Locator;
    readonly CBU: Locator;
    readonly marcaTarjeta: Locator;
    readonly nroTarjeta: Locator;
    readonly vencimientoTarjetaMes: Locator;
    readonly vencimientoTarjetaAnio: Locator;

    constructor(page: Page) {
        this.page = page;
        // Locators de Moto (parecen usar searchbox)
        this.formaPagoSelect = page.getByRole('searchbox', { name: 'Forma De Pago' });
        this.CBU = page.locator('input[name="infoDePago.numeroCbu"]');
        this.marcaTarjeta = page.getByRole('searchbox', { name: 'Marca de la tarjeta' });
        this.nroTarjeta = page.locator('[id="infoDePago.numeroTarjeta"]');
        this.vencimientoTarjetaMes = page.getByRole('textbox', { name: 'MM', exact: true });
        this.vencimientoTarjetaAnio = page.getByRole('textbox', { name: 'YY', exact: true });
    }

    /**
     * Selecciona la opción de pago primaria en el dropdown inicial.
     */
    public async selectPaymentOption(paymentOption: string) {
        await this.formaPagoSelect.click();
        await this.page.getByRole('option', { name: paymentOption }).click();
        console.log(`Seleccionada forma de pago Moto: ${paymentOption}`);
    }

    /**
     * Rellena los campos para Tarjeta de Crédito.
     */
    async fillTarjetaCredito(datosMoto: any) {
        const nroTarjeta = "4509953566233704"; // Datos de prueba
        const vencimientoMes = "11";
        const vencimientoAnio = "25";

        console.log("Rellenando datos de Tarjeta de Crédito (Moto)...");
        await this.marcaTarjeta.click();
        await this.page.getByRole('option', { name: 'Visa' }).click(); // Asume Visa
        await this.nroTarjeta.fill(nroTarjeta);

        // Lógica específica de ATM que tenías
        if (datosMoto.atm) {
            await this.vencimientoTarjetaMes.fill(vencimientoMes);
            await this.vencimientoTarjetaAnio.fill(vencimientoAnio);
        }
    }

    /**
     * Rellena el campo de CBU.
     */
    async fillCBU(cbu?: string) {
        const nroCBU = cbu || "0113941911100007976873";
        console.log("Rellenando CBU (Moto)...");
        await this.CBU.fill(nroCBU);
    }
}