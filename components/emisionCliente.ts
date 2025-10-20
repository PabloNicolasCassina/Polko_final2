import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionCliente {
    readonly page: Page;

    readonly nosisInput: Locator;
    readonly buscarBtn: Locator;
    readonly completarBtn: Locator;
    readonly masculinoRadio: Locator;
    readonly femeninoRadio: Locator;
    readonly emailInput: Locator;



    constructor(page: Page) {
        this.page = page;
        this.nosisInput = page.getByRole('textbox', { name: 'DNI o CUIT/CUIL' });
        this.buscarBtn = page.getByRole('button', { name: 'Buscar' });
        this.completarBtn = page.getByRole('button', { name: 'Completar manualmente' });
        this.masculinoRadio = page.getByRole('radio', { name: 'Masculino' });
        this.femeninoRadio = page.getByRole('radio', { name: 'Femenino' });
        this.emailInput = page.locator('[id="input_clientes.0.email"]');

        
    }

}