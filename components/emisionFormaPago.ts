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
    readonly inicioVigencia: Locator;



    constructor(page: Page) {
        this.page = page;
        this.formaPagoSelect = page.locator('[id="select_infoDePago.formaDePago"]').or(page.getByRole('searchbox', { name: 'Forma De Pago' }));
        this.CBU = page.locator('[id="input_infoDePago.numeroCbu"]').or(page.locator('input[name="infoDePago.numeroCbu"]'));
        this.marcaTarjeta = page.locator('[id="input_infoDePago.marcaTarjeta"]').or(page.locator('[id="select_infoDePago.marcaTarjeta"]')).or(page.getByRole('searchbox', { name: 'Marca de la tarjeta' }));
        this.marcaTarjetaMoto = page.getByRole('searchbox', { name: 'Marca de la tarjeta' });
        this.nroTarjeta = page.locator('[id="input_infoDePago.numeroTarjeta"]').or(page.locator('[id="infoDePago.numeroTarjeta"]'));
        this.vencimientoTarjetaMes = page.getByRole('textbox', { name: 'MM', exact: true });
        this.vencimientoTarjetaAnio = page.getByRole('textbox', { name: 'YY', exact: true });
        this.inicioVigencia = page.getByRole('textbox', { name: 'dd/mm/yyyy' });


    }

    public async selectPaymentOption(paymentOption: string) {
        // Buscar el searchbox de Forma de Pago específicamente
        const formaPagoSearchbox = this.page.getByRole('searchbox', { name: 'Forma De Pago' });

        // Verificar si el searchbox existe y está deshabilitado
        const searchboxVisible = await formaPagoSearchbox.isVisible().catch(() => false);

        if (searchboxVisible) {
            const isDisabled = await formaPagoSearchbox.isDisabled().catch(() => false);

            if (isDisabled) {
                // El campo está deshabilitado, obtener el valor actual y saltearlo
                const currentValue = await formaPagoSearchbox.inputValue().catch(() => 'desconocido');
                console.log(`Forma de pago ya preseleccionada (campo deshabilitado): ${currentValue}`);
                return;
            }
        }

        // El campo está habilitado, proceder con la selección. Para algunas
        // compañías (ej. ATM) el campo pasa a deshabilitado de forma
        // asincrónica luego de precargar un único valor posible, justo entre
        // el chequeo anterior y este click, por lo que un timeout corto +
        // fallback evita quedarnos reintentando el click por 30s hasta que
        // se agote el timeout del test.
        try {
            await this.formaPagoSelect.click({ timeout: 5000 });
            await this.page.getByRole('option', { name: paymentOption }).click();
            console.log(`Seleccionada forma de pago: ${paymentOption}`);
        } catch (error) {
            const isDisabledNow = await this.formaPagoSelect.isDisabled().catch(() => false);
            if (isDisabledNow) {
                const currentValue = await this.formaPagoSelect.inputValue().catch(() => 'desconocido');
                console.log(`Forma de pago ya preseleccionada (campo deshabilitado luego de cargar): ${currentValue}`);
                return;
            }
            throw error;
        }
    }

    /**
     * Rellena los campos para Tarjeta de Crédito.
     */
    async fillTarjetaCredito(datosMoto: any) {
        const nroTarjeta = "4509953566233704"; // Datos de prueba
        const vencimientoMes = "11";
        const vencimientoAnio = "27";

        console.log("Rellenando datos de Tarjeta de Crédito (Moto)...");
        await this.marcaTarjeta.click();
        await this.page.getByRole('option', { name: 'Visa', exact: true }).click(); // Asume Visa
        await this.nroTarjeta.fill(nroTarjeta);

        // Vencimiento: en moto ATM el formulario solo pide marca + número
        // (confirmado en vivo); en otras compañías (Sancor auto/moto) aparecen
        // MM/YY. Rellenar solo si el textbox existe — si no, el fill colgaba 30s.
        if (datosMoto?.atm || datosMoto?.sancor) {
            const mesVisible = await this.vencimientoTarjetaMes.isVisible().catch(() => false);
            if (mesVisible) {
                await this.vencimientoTarjetaMes.fill(vencimientoMes);
                await this.vencimientoTarjetaAnio.fill(vencimientoAnio);
            }
        }
    }

    /**
     * Rellena el campo de CBU.
     */
    async fillCBU(cbu?: string) {
        const nroCBU = cbu || "0113941911100007976873";
        console.log("Rellenando CBU...");
        await this.CBU.fill(nroCBU);
    }

    /**
     * Simula apertura de teclado mobile (POL-2874): achica viewport y dispara resize.
     */
    async simulateMobileKeyboardResize(width = 390, shrunkHeight = 500): Promise<void> {
        await this.page.setViewportSize({ width, height: shrunkHeight });
        await this.page.evaluate(() => window.dispatchEvent(new Event("resize")));
    }

    async readPagoFieldValues(): Promise<{ formaDePago: string | null; marcaTarjeta: string | null; numeroTarjeta: string | null; numeroCbu: string | null }> {
        return this.page.evaluate(() => {
            const val = (sel: string) => {
                const el = document.querySelector(sel) as HTMLInputElement | null;
                return el && "value" in el ? el.value : null;
            };
            return {
                formaDePago: val('[id="select_infoDePago.formaDePago"]'),
                marcaTarjeta: val('[id="select_infoDePago.marcaTarjeta"]') ?? val('[id="input_infoDePago.marcaTarjeta"]'),
                numeroTarjeta: val('[id="input_infoDePago.numeroTarjeta"]') ?? val('[id="infoDePago.numeroTarjeta"]'),
                numeroCbu: val('[id="input_infoDePago.numeroCbu"]') ?? val('input[name="infoDePago.numeroCbu"]'),
            };
        });
    }


}