import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";

export default class CotizacionTablaMoto {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly descuentoBar: Locator;
    readonly descuentoBar15: Locator;
    readonly configAvanzadaBtn: Locator;
    readonly fechaVigencia: Locator;
    readonly sumaAsegurada: Locator;
    readonly usoVehiculo: Locator;
    readonly facturacion: Locator;
    readonly cantCuotas: Locator;
    readonly ajusteAutomatico: Locator;
    readonly cuotas: Locator;
    readonly infoBtn: Locator;
    readonly carritoBtn: Locator;
    readonly sancorRow: Locator;
    readonly rivaRow: Locator;
    readonly atmRow: Locator;
    readonly rusRow: Locator;
    readonly emitirSancor: Locator;
    readonly emitirRiva: Locator;
    readonly emitirAtm: Locator;
    readonly emitirRus: Locator;
    readonly formaPagoSiguiente: Locator;
    readonly companiasMap: { [key: string]: Locator };
    readonly companiasRowsMap: { [key: string]: Locator };
    readonly cotizacionErrorText: Locator;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.descuentoBar = page.locator('div').filter({ hasText: /^0$/ }).first();
        this.descuentoBar15 = page.getByText("15%");
        this.configAvanzadaBtn = page.getByText('Configuración avanzada', { exact: true });
        this.fechaVigencia = page.getByRole('textbox', { name: 'Inicio vigencia' });
        this.sumaAsegurada = page.getByRole('textbox', { name: 'Suma asegurada vehículo' });
        this.usoVehiculo = page.getByRole('searchbox', { name: 'Uso del vehículo' });
        this.facturacion = page.getByRole('searchbox', { name: 'Tipo de facturación' });
        this.ajusteAutomatico = page.getByRole('searchbox', { name: 'Ajuste automático' });
        this.cuotas = page.getByRole('searchbox', { name: 'Cantidad de cuotas' });
        this.cantCuotas = page.getByRole('searchbox', { name: 'Cantidad de cuotas' });
        this.infoBtn = page.locator('#infoIcon_16 circle');
        this.carritoBtn = page.locator('.automotor__cotSuccess__icon');
        this.sancorRow = page.getByText("17Moto Premium").getByText("$");
        this.rivaRow = page.getByText("CMAX").getByText("$");
        this.atmRow = page.getByText('CROBO PREMIUM MOTOS').getByText("$");
        this.rusRow = page.getByText('RCM-GRCM C/GRUA').getByText("$");

        this.emitirSancor = page.locator('#emitirButton_17');
        this.emitirRiva = page.locator('#emitirButton_C');
        this.emitirAtm = page.locator('#emitirButton_');
        this.emitirRus = page.locator('#emitirButton_RCM-G');
        this.formaPagoSiguiente = page.locator('[id="select_infoDePago.formaDePago"]');
        this.companiasMap = {
            'sancor': this.emitirSancor,
            'rus': this.emitirRus,
            'rivadavia': this.emitirRiva,
            'atm': this.emitirAtm
        };
        this.companiasRowsMap = {
            'sancor': this.sancorRow,
            'rus': this.rusRow,
            'rivadavia': this.rivaRow,
            'atm': this.atmRow
        };

        this.cotizacionErrorText = page.getByText('Hubo un problema');
    }

    // --- Métodos Helper ---

    public getOptionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getFechaVigenciaString(): string {
        const fechaFutura = new Date();
        fechaFutura.setDate(fechaFutura.getDate() + 5);
        const anio = fechaFutura.getFullYear();
        const mes = String(fechaFutura.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaFutura.getDate()).padStart(2, '0');
        return `${dia}${mes}${anio}`;
    }

    // --- Métodos 'set...' ---

    public async setFechaVigencia() {
        const fechaFormateada = this.getFechaVigenciaString();
        await this.fechaVigencia.fill(fechaFormateada);
        console.log(`Fecha Vigencia Moto: ${fechaFormateada}`);
    }

    public async setDescuento(descuentoPorc: number) {
        if (descuentoPorc === 15) {
            await this.descuentoBar15.click();
            console.log("Aplicado descuento 15%");
        }
        // ... (lógica para otros descuentos) ...
    }

    public async setAjusteAutomatico(datosDelTest: any) {
        // Verifica si el campo es visible Y si los datos lo definen
        if (datosDelTest.ajusteAutomatico && await this.ajusteAutomatico.isVisible()) {
            await this.ajusteAutomatico.click();
            await this.getOptionLocator(datosDelTest.ajusteAutomatico).click();
            console.log(`Ajuste Automático Moto: ${datosDelTest.ajusteAutomatico}`);
        } else {
            console.log("Campo 'Ajuste Automático' no visible o no definido. Saltando.");
        }
    }

    public async setUsoVehiculo(datosDelTest: any) {
        // Verifica si el campo es visible Y si los datos lo definen
        if (datosDelTest.usoVehiculo && await this.usoVehiculo.isVisible()) {
            await this.usoVehiculo.click();
            await this.getOptionLocator(datosDelTest.usoVehiculo).click();
            console.log(`Uso Vehículo Moto: ${datosDelTest.usoVehiculo}`);
        } else {
            console.log("Campo 'Uso Vehiculo' no visible o no definido. Saltando.");
        }
    }

    public async setCantidadCuotas(datosDelTest: any) {
        // ¡NUEVA GUARDIA! Solo actúa si el campo es visible
        if (datosDelTest.cantCuotas && await this.cuotas.isVisible()) {
            await this.cuotas.click();
            await this.getOptionLocator(datosDelTest.cantCuotas.toString()).click();
            console.log(`Cantidad Cuotas Moto (Opcional): ${datosDelTest.cantCuotas}`);
        } else {
            console.log("Campo 'Cantidad de Cuotas' no visible o no definido en Config. Avanzada. Saltando.");
        }
    }

    // --- Método "Dispatcher" ---

    public getCompaniaBtn(compania: string): Locator {
        const locator = this.companiasMap[compania.toLowerCase()];
        if (!locator) {
            throw new Error(`Compañía desconocida: ${compania}`);
        }
        return locator;
    }

    public async getValorCobertura(compania: string): Promise<string | null> {
        const coberturaLocator = this.companiasRowsMap[compania.toLowerCase()];
        const coberturaText = await coberturaLocator.textContent();
        if (coberturaText === null) {
            console.log("No se pudo obtener el valor de la cobertura");
            return null;
        }
        const valorSinSigno = coberturaText.replace('$', '');
        console.log("Valor cobertura es" + valorSinSigno);
        return valorSinSigno;
    }

    public async fillRivadavia(Moto: any) {
        await this.setFechaVigencia();
        await this.setDescuento(15);
        await this.facturacion.click();
        await this.getOptionLocator(Moto.tipoFacturacion).click();
        await this.cantCuotas.click();
        await this.getOptionLocator(Moto.cantCuotas).click();
        await this.setAjusteAutomatico(Moto);
        await this.setUsoVehiculo(Moto);
    }

    public async fillSancor(Moto: any) {
        await this.setFechaVigencia();
        await this.usoVehiculo.click();
        await this.getOptionLocator(Moto.usoVehiculo).click();
    }


    public async fillRus(Moto: any) {
        await this.setFechaVigencia();
        await this.setDescuento(15);
        await this.setUsoVehiculo(Moto);
        await this.setAjusteAutomatico(Moto);
    }

    /*
        public async fillATM(Moto: any) {
            await this.fechaVigencia.fill(this.setFechaVigencia());
            await this.aplicarDescuento15Porciento();
            await this.setTipoFacturacion(Moto);
            await this.setCantidadCuotas(Moto);
            await this.setFormaPago(Moto);
        }*/

    public async fillCompanySpecificAdvancedConfig(datosDelTest: any) {

        console.log(datosDelTest.compania)

        // Mueve el bloque IF de emisionAutoPage.ts... ¡AQUÍ!
        if (datosDelTest.rivadavia) {
            await this.fillRivadavia(datosDelTest);
        } else if (datosDelTest.rus) {
            await this.fillRus(datosDelTest);
        } else if (datosDelTest.sancor) {
            await this.fillSancor(datosDelTest);
        } else if (datosDelTest.atm) {
            //await this.fillATM(datosDelTest);
        }
        // (Añade 'else if (datosDelTest.experta)' si existe)
        else {
            console.log(`No hay configuración avanzada específica para la compañía activa.`);
        }
    }


}