import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";

export const COMPANY_NAMES = [
    "Andina-art",
    "Experta",
    "Prevencion",
    "Federacion Patronal",
    "SMG",
    "Omint",
    "Asociart",
    "Provincia",
    "Berkley",
] as const;

export type CompanyKey = typeof COMPANY_NAMES[number];


export default class TablaEmision {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly regimenGeneral: Locator;
    readonly regimenEspecial: Locator;
    readonly masBtn: Locator;
    readonly menosBtn: Locator;
    readonly emitirAndinaARTBtn: Locator;
    readonly emitirExperta: Locator;
    readonly emitirPrevencionBtn: Locator;
    readonly emitirFederacionPatronalBtn: Locator;
    readonly emitirSMGBtn: Locator;
    readonly emitirOmintBtn: Locator;
    readonly emitirAsociartBtn: Locator;
    readonly emitirProvinciaBtn: Locator;
    readonly emitirBerkleyBtn: Locator;
    private readonly companyButtons: Record<CompanyKey, Locator>;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.regimenGeneral = this.page.getByText('Regimen general');
        this.regimenEspecial = this.page.getByText('Regimen especial');
        this.masBtn = page.getByRole('button', { name: '+' }).first();
        this.menosBtn = page.getByRole("button", {name: '–'}).first();
        this.emitirAndinaARTBtn = page.locator('#emitirButton_Andina_ART');
        this.emitirExperta = page.locator('#emitirButton_Experta');
        this.emitirPrevencionBtn = page.locator('#emitirButton_Prevencion');
        this.emitirFederacionPatronalBtn = page.locator('#emitirButton_Federacion_Patronal');
        this.emitirSMGBtn = page.locator('#emitirButton_SMG');
        this.emitirOmintBtn = page.locator('#emitirButton_Omint');
        this.emitirAsociartBtn = page.locator('#emitirButton_Asociart');
        this.emitirProvinciaBtn = page.locator('#emitirButton_Provincia');
        this.emitirBerkleyBtn = page.locator('#emitirButton_Berkley');
        this.companyButtons = {
            "Andina-art": this.emitirAndinaARTBtn,
            Experta: this.emitirExperta,
            Prevencion: this.emitirPrevencionBtn,
            "Federacion Patronal": this.emitirFederacionPatronalBtn,
            SMG: this.emitirSMGBtn,
            Omint: this.emitirOmintBtn,
            Asociart: this.emitirAsociartBtn,
            Provincia: this.emitirProvinciaBtn,
            Berkley: this.emitirBerkleyBtn,
        } as Record<CompanyKey, Locator>;



    }

    getCompanyNames(): CompanyKey[] {
        return [...COMPANY_NAMES];
    }

    getCompanyButton(name: CompanyKey): Locator {
        const locator = this.companyButtons[name];
        if (!locator) {
            throw new Error(`No se encontró el botón de emisión para la compañía: ${name}`);
        }
        return locator;
    }
}