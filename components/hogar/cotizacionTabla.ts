import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";
import { get } from "http";


export default class CotizacionTabla {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly descuentoBar: Locator;
    readonly descuentoBar15: Locator;
    readonly configAvanzadaBtn: Locator;
    readonly fechaVigencia: Locator;
    readonly sumaAsegurada: Locator;
    readonly usoVehiculo: Locator;
    readonly facturacion: Locator;
    readonly formaPago: Locator;
    readonly ajusteAutomatico: Locator;
    readonly cuotas: Locator;
    readonly ajusteRiva: Locator;
    readonly cuotasRiva: Locator;
    readonly descFedPatCbox: Locator;
    readonly multFranquiciasCbox: Locator;
    readonly infoBtn: Locator;
    readonly carritoBtn: Locator;
    readonly sancorRow: Locator;
    readonly rivaRow: Locator;
    readonly zurichRow: Locator;
    readonly expertaRow: Locator;
    //readonly fedPatRow: Locator;
    readonly atmRow: Locator;
    readonly rusRow: Locator;
    readonly emitirSancor: Locator;
    readonly emitirRiva: Locator;
    readonly emitirExperta: Locator;
    readonly emitirFedPat: Locator;
    readonly emitirZurich: Locator;
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
        this.fechaVigencia = page.getByRole('textbox', { name: 'dd/mm/yyyy' });
        this.sumaAsegurada = page.locator('#number_sumaAseguradaVehiculo');
        this.usoVehiculo = page.locator('#select_usoVehiculo');
        this.facturacion = page.locator('#select_facturacion');
        this.formaPago = page.locator('#select_formaDePago');
        this.ajusteAutomatico = page.locator('#select_ajusteAutomatico');
        this.cuotas = page.locator('#select_cuotas');
        this.ajusteRiva = page.locator('#dependant_ajusteAutomatico');
        this.cuotasRiva = page.locator('#dependant_cuotas');
        this.descFedPatCbox = page.getByRole('checkbox', { name: 'Descuento cliente nuevo' });
        this.multFranquiciasCbox = page.getByRole('checkbox', { name: 'Multiples franquicias' })
        this.infoBtn = page.locator('#infoIcon_16 circle');
        this.carritoBtn = page.locator('.automotor__cotSuccess__icon');
        this.sancorRow = page.getByText("12Auto").getByText("$");
        this.rivaRow = page.getByText("MXMEGA MAX").getByText("$");
        this.zurichRow = page.getByText("CG TERCEROS COMPLETO PREMIUM GRANIZO").getByText("$");
        this.expertaRow = page.getByText("942Terceros Completos").getByText("$");
        //this.fedPatRow = page.getByText("CF Auto Todo Riesgo").getByText("$");
        this.atmRow = page.getByText("C2C Premium").getByText("$");
        this.rusRow = page.getByText("SOSigma Cero").getByText("$");

        this.emitirSancor = page.locator('#emitirButton_12');
        this.emitirRiva = page.locator('#emitirButton_MX');
        this.emitirExperta = page.locator('#emitirButton_942');
        this.emitirFedPat = page.locator('#emitirButton_CF');
        this.emitirZurich = page.locator('#emitirButton_37');
        this.emitirAtm = page.locator('#emitirButton_C2');
        this.emitirRus = page.locator('#emitirButton_SO');
        this.formaPagoSiguiente = page.locator('[id="select_infoDePago.formaDePago"]');
        this.companiasMap = {
            'sancor': this.emitirSancor,
            'rus': this.emitirRus,
            'zurich': this.emitirZurich,
            'federacion_patronal': this.emitirFedPat, // Clave para 'fedpat'
            'experta': this.emitirExperta,
            'rivadavia': this.emitirRiva, // Clave para 'riva'
            'atm': this.emitirAtm
        };
        this.companiasRowsMap = {
            'sancor': this.sancorRow,
            'rus': this.rusRow,
            'zurich': this.zurichRow,
            //'federacion_patronal': this.fedPatRow, // Clave para 'fedpat'
            'experta': this.expertaRow,
            'rivadavia': this.rivaRow, // Clave para 'riva'
            'atm': this.atmRow
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

    public async getValorCobertura (compania: string): Promise<string | null> {
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



}