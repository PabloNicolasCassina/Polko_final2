import { Page, Locator, expect } from "@playwright/test";

export default class SaldoSection {
    readonly page: Page;

    readonly billeteraTitle: Locator;
    readonly incentivosPendientesCard: Locator;
    readonly incentivosDisponiblesCard: Locator;
    readonly incentivosAcumuladosCard: Locator;
    readonly verDetalleBtn: Locator;
    readonly retirarFondosBtn: Locator;
    readonly verHistorialBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        
        this.billeteraTitle = page.locator('.billetera__title').first();
        
        this.incentivosPendientesCard = page.locator('.billeteraCard__container').first();
        this.incentivosDisponiblesCard = page.locator('.billetera__cards__two .billeteraCard__container');
        this.incentivosAcumuladosCard = page.locator('.billeteraCardSecondary__container');
        
        this.verDetalleBtn = page.locator('.billetera__cards__one button');
        this.retirarFondosBtn = page.locator('.billetera__cards__two button');
        this.verHistorialBtn = page.locator('.billetera__cards__three button');
    }

    async getSaldoDisponible(): Promise<number> {
        const card = this.incentivosDisponiblesCard;
        const amountText = await card.locator('.billeteraCard__amount').textContent();
        if (!amountText) return 0;
        return this.parseMonto(amountText);
    }

    async getSaldoPendiente(): Promise<number> {
        const card = this.incentivosPendientesCard;
        const amountText = await card.locator('.billeteraCard__amount').textContent();
        if (!amountText) return 0;
        return this.parseMonto(amountText);
    }

    async getSaldoRetenido(): Promise<number> {
        const card = this.incentivosAcumuladosCard;
        const amountText = await card.locator('.billeteraCardSecondary__amount').textContent();
        if (!amountText) return 0;
        return this.parseMonto(amountText);
    }

    async clickRetirarFondos(): Promise<void> {
        await this.retirarFondosBtn.waitFor({ state: 'visible', timeout: 10000 });
        await this.retirarFondosBtn.click();
    }

    async clickVerDetalle(): Promise<void> {
        await this.verDetalleBtn.waitFor({ state: 'visible', timeout: 10000 });
        await this.verDetalleBtn.click();
    }

    async clickVerHistorial(): Promise<void> {
        await this.verHistorialBtn.waitFor({ state: 'visible', timeout: 10000 });
        await this.verHistorialBtn.click();
    }

    async verificarBotonRetiroVisible(): Promise<boolean> {
        const isVisible = await this.retirarFondosBtn.isVisible().catch(() => false);
        if (!isVisible) return false;
        const isEnabled = await this.retirarFondosBtn.isEnabled().catch(() => false);
        return isEnabled;
    }

    async verificarSaldoPositivo(): Promise<boolean> {
        const saldo = await this.getSaldoDisponible();
        return saldo > 0;
    }

    async navegarABilletera(): Promise<void> {
        const walletBtn = this.page.locator('#Sidebar-Billetera-icon');
        await walletBtn.waitFor({ state: 'visible', timeout: 10000 });
        await walletBtn.click();
        await this.billeteraTitle.waitFor({ state: 'visible', timeout: 15000 });
    }

    private parseMonto(montoText: string): number {
        const cleanText = montoText
            .replace(/\$/g, '')
            .replace(/\s/g, '')
            .trim();
        
        const normalized = cleanText
            .replace(/\./g, '')
            .replace(',', '.');
        
        const monto = parseFloat(normalized);
        return isNaN(monto) ? 0 : monto;
    }
}
