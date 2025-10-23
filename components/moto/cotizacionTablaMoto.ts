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
            'rivadavia': this.emitirRiva, // Clave para 'riva'
            'atm': this.emitirAtm
        };
        this.companiasRowsMap = {
            'sancor': this.sancorRow,
            'rus': this.rusRow,
            'rivadavia': this.rivaRow, // Clave para 'riva'
            'atm': this.atmRow
        };


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