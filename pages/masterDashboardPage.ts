import { Page, Locator, expect } from "@playwright/test";

export default class MasterDashboardPage {
    readonly page: Page;
    readonly masterMenuButton: Locator;
    readonly sociosMenuItem: Locator;
    readonly dashboardMenuItem: Locator;
    readonly canalDigitalMenuItem: Locator;
    readonly operacionesMenuItem: Locator;
    readonly misAseguradorasMenuItem: Locator;
    readonly canalDigitalTitle: Locator;
    readonly canalDigitalGestionTab: Locator;
    readonly canalDigitalTable: Locator;

    constructor(page: Page) {
        this.page = page;

        // Botón del menú Master en el sidebar - el contenedor tiene ID "Sidebar-Master"
        this.masterMenuButton = page.locator('#Sidebar-master');

        // Items del submenú Master - buscar de forma más flexible
        this.sociosMenuItem = page.getByText('Socios', { exact: true }).or(page.locator('text=/Socios/i').first());
        this.dashboardMenuItem = page.getByText('Dashboard', { exact: true }).or(page.locator('text=/Dashboard/i').first());
        this.canalDigitalMenuItem = page.getByText('Canal Digital', { exact: true }).or(page.locator('text=/Canal Digital/i').first());
        this.operacionesMenuItem = page.getByText('Operaciones', { exact: true }).or(page.locator('text=/Operaciones/i').first());

        // Item de Mis Aseguradoras - buscar por ID o texto
        this.misAseguradorasMenuItem = page.locator('#Sidebar-misaseguradoras').or(page.locator('text=/Mis Aseguradoras/i').first());

        // Canal Digital - tabla de gestión
        this.canalDigitalTitle = page.getByText('Canales digitales', { exact: true });
        this.canalDigitalGestionTab = page.getByText('GESTIÓN', { exact: true });
        this.canalDigitalTable = page.locator('.managementTab__container').getByRole('table');
    }

    /**
     * Devuelve el texto de cada columna de la tabla de gestión de Canal Digital.
     */
    async getCanalDigitalColumnHeaders(): Promise<string[]> {
        await this.canalDigitalTable.waitFor({ state: 'visible', timeout: 30000 });
        const headers = await this.canalDigitalTable.locator('thead th, [role="columnheader"]').allTextContents();
        return headers.map(h => h.trim()).filter(Boolean);
    }

    /**
     * Navega a la página de Socios
     */
    async navigateToSocios(): Promise<void> {
        // Esperar a que el sidebar esté visible
        await this.masterMenuButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.masterMenuButton.click();
        await this.page.waitForTimeout(500);
        // Esperar a que el submenú aparezca
        await this.sociosMenuItem.waitFor({ state: 'visible', timeout: 5000 });
        await this.sociosMenuItem.click();
        await this.page.waitForURL(/.*\/u\/m\/socios/, { timeout: 10000 });
    }

    /**
     * Navega al Dashboard Master
     */
    async navigateToDashboard(): Promise<void> {
        // Esperar a que el sidebar esté visible
        await this.masterMenuButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.masterMenuButton.click();
        await this.page.waitForTimeout(500);
        // Esperar a que el submenú aparezca
        await this.dashboardMenuItem.waitFor({ state: 'visible', timeout: 5000 });
        await this.dashboardMenuItem.click();
        await this.page
            .getByText('Estadísticas globales', { exact: false })
            .waitFor({ state: 'visible', timeout: 100000 });
    }

    /**
     * Navega a Canal Digital
     */
    async navigateToCanalDigital(): Promise<void> {
        // Esperar a que el sidebar esté visible
        await this.masterMenuButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.masterMenuButton.click();
        await this.page.waitForTimeout(500);
        // Esperar a que el submenú aparezca
        await this.canalDigitalMenuItem.waitFor({ state: 'visible', timeout: 5000 });
        await this.canalDigitalMenuItem.click();
        await this.page
            .getByText('GESTIÓN', { exact: false })
            .waitFor({ state: 'visible', timeout: 100000 });
    }

    /**
     * Navega a Operaciones
     */
    async navigateToOperaciones(): Promise<void> {
        // Esperar a que el sidebar esté visible
        await this.masterMenuButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.masterMenuButton.click();
        await this.page.waitForTimeout(500);
        // Esperar a que el submenú aparezca
        await this.operacionesMenuItem.waitFor({ state: 'visible', timeout: 5000 });
        await this.operacionesMenuItem.click();
        await this.page
            .getByText('OPERACIONES', { exact: false })
            .waitFor({ state: 'visible', timeout: 100000 });
    }

    /**
     * Navega a Mis Aseguradoras
     */
    async navigateToMisAseguradoras(): Promise<void> {
        await this.misAseguradorasMenuItem.click();
        await this.page
            .getByText('Experta', { exact: true })
            .waitFor({ state: 'visible', timeout: 100000 });
    }

    /**
     * Verifica que la página actual sea la de Socios
     */
    async verifySociosPage(): Promise<void> {
        await expect(this.page).toHaveURL(/.*\/u\/m\/socios/);
    }

    /**
     * Verifica que la página actual sea el Dashboard Master
     */
    async verifyDashboardPage(): Promise<void> {
        await expect(this.page).toHaveURL(/.*\/u\/m\/dashboard/);
    }

    /**
     * Verifica que la página actual sea Canal Digital
     */
    async verifyCanalDigitalPage(): Promise<void> {
        await expect(this.page).toHaveURL(/.*\/u\/m\/canaldigital/);
    }

    /**
     * Verifica que la página actual sea Operaciones
     */
    async verifyOperacionesPage(): Promise<void> {
        await expect(this.page).toHaveURL(/.*\/u\/m\/operaciones/);
    }

    /**
     * Verifica que la página actual sea Mis Aseguradoras
     */
    async verifyMisAseguradorasPage(): Promise<void> {
        await expect(this.page).toHaveURL(/.*\/u\/m\/misaseguradoras/);
    }
}

