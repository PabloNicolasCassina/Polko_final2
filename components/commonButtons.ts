import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";
import QuotationSidebar from "./quotationSidebar";


export default class CommonButtons {
    readonly page: Page;

    readonly aceptarSelector: Locator;
    readonly siguienteBtn: Locator;
    readonly atrasBtn: Locator;
    readonly siOptionLocator: Locator;
    readonly cotizarBtn: Locator;
    readonly emitirBtn: Locator;
    readonly aplicarCambiosBtn: Locator;
    readonly dismissBtn: Locator;
    readonly continuarBtn: Locator;
    readonly authBtn: Locator;
    readonly loadingSpinner: Locator;



    constructor(page: Page) {
        this.page = page;
        this.aceptarSelector = page.getByRole('button', { name: 'Aceptar' });
        this.siguienteBtn = page.getByRole('button', { name: 'Siguiente' });
        this.atrasBtn = page.getByRole('button', { name: 'Atrás' });
        this.siOptionLocator = this.page.getByRole("option", { name: "Si", exact: true });
        // El botón se renderiza como "COTIZAR" (texto literal en mayúsculas, no
        // transformado por CSS), por lo que exact:true (case-sensitive) nunca
        // matchea contra 'Cotizar'. La pantalla de Auto además tiene un botón
        // "Cotizar flota" que matchea por substring si no usamos match exacto,
        // así que usamos una regex de string completo, case-insensitive.
        this.cotizarBtn = page.getByRole('button', { name: /^cotizar$/i });
        // Igual que cotizarBtn: en moto/hogar/AP el texto literal del botón es
        // "EMITIR" (mayúsculas), mientras que en auto es "Emitir". exact:true
        // es case-sensitive, así que usamos una regex exacta case-insensitive.
        this.emitirBtn = page.getByRole('button', { name: /^emitir$/i });
        // UI rediseño: "Aplicar cambios"; legacy: "APLICAR CAMBIOS"
        this.aplicarCambiosBtn = page.getByRole('button', { name: /^aplicar cambios$/i });
        this.dismissBtn = page.frameLocator('#webpack-dev-server-client-overlay').getByRole('button', { name: 'Dismiss' });
        this.continuarBtn = page.getByRole('button', { name: 'Continuar' });
        this.authBtn = page.getByRole('button', { name: 'Accept' });
        // Spinner del componente <Loading /> (frontend_general/src/components/Loading/Loading.js)
        this.loadingSpinner = page.locator('.loading__spinner');
    }

    public getOptionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getSuccessBadge(compania: string): Locator {
        const nombreMap: { [key: string]: string } = {
            'sancor': 'Sancor',
            'rus': 'RUS',
            'zurich': 'Zurich',
            'federacion_patronal': 'Federación',
            'experta': 'Experta',
            'rivadavia': 'Rivadavia',
            'atm': 'ATM',
            'triunfo': 'Triunfo',
            'mercantil_andina': 'Mercantil',
        };
        const nombre = nombreMap[compania.toLowerCase()] || compania;
        return new QuotationSidebar(this.page).selectedCompanySuccessBadge(nombre);
    }
}