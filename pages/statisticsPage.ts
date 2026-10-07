import { Page, Locator, expect } from "@playwright/test";

export default class StatisticsPage {
    readonly page: Page;

    // Navegación
    readonly sidebarStatisticsButton: Locator;
    readonly pageTitle: Locator;

    // Tabs
    readonly tabCompania: Locator;
    readonly tabRamo: Locator;
    readonly tabCliente: Locator;

    // Info Modal
    readonly infoLink: Locator;
    readonly modalWhatsAppButton: Locator;
    readonly modalCloseButton: Locator;

    // Filtros
    readonly filterCompania: Locator;
    readonly filterProducto: Locator;
    readonly filterPeriodo: Locator;

    // Gráficos - BarChart (Compañía)
    readonly barChartBars: Locator;
    readonly barChartSelectedBar: Locator;

    // Gráficos - DonutChart (Ramo)
    readonly donutChartSegments: Locator;
    readonly donutChartLegendItems: Locator;
    readonly donutChartHoveredItem: Locator;

    // Tabla Compañía
    readonly companyTableRows: Locator;
    readonly companyTableSelectedRow: Locator;

    // Tabla Cliente
    readonly clientSearchInput: Locator;
    readonly clientSearchButton: Locator;
    readonly clientSortProducto: Locator;
    readonly clientSortCompania: Locator;
    readonly clientHeaderInfoButton: Locator;
    readonly clientPaginationNext: Locator;
    readonly clientPaginationPrev: Locator;
    readonly clientTableRows: Locator;

    // Empty State
    readonly emptyStateTitle: Locator;
    readonly emptyStateText: Locator;
    readonly emptyStateWhatsAppButton: Locator;

    constructor(page: Page) {
        this.page = page;

        // Navegación
        this.sidebarStatisticsButton = page.locator('#Sidebar-statistics');
        this.pageTitle = page.getByText('Panel de Estadísticas', { exact: true });

        // Tabs
        this.tabCompania = page.locator('button.Statistics__tab').filter({ hasText: 'Compañía' });
        this.tabRamo = page.locator('button.Statistics__tab').filter({ hasText: 'Ramo' });
        this.tabCliente = page.locator('button.Statistics__tab').filter({ hasText: 'Cliente' });

        // Info Modal
        this.infoLink = page.getByText('¿Cómo interpretar estos datos?');
        this.modalWhatsAppButton = page.getByRole('button', { name: /Contactar por WhatsApp/i });
        this.modalCloseButton = page.locator('[aria-label="Cerrar"]').or(page.locator('button').filter({ hasText: /cerrar/i }).first());

        // Filtros (Mantine Select)
        this.filterCompania = page.locator('.Statistics__filter').filter({ has: page.locator('input[placeholder*="Compañía"]') }).first();
        this.filterProducto = page.locator('.Statistics__filter').filter({ has: page.locator('input[placeholder*="Producto"]') }).first();
        this.filterPeriodo = page.locator('.Statistics__filter').filter({ has: page.locator('input[placeholder*="Periodo"]') }).first();

        // Gráficos - BarChart
        this.barChartBars = page.locator('.BarChart__bar');
        this.barChartSelectedBar = page.locator('.BarChart__bar--selected');

        // Gráficos - DonutChart
        this.donutChartSegments = page.locator('path.DonutChart__segment');
        this.donutChartLegendItems = page.locator('.DonutChart__legend__item');
        this.donutChartHoveredItem = page.locator('.DonutChart__legend__item--hovered');

        // Tabla Compañía
        this.companyTableRows = page.locator('.StatisticsTable__tbody-row');
        this.companyTableSelectedRow = page.locator('.StatisticsTable__tbody-row--selected');

        // Tabla Cliente
        this.clientSearchInput = page.locator('.StatisticsTable__search-input');
        this.clientSearchButton = page.locator('button').filter({ hasText: /Buscar|Borrar/i });
        this.clientSortProducto = page.locator('.StatisticsTable__sort-button').filter({ hasText: 'Producto' });
        this.clientSortCompania = page.locator('.StatisticsTable__sort-button').filter({ hasText: 'Compañía' });
        this.clientHeaderInfoButton = page.locator('button[aria-label="Más información"]');
        this.clientPaginationNext = page.locator('button[aria-label="Página siguiente"]');
        this.clientPaginationPrev = page.locator('button[aria-label="Página anterior"]');
        this.clientTableRows = page.locator('.StatisticsTable__tbody-row');

        // Empty State
        this.emptyStateTitle = page.getByText('Aún no hay datos disponibles', { exact: false });
        this.emptyStateText = page.locator('.Statistics__empty-state-text');
        this.emptyStateWhatsAppButton = page.locator('.Statistics__empty-state').getByRole('button', { name: /Contactar por WhatsApp/i });
    }

    /**
     * Navega a la página de Estadísticas desde el sidebar
     */
    async navigateFromSidebar(): Promise<void> {
        await this.sidebarStatisticsButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.sidebarStatisticsButton.click();
        await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });
    }

    /**
     * Navega directamente a la página de Estadísticas
     */
    async navigateToStatistics(): Promise<void> {
        await this.page.goto('http://localhost:3000/u/m/estadisticas', { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(2000);
    }

    /**
     * Verifica que la página de Estadísticas está cargada
     */
    async verifyStatisticsPage(): Promise<void> {
        await expect(this.page).toHaveURL(/.*\/u\/m\/estadisticas/);
        await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    }

    /**
     * Cambia al tab Compañía
     */
    async switchToCompaniaTab(): Promise<void> {
        await this.tabCompania.waitFor({ state: 'visible', timeout: 5000 });
        await this.tabCompania.click();
        await this.page.waitForTimeout(500);
        await expect(this.tabCompania).toHaveClass(/active/);
    }

    /**
     * Cambia al tab Ramo
     */
    async switchToRamoTab(): Promise<void> {
        await this.tabRamo.waitFor({ state: 'visible', timeout: 5000 });
        await this.tabRamo.click();
        await this.page.waitForTimeout(500);
        await expect(this.tabRamo).toHaveClass(/active/);
    }

    /**
     * Cambia al tab Cliente
     */
    async switchToClienteTab(): Promise<void> {
        await this.tabCliente.waitFor({ state: 'visible', timeout: 5000 });
        await this.tabCliente.click();
        await this.page.waitForTimeout(500);
        await expect(this.tabCliente).toHaveClass(/active/);
    }

    /**
     * Abre el modal de información
     */
    async openInfoModal(): Promise<void> {
        await this.infoLink.waitFor({ state: 'visible', timeout: 5000 });
        await this.infoLink.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Verifica que el modal de información está abierto
     */
    async verifyInfoModalOpen(): Promise<void> {
        await expect(this.modalWhatsAppButton).toBeVisible({ timeout: 5000 });
    }

    /**
     * Hace click en el botón de WhatsApp del modal y verifica el popup
     */
    async clickModalWhatsApp(): Promise<void> {
        const [popup] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.modalWhatsAppButton.click()
        ]);

        await expect(popup.url()).toContain('wa.me/5493518687927');
        await popup.close();
    }

    /**
     * Cierra el modal de información
     */
    async closeInfoModal(): Promise<void> {
        // Intentar cerrar con el botón de cerrar o haciendo click fuera
        const closeButton = this.page.locator('[aria-label="Cerrar"]').or(this.page.locator('button').filter({ hasText: /cerrar/i }).first());
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeButton.click();
        } else {
            // Si no hay botón visible, presionar Escape
            await this.page.keyboard.press('Escape');
        }
        await this.page.waitForTimeout(500);
    }

    /**
     * Selecciona una compañía en el filtro
     */
    async selectCompaniaFilter(value: string): Promise<void> {
        await this.filterCompania.click();
        await this.page.waitForTimeout(300);
        await this.page.getByText(value, { exact: true }).click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Selecciona un producto en el filtro
     */
    async selectProductoFilter(value: string): Promise<void> {
        await this.filterProducto.click();
        await this.page.waitForTimeout(300);
        await this.page.getByText(value, { exact: true }).click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Selecciona un período en el filtro
     */
    async selectPeriodoFilter(value: string): Promise<void> {
        await this.filterPeriodo.click();
        await this.page.waitForTimeout(300);
        await this.page.getByText(value, { exact: true }).click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Hace click en una barra del gráfico de barras
     */
    async clickBarChartBar(index: number = 0): Promise<void> {
        const bars = this.barChartBars;
        const count = await bars.count();
        if (count === 0) {
            throw new Error('No hay barras disponibles en el gráfico. El usuario no tiene datos suficientes.');
        }
        if (index >= count) {
            throw new Error(`Índice ${index} fuera de rango. Solo hay ${count} barras disponibles.`);
        }
        await bars.nth(index).click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Verifica que una barra está seleccionada
     */
    async verifyBarChartBarSelected(): Promise<void> {
        await expect(this.barChartSelectedBar.first()).toBeVisible({ timeout: 2000 });
    }

    /**
     * Hace click en un item de la leyenda del donut chart
     */
    async clickDonutChartLegendItem(index: number = 0): Promise<void> {
        const items = this.donutChartLegendItems;
        const count = await items.count();
        if (count === 0) {
            throw new Error('No hay items en la leyenda del donut chart. El usuario no tiene datos suficientes.');
        }
        if (index >= count) {
            throw new Error(`Índice ${index} fuera de rango. Solo hay ${count} items disponibles.`);
        }
        await items.nth(index).click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Verifica que un item del donut está hovered/seleccionado
     */
    async verifyDonutChartItemHovered(): Promise<void> {
        await expect(this.donutChartHoveredItem.first()).toBeVisible({ timeout: 2000 });
    }

    /**
     * Selecciona una fila de la tabla de Compañía
     */
    async selectCompanyTableRow(index: number = 0): Promise<void> {
        const rows = this.companyTableRows;
        const count = await rows.count();
        if (count === 0) {
            throw new Error('No hay filas disponibles en la tabla de Compañía. El usuario no tiene datos suficientes.');
        }
        if (index >= count) {
            throw new Error(`Índice ${index} fuera de rango. Solo hay ${count} filas disponibles.`);
        }
        await rows.nth(index).click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Verifica que una fila de la tabla está seleccionada
     */
    async verifyCompanyTableRowSelected(): Promise<void> {
        await expect(this.companyTableSelectedRow.first()).toBeVisible({ timeout: 2000 });
    }

    /**
     * Busca en la tabla de Cliente
     */
    async searchInClientTable(searchText: string): Promise<void> {
        await this.clientSearchInput.waitFor({ state: 'visible', timeout: 5000 });
        await this.clientSearchInput.fill(searchText);
        await this.page.waitForTimeout(300);
        // Presionar Enter o hacer click en buscar
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
    }

    /**
     * Limpia la búsqueda en la tabla de Cliente
     */
    async clearClientSearch(): Promise<void> {
        const clearButton = this.clientSearchButton.filter({ hasText: /Borrar/i });
        if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await clearButton.click();
            await this.page.waitForTimeout(500);
        }
    }

    /**
     * Ordena la tabla de Cliente por Producto
     */
    async sortClientTableByProducto(): Promise<void> {
        await this.clientSortProducto.waitFor({ state: 'visible', timeout: 5000 });
        await this.clientSortProducto.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Ordena la tabla de Cliente por Compañía
     */
    async sortClientTableByCompania(): Promise<void> {
        await this.clientSortCompania.waitFor({ state: 'visible', timeout: 5000 });
        await this.clientSortCompania.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Abre el modal de información del header de la tabla Cliente
     */
    async openClientHeaderInfo(): Promise<void> {
        await this.clientHeaderInfoButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.clientHeaderInfoButton.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Navega a la siguiente página en la tabla de Cliente
     */
    async goToNextPage(): Promise<void> {
        const nextButton = this.clientPaginationNext;
        const isVisible = await nextButton.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
            throw new Error('No hay paginación disponible. El usuario no tiene suficientes datos para múltiples páginas.');
        }
        await nextButton.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Navega a la página anterior en la tabla de Cliente
     */
    async goToPrevPage(): Promise<void> {
        const prevButton = this.clientPaginationPrev;
        const isVisible = await prevButton.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
            throw new Error('No hay paginación disponible o ya estás en la primera página.');
        }
        await prevButton.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Verifica que el Empty State está visible
     */
    async verifyEmptyState(): Promise<void> {
        await expect(this.emptyStateTitle).toBeVisible({ timeout: 10000 });
        await expect(this.emptyStateText).toBeVisible({ timeout: 5000 });
        await expect(this.emptyStateWhatsAppButton).toBeVisible({ timeout: 5000 });
    }

    /**
     * Hace click en el botón de WhatsApp del Empty State y verifica el popup
     */
    async clickEmptyStateWhatsApp(): Promise<void> {
        const [popup] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.emptyStateWhatsAppButton.click()
        ]);

        await expect(popup.url()).toContain('wa.me/5493518687927');
        await popup.close();
    }

    /**
     * Verifica que el usuario fue redirigido (no tiene acceso)
     */
    async verifyRedirected(): Promise<void> {
        await expect(this.page).toHaveURL(/^http:\/\/localhost:3000\/$/, { timeout: 10000 });
        await expect(this.pageTitle).not.toBeVisible({ timeout: 2000 });
    }
}



