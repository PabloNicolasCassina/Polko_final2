import { Page, Locator, expect } from "@playwright/test";

export interface DatosConfirmacionRetiro {
    titulo: string;
    mensaje: string;
}

export default class RetiroConfirmacion {
    readonly page: Page;

    readonly successModal: Locator;
    readonly successTitle: Locator;
    readonly successBody: Locator;
    readonly closeBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        
        this.successModal = page.locator('.successModal');
        this.successTitle = page.getByText('¡La operación se ha realizado con éxito!');
        this.successBody = page.locator('.successModal__body__block');
        this.closeBtn = page.getByRole('button', { name: /Cerrar|Aceptar|OK/i });
    }

    async verificarExitoVisible(): Promise<boolean> {
        return await this.successTitle.isVisible().catch(() => false);
    }

    async getTitulo(): Promise<string> {
        return await this.successTitle.textContent() || '';
    }

    async getMensaje(): Promise<string> {
        const body = await this.successBody.textContent();
        return body || '';
    }

    async getDatosConfirmacion(): Promise<DatosConfirmacionRetiro> {
        return {
            titulo: await this.getTitulo(),
            mensaje: await this.getMensaje()
        };
    }

    async volverABilletera(): Promise<void> {
        if (await this.closeBtn.isVisible().catch(() => false)) {
            await this.closeBtn.click();
        } else {
            await this.page.keyboard.press('Escape');
        }
        await this.page.waitForTimeout(1000);
    }

    async esperarConfirmacion(timeout: number = 30000): Promise<void> {
        await this.successTitle.waitFor({ state: 'visible', timeout });
    }
}
