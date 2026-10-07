import { Page, Locator, expect } from "@playwright/test";

export default class OnboardingPage {
    readonly page: Page;
    readonly modal: Locator;
    readonly step1Title: Locator;
    readonly step2Title: Locator;
    readonly comenzarButton: Locator;
    readonly volverButton: Locator;
    readonly verMasTardeButton: Locator;
    readonly comenzarACotizarButton: Locator;
    readonly gestionarCodigosButton: Locator;
    readonly closeButton: Locator;
    readonly progressBars: Locator;
    // Títulos de tarjetas del step 1
    readonly multicotizacionCard: Locator;
    readonly emisionPolizasCard: Locator;
    readonly gestionAseguradorasCard: Locator;
    readonly comparadorPdfCard: Locator;
    readonly canalDigitalCard: Locator;
    readonly documentacionCard: Locator;

    constructor(page: Page) {
        this.page = page;
        // WizardModal (refactor onboarding) + fallbacks legacy
        this.modal = page.locator('.onboarding-wizard__footer, [class*="WizardModal"], [class*="OnboardingModal"], [class*="onboarding-modal"]').first();

        // Títulos de pasos
        this.step1Title = page.locator('.onboarding-step1__title, .onboarding-step1__highlight').or(page.getByRole('heading', { name: 'Multicotización' })).first();
        this.step2Title = page.locator('.onboarding-step2__title').or(page.locator('text=/¿Estás listo|listo para empezar|empezar/i')).first();

        // Títulos de tarjetas del step 1 usando getByRole heading
        this.multicotizacionCard = page.getByRole('heading', { name: 'Multicotización' });
        this.emisionPolizasCard = page.getByRole('heading', { name: 'Emisión de pólizas' });
        this.gestionAseguradorasCard = page.getByRole('heading', { name: 'Gestión de aseguradoras' });
        this.comparadorPdfCard = page.getByRole('heading', { name: 'Comparador en PDF' });
        this.canalDigitalCard = page.getByRole('heading', { name: 'Canal digital' });
        this.documentacionCard = page.getByRole('heading', { name: 'Documentación' });

        // Botones del paso 1
        this.comenzarButton = page.getByRole('button', { name: /Comenzar/i }).first();

        // Botones del paso 2
        this.volverButton = page.getByRole('button', { name: /Volver/i }).first();
        this.verMasTardeButton = page.getByRole('button', { name: /Ver más tarde|más tarde/i }).first();
        this.comenzarACotizarButton = page.getByRole('button', { name: 'IR A COTIZAR' });
        this.gestionarCodigosButton = page.getByRole('button', { name: /Gestionar códigos|Gestionar Códigos|gestionar/i }).first();

        // Botón de cerrar (X) - buscar de forma más flexible
        this.closeButton = page.locator('button[aria-label*="close"], button[aria-label*="cerrar"], [class*="close"], [class*="Close"]').first();

        // Barras de progreso
        this.progressBars = page.locator('[class*="progress-bar"], [class*="ProgressBar"]');
    }

    /**
     * Verifica que el modal de onboarding esté visible
     */
    async isVisible(): Promise<boolean> {
        try {
            await this.modal.waitFor({ state: 'visible', timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Espera a que el modal aparezca
     */
    async waitForModal(timeout: number = 15000): Promise<void> {
        // Intentar múltiples selectores
        try {
            await this.modal.waitFor({ state: 'visible', timeout });
        } catch {
            // Si no encuentra el modal, intentar buscar por texto
            const modalByText = this.page.locator('text=/Bienvenido|Bienvenida/i').first();
            await modalByText.waitFor({ state: 'visible', timeout });
        }
    }

    /**
     * Verifica que estemos en el paso 1
     */
    async isStep1(): Promise<boolean> {
        try {
            await this.step1Title.waitFor({ state: 'visible', timeout: 3000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Verifica que estemos en el paso 2
     */
    async isStep2(): Promise<boolean> {
        try {
            await this.step2Title.waitFor({ state: 'visible', timeout: 3000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Hace clic en "Comenzar" para avanzar al paso 2
     */
    async clickComenzar(): Promise<void> {
        await this.comenzarButton.click();
        await this.page.waitForTimeout(500); // Esperar transición
    }

    /**
     * Hace clic en "Volver" para regresar al paso 1
     */
    async clickVolver(): Promise<void> {
        await this.volverButton.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Hace clic en "Ver más tarde" para cerrar el modal
     */
    async clickVerMasTarde(): Promise<void> {
        await this.verMasTardeButton.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Hace clic en "Comenzar a cotizar"
     */
    async clickComenzarACotizar(): Promise<void> {
        await this.comenzarACotizarButton.click();
    }

    /**
     * Hace clic en "Gestionar códigos"
     */
    async clickGestionarCodigos(): Promise<void> {
        await this.gestionarCodigosButton.click();
    }

    /**
     * Cierra el modal haciendo clic en el botón X
     */
    async close(): Promise<void> {
        await this.closeButton.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Verifica que el modal no esté visible
     */
    async isNotVisible(): Promise<void> {
        await expect(this.modal).not.toBeVisible({ timeout: 3000 });
    }

    /**
     * Completa el flujo completo del onboarding hasta el paso 2
     */
    async completeToStep2(): Promise<void> {
        await this.waitForModal();
        await expect(this.step1Title).toBeVisible();
        await this.clickComenzar();
        await expect(this.step2Title).toBeVisible();
    }
}

