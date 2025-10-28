import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


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
    readonly logosMap: { [key: string]: Locator };




    constructor(page: Page) {
        this.page = page;
        this.sancorLogo = page.locator('#csm__logo-1');
        this.rusLogo = page.locator('#csm__logo-2');
        this.zurichLogo = page.locator('#csm__logo-3');
        this.fedpatLogo = page.locator('#csm__logo-5');
        this.expertaLogo = page.locator('#csm__logo-6');
        this.rivaLogo = page.locator('#csm__logo-7');
        this.atmLogo = page.locator('#csm__logo-8');
        this.triunfoLogo = page.locator('#csm__logo-9');
        this.logosMap = {
            'sancor': this.sancorLogo,
            'rus': this.rusLogo,
            'zurich': this.zurichLogo,
            'federacion_patronal': this.fedpatLogo, // Clave para 'fedpat'
            'experta': this.expertaLogo,
            'rivadavia': this.rivaLogo, // Clave para 'riva'
            'atm': this.atmLogo,
            'triunfo': this.triunfoLogo
        };
    }

    public getCompaniaLogo(compania: string): Locator {

        const locator = this.logosMap[compania.toLowerCase()];
        if (!locator) {
            throw new Error(`Compañía desconocida: ${compania}`);
        }
        return locator;
    }
}
