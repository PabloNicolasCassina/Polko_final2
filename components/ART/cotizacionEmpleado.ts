import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";
import CommonButtons from "../commonButtons";


export default class CotizacionEmpleado {
    readonly page: Page;
    readonly buttons: CommonButtons;

    readonly selectRegimen: Locator;
    readonly cantEmpleados: Locator;
    readonly masaSalarial: Locator;
    readonly horasSemanales: Locator;
    readonly resultadoCotizacion: Locator;
    readonly errorCotizacion: Locator;
    readonly btnVerCotizacion: Locator;








    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.selectRegimen = page.locator('#select_regimen');
        this.cantEmpleados = page.locator('#number_cantidadEmpleados');
        this.masaSalarial = page.locator('#number_masaSalarial');
        this.horasSemanales = page.locator('#select_cantidadHoras');
        this.resultadoCotizacion = page.getByText('Recibimos tu solicitud');
        this.errorCotizacion = page.getByText('Hubo un problema al cotizar,');
        this.btnVerCotizacion = page.getByRole('button', { name: 'VER MIS COTIZACIONES' });


    }

    public getOptionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }


    
}