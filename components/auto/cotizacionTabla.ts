import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";
import { get } from "http";


export default class CotizacionTabla {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly descuentoPointer: Locator;
    readonly descuentoBar15: Locator;
    readonly configAvanzadaBtn: Locator;
    readonly fechaVigencia: Locator;
    readonly sumaAsegurada: Locator;
    readonly usoVehiculo: Locator;
    readonly facturacion: Locator;
    readonly formaPago: Locator;
    readonly formaPagoDependant: Locator;
    readonly ajusteAutomatico: Locator;
    readonly cuotas: Locator;
    readonly ajusteRiva: Locator;
    readonly cuotasDependant: Locator;
    readonly descFedPatCbox: Locator;
    readonly multFranquiciasCbox: Locator;
    readonly infoBtn: Locator;
    readonly carritoBtn: Locator;
    readonly sancorRow: Locator;
    readonly rivaRow: Locator;
    readonly zurichRow: Locator;
    readonly expertaRow: Locator;
    readonly fedPatRow: Locator;
    readonly atmRow: Locator;
    readonly rusRow: Locator;
    readonly triunfoRow: Locator;
    readonly emitirSancor: Locator;
    readonly emitirRiva: Locator;
    readonly emitirExperta: Locator;
    readonly emitirFedPat: Locator;
    readonly emitirZurich: Locator;
    readonly emitirAtm: Locator;
    readonly emitirRus: Locator;
    readonly emitirTriunfo: Locator;
    readonly formaPagoSiguiente: Locator;
    readonly companiasMap: { [key: string]: Locator };
    readonly companiasRowsMap: { [key: string]: Locator };
    readonly cotizacionErrorText: Locator;







    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.descuentoPointer = page.getByRole('slider');
        this.descuentoBar15 = page.getByText("15%");
        this.configAvanzadaBtn = page.getByText('Configuración avanzada', { exact: true });
        this.fechaVigencia = page.getByRole('textbox', { name: 'dd/mm/yyyy' });
        this.sumaAsegurada = page.locator('#number_sumaAseguradaVehiculo');
        this.usoVehiculo = page.locator('#select_usoVehiculo');
        this.facturacion = page.locator('#select_facturacion');
        this.formaPago = page.locator('#select_formaDePago');
        this.formaPagoDependant = page.locator('#dependant_formaDePago');
        this.ajusteAutomatico = page.locator('#select_ajusteAutomatico');
        this.cuotas = page.locator('#select_cuotas');
        this.ajusteRiva = page.locator('#dependant_ajusteAutomatico');
        this.cuotasDependant = page.locator('#dependant_cuotas');
        this.descFedPatCbox = page.getByRole('checkbox', { name: 'Descuento cliente nuevo' });
        this.multFranquiciasCbox = page.getByRole('checkbox', { name: 'Multiples franquicias' })
        this.infoBtn = page.locator('#infoIcon_16 circle');
        this.carritoBtn = page.locator('.automotor__cotSuccess__icon');
        this.sancorRow = page.getByText("12Auto").getByText("$");
        this.rivaRow = page.getByText("MXMEGA MAX").getByText("$");
        this.zurichRow = page.getByText("CG TERCEROS COMPLETO PREMIUM GRANIZO").getByText("$");
        this.expertaRow = page.getByText("942Terceros Completos").getByText("$");
        this.fedPatRow = page.getByText("CFTerceros Completo Premium").getByText("$");
        this.atmRow = page.getByText("C2C Premium").getByText("$");
        this.rusRow = page.getByText("SOSigma Cero").getByText("$");
        this.triunfoRow = page.getByText('AA').nth(1).getByText("$");

        this.emitirSancor = page.locator('#emitirButton_12');
        this.emitirRiva = page.locator('#emitirButton_MX');
        this.emitirExperta = page.locator('#emitirButton_942');
        this.emitirFedPat = page.locator('#emitirButton_CF');
        this.emitirZurich = page.locator('#emitirButton_37');
        this.emitirAtm = page.locator('#emitirButton_C2');
        this.emitirRus = page.locator('#emitirButton_SO');
        this.emitirTriunfo = page.locator('#emitirButton_A');
        this.formaPagoSiguiente = page.locator('[id="select_infoDePago.formaDePago"]');
        this.companiasMap = {
            'sancor': this.emitirSancor,
            'rus': this.emitirRus,
            'zurich': this.emitirZurich,
            'federacion_patronal': this.emitirFedPat, // Clave para 'fedpat'
            'experta': this.emitirExperta,
            'rivadavia': this.emitirRiva, // Clave para 'riva'
            'atm': this.emitirAtm,
            'triunfo': this.emitirTriunfo
        };
        this.companiasRowsMap = {
            'sancor': this.sancorRow,
            'rus': this.rusRow,
            'zurich': this.zurichRow,
            'federacion_patronal': this.fedPatRow, // Clave para 'fedpat'
            'experta': this.expertaRow,
            'rivadavia': this.rivaRow, // Clave para 'riva'
            'atm': this.atmRow,
            'triunfo': this.triunfoRow
        };

        this.cotizacionErrorText = page.locator('.automotor__cotSuccess__errorIcon');


    }

    public setVechaVigencia(): string {
        // 1. Obtené la fecha de hoy y sumale 5 días
        const fechaFutura = new Date();
        fechaFutura.setDate(fechaFutura.getDate() + 5);

        // 2. Formateala al string 'YYYY-MM-DD'
        const anio = fechaFutura.getFullYear();
        const mes = String(fechaFutura.getMonth() + 1).padStart(2, '0'); // getMonth() es 0-11, por eso +1
        const dia = String(fechaFutura.getDate()).padStart(2, '0');
        const fechaFormateada = `${dia}${mes}${anio}`;

        return fechaFormateada;
    }

    public getCompaniaBtn(compania: string): Locator {

        const locator = this.companiasMap[compania.toLowerCase()];
        if (!locator) {
            throw new Error(`Compañía desconocida: ${compania}`);
        }
        return locator;
    }

    public async getValorCoberturaTabla(compania: string): Promise<string | null> {
        const coberturaLocator = this.companiasRowsMap[compania.toLowerCase()];
        const coberturaText = await coberturaLocator.textContent(); // ej: "$131.399Mismo precio por 3 meses"

        if (coberturaText === null) {
            console.log("No se pudo obtener el valor de la cobertura");
            return null;
        }

        // 1. Quitamos el signo $
        const valorSucio = coberturaText.replace('$', ''); // ej: "131.399Mismo precio por 3 meses"

        // 2. Usamos RegExp para quedarnos solo con el número del principio
        // Esto busca dígitos (\d), puntos (.) y comas (,) al inicio (^)
        const match = valorSucio.match(/^[\d.,]+/);

        if (match && match[0]) {
            const valorLimpio = match[0]; // ej: "131.399"
            console.log("Valor cobertura es: " + valorLimpio);
            return valorLimpio; // Devolvemos el valor limpio
        }

        // Si no encuentra el número, falla el test con un error claro
        console.error(`No se pudo extraer el valor numérico de: "${valorSucio}"`);
        return null; // O podés lanzar un error
    }

    public async aplicarDescuento15Porciento(): Promise<void> {
        await this.descuentoBar15.click();
        await this.descuentoPointer.click();
    }

    public getOptionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    async setUsoVehiculo(datosDelTest: any) {
        const usoVehiculoOption = datosDelTest.usoVehiculo || 'Particular'; // Usa default si no viene
        await this.usoVehiculo.click();
        await this.getOptionLocator(usoVehiculoOption).click();
        console.log(`Uso Vehículo seleccionado: ${usoVehiculoOption}`);
    }

    async setTipoFacturacion(datosDelTest: any) {
        // Asegúrate que tipoFacturacion siempre venga en datosDelTest
        if (!datosDelTest.tipoFacturacion) {
            throw new Error("setTipoFacturacion: 'tipoFacturacion' no encontrado en datosDelTest.");
        }
        await this.facturacion.click();
        await this.getOptionLocator(datosDelTest.tipoFacturacion).click();
        console.log(`Tipo Facturación seleccionado: ${datosDelTest.tipoFacturacion}`);
    }

    async setFormaPago(datosDelTest: any) {
        // Asegúrate que formaPago siempre venga en datosDelTest
        if (!datosDelTest.formaPago) {
            throw new Error("setFormaPago: 'formaPago' no encontrado en datosDelTest.");
        }
        // Lógica condicional para elegir el locator correcto
        const formaPagoLocator = datosDelTest.triunfo // Usa el flag booleano de la compañía
            ? this.formaPagoDependant
            : this.formaPago;
        await formaPagoLocator.click();
        await this.getOptionLocator(datosDelTest.formaPago).click();
        console.log(`Forma Pago seleccionada: ${datosDelTest.formaPago}`);
    }

    async setCantidadCuotas(datosDelTest: any) {
        // Asegúrate que cantCuotas siempre venga en datosDelTest
        if (datosDelTest.cantCuotas === undefined || datosDelTest.cantCuotas === null) {
            throw new Error("setCantidadCuotas: 'cantCuotas' no encontrado en datosDelTest.");
        }
        // Lógica condicional para elegir el locator correcto
        const cuotasLocator = (datosDelTest.rivadavia || datosDelTest.triunfo) // Usa los flags booleanos
            ? this.cuotasDependant
            : this.cuotas;
        await cuotasLocator.click();
        // Convierte a string por si acaso viene como número
        await this.getOptionLocator(datosDelTest.cantCuotas.toString()).click();
        console.log(`Cantidad Cuotas seleccionada: ${datosDelTest.cantCuotas}`);
    }

    async setAjusteAutomatico(datosDelTest: any) {
        // Solo actúa si ajusteAutomatico está presente en los datos
        if (datosDelTest.ajusteAutomatico) {
            if (datosDelTest.rivadavia) { // Lógica específica para Rivadavia
                await this.ajusteRiva.click();
                await this.getOptionLocator(datosDelTest.ajusteAutomatico).click();
                console.log(`Ajuste Automático (Riva) seleccionado: ${datosDelTest.ajusteAutomatico}`);
            } else { // Lógica genérica para otras Cías (si aplica)
                 // Verifica si el locator genérico está visible antes de usarlo
                 if (await this.ajusteAutomatico.isVisible()) {
                     await this.ajusteAutomatico.click();
                     await this.getOptionLocator(datosDelTest.ajusteAutomatico).click();
                     console.log(`Ajuste Automático (Genérico) seleccionado: ${datosDelTest.ajusteAutomatico}`);
                 } else {
                     console.log("Ajuste automático genérico no visible/aplicable para esta compañía o configuración.");
                 }
            }
        } else {
            console.log("Ajuste automático no especificado en datosDelTest.");
        }
    }
    
    public async fillRivadavia(Auto: any)
    {
        await this.fechaVigencia.fill(this.setVechaVigencia());
        await this.aplicarDescuento15Porciento();
        await this.ajusteRiva.click();
        await this.getOptionLocator(Auto.ajusteAutomatico).click();
        await this.facturacion.click();
        await this.getOptionLocator(Auto.tipoFacturacion).click();
        await this.cuotasDependant.click();
        await this.getOptionLocator(Auto.cantCuotas).click();
        await this.usoVehiculo.click();
        await this.getOptionLocator(Auto.usoVehiculo).click();
    }

    public async fillTriunfo(auto: any)
    {
        await this.aplicarDescuento15Porciento();
        await this.setUsoVehiculo(auto);
        await this.setTipoFacturacion(auto);
        await this.setCantidadCuotas(auto);
        await this.setFormaPago(auto);
    }


}