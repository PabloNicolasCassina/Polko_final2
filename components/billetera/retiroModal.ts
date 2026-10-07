import { Page, Locator, expect } from "@playwright/test";

export interface DatosRetiro {
    cbu?: string;
    cuit?: string;
    titular?: string;
}

export default class RetiroModal {
    readonly page: Page;

    readonly modalContainer: Locator;
    readonly modalTitle: Locator;
    readonly btnCerrar: Locator;
    readonly montoAExtraer: Locator;
    readonly cbuInfo: Locator;
    readonly btnModificarCBU: Locator;
    readonly btnExtraer: Locator;
    readonly legendText: Locator;
    readonly errorText: Locator;
    readonly loadingContainer: Locator;

    constructor(page: Page) {
        this.page = page;
        
        this.modalContainer = page.locator('.witFundModal__container');
        this.modalTitle = page.getByText('Confirmar el retiro de fondos');
        this.btnCerrar = page.locator('.witFundModal__icon__container');
        this.montoAExtraer = page.locator('.witFundModal__amount');
        this.cbuInfo = page.locator('.witFundModal__cbuContainer');
        this.btnModificarCBU = page.getByRole('button', { name: 'Modificar' });
        this.btnExtraer = page.getByRole('button', { name: 'Extraer' });
        this.legendText = page.locator('.witFundModal__legendText');
        this.errorText = page.locator('.witFundModal__errorText');
        this.loadingContainer = page.locator('.witFundModal__loading__container');
    }

    async estaAbierto(): Promise<boolean> {
        return await this.modalContainer.isVisible().catch(() => false);
    }

    async cerrar(): Promise<void> {
        await this.btnCerrar.click();
        await this.modalContainer.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    async getMontoAExtraer(): Promise<number> {
        const text = await this.montoAExtraer.textContent();
        if (!text) return 0;
        return this.parseMonto(text);
    }

    async getCBUInfo(): Promise<string> {
        const text = await this.cbuInfo.textContent();
        return text || '';
    }

    async clickExtraer(): Promise<void> {
        await this.btnExtraer.waitFor({ state: 'visible', timeout: 10000 });
        await this.btnExtraer.click();
    }

    async puedeExtraer(): Promise<boolean> {
        return await this.btnExtraer.isEnabled().catch(() => false);
    }

    async getLegendText(): Promise<string> {
        const isVisible = await this.legendText.isVisible().catch(() => false);
        if (!isVisible) return '';
        return await this.legendText.textContent() || '';
    }

    async getErrorText(): Promise<string> {
        const isVisible = await this.errorText.isVisible().catch(() => false);
        if (!isVisible) return '';
        return await this.errorText.textContent() || '';
    }

    async esperarCarga(): Promise<void> {
        await this.loadingContainer.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
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
