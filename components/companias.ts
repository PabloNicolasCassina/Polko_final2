import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";
import QuotationSidebar from "./quotationSidebar";

export const COMPANY_TILE_LABELS: { [key: string]: string } = {
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

export default class Companias {
    readonly page: Page;
    readonly sancorLogo: Locator;
    readonly rusLogo: Locator;
    readonly zurichLogo: Locator;
    readonly fedpatLogo: Locator;
    readonly expertaLogo: Locator;
    readonly rivaLogo: Locator;
    readonly atmLogo: Locator;
    readonly triunfoLogo: Locator;
    readonly mercantilAndinaLogo: Locator;
    readonly logosMap: { [key: string]: Locator };




    constructor(page: Page) {
        this.page = page;
        // Algunas pantallas de cotización (auto) muestran una barra lateral con
        // <button> reales con nombre accesible. Otras (moto, AP, hogar) muestran
        // un popup "Elegí tus compañías" donde el logo es un <svg id="csm__logo-N">
        // sin rol de botón. Combinamos ambas estrategias con `.or()` para que el
        // locator funcione sin importar qué variante de UI esté activa.
        this.sancorLogo = page.getByRole('button', { name: 'Sancor' }).or(page.locator('#csm__logo-1'))
        this.rusLogo = page.getByRole('button', { name: 'RUS' }).or(page.locator('#csm__logo-2'))
        this.zurichLogo = page.getByRole('button', { name: 'Zurich' }).or(page.locator('#csm__logo-3'))
        this.fedpatLogo = page.getByRole('button', { name: 'Federación' }).or(page.locator('#csm__logo-5'))
        this.expertaLogo = page.getByRole('button', { name: 'Experta' }).or(page.locator('#csm__logo-6'))
        this.rivaLogo = page.getByRole('button', { name: 'Rivadavia' }).or(page.locator('#csm__logo-7'))
        this.atmLogo = page.getByRole('button', { name: 'ATM' }).or(page.locator('#csm__logo-8'))
        this.triunfoLogo = page.getByRole('button', { name: 'Triunfo' }).or(page.locator('#csm__logo-9'))
        this.mercantilAndinaLogo = page.getByRole('button', { name: 'Mercantil' }).or(page.locator('#csm__logo-16'))
        this.logosMap = {
            'sancor': this.sancorLogo,
            'rus': this.rusLogo,
            'zurich': this.zurichLogo,
            'federacion_patronal': this.fedpatLogo, // Clave para 'fedpat'
            'experta': this.expertaLogo,
            'rivadavia': this.rivaLogo, // Clave para 'riva'
            'atm': this.atmLogo,
            'triunfo': this.triunfoLogo,
            'mercantil_andina': this.mercantilAndinaLogo
        };
    }

    public getCompaniaLogo(compania: string): Locator {

        const locator = this.logosMap[compania.toLowerCase()];
        if (!locator) {
            throw new Error(`Compañía desconocida: ${compania}`);
        }
        return locator;
    }

    /**
     * Selecciona la compañía en la UI que esté activa: tile/logo en desktop o,
     * en viewport compacto (cotizador rediseñado), el item del drawer de la barra mobile.
     */
    public async seleccionarCompania(compania: string): Promise<void> {
        const logo = this.getCompaniaLogo(compania);
        const sidebar = new QuotationSidebar(this.page);
        if (sidebar.isCompact()) {
            await sidebar.mobileBar.or(logo).first().waitFor({ state: 'visible', timeout: 60000 });
            if (await sidebar.mobileBar.isVisible().catch(() => false)) {
                await sidebar.seleccionarCompania(COMPANY_TILE_LABELS[compania.toLowerCase()] ?? compania);
                return;
            }
        }
        await logo.click();
    }
}
