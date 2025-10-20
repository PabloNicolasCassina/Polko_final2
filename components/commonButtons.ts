import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class CommonButtons {
    readonly page: Page;

    readonly aceptarSelector: Locator;
    readonly siguienteBtn: Locator;
    readonly atrasBtn: Locator;
    readonly siOptionLocator: Locator;
    readonly cotizarBtn: Locator;
    readonly emitirBtn: Locator;
    readonly aplicarCambiosBtn: Locator;
    readonly loadingSpinner: Locator;



    constructor(page: Page) {
        this.page = page;
        this.aceptarSelector = page.getByRole('button', { name: 'Aceptar' });
        this.siguienteBtn = page.getByRole('button', { name: 'Siguiente' });
        this.atrasBtn = page.getByRole('button', { name: 'Atrás' });
        this.siOptionLocator = this.page.getByRole("option", { name: "Si", exact: true });
        this.cotizarBtn = page.getByRole('button', { name: 'COTIZAR', exact: true });
        this.emitirBtn = page.getByRole('button', { name: 'Emitir' });
        this.aplicarCambiosBtn = page.getByRole('button', { name: 'APLICAR CAMBIOS' });
        this.loadingSpinner = page.locator('.loading__spinner');

    }
}