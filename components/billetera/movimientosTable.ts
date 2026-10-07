import { Page, Locator, expect } from "@playwright/test";

export interface MovimientoData {
    idOperacion: string;
    monto: string;
    fecha: string;
    estado: string;
}

export default class MovimientosTable {
    readonly page: Page;

    readonly modalContainer: Locator;
    readonly modalTitle: Locator;
    readonly btnCerrar: Locator;
    readonly tableContainer: Locator;
    readonly rows: Locator;
    readonly filterContainer: Locator;
    readonly dateFilter: Locator;

    constructor(page: Page) {
        this.page = page;
        
        this.modalContainer = page.locator('.customModal__container');
        this.modalTitle = page.locator('.comHistModal__title');
        this.btnCerrar = page.locator('.comHistModal__icon__container');
        this.tableContainer = page.locator('.comHistModal__body__table');
        this.rows = page.locator('.mantine-Table-tbody tr');
        this.filterContainer = page.locator('.comHistModal__filter__container');
        this.dateFilter = page.locator('input[placeholder="Fecha"]');
    }

    async estaAbierto(): Promise<boolean> {
        return await this.modalTitle.isVisible().catch(() => false);
    }

    async cerrar(): Promise<void> {
        await this.btnCerrar.click();
        await this.modalContainer.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    async getRowCount(): Promise<number> {
        return await this.rows.count();
    }

    async getMovimientoData(index: number): Promise<MovimientoData | null> {
        const row = this.rows.nth(index);
        const cells = await row.locator('td').all();
        
        if (cells.length < 4) return null;
        
        const idOperacion = await cells[0]?.textContent() || '';
        const monto = await cells[1]?.textContent() || '';
        const fecha = await cells[2]?.textContent() || '';
        const estado = await cells[3]?.textContent() || '';
        
        return {
            idOperacion: idOperacion.trim(),
            monto: monto.trim(),
            fecha: fecha.trim(),
            estado: estado.trim()
        };
    }

    async verificarTablaTieneDatos(): Promise<boolean> {
        const count = await this.getRowCount();
        return count > 0;
    }

    async buscarMovimientoPorDescripcion(descripcion: string): Promise<MovimientoData | null> {
        const count = await this.getRowCount();
        
        for (let i = 0; i < count; i++) {
            const mov = await this.getMovimientoData(i);
            if (mov?.idOperacion.toLowerCase().includes(descripcion.toLowerCase())) {
                return mov;
            }
        }
        
        return null;
    }

    async hasMovimientosTipo(tipo: 'ingreso' | 'egreso'): Promise<boolean> {
        return await this.verificarTablaTieneDatos();
    }

    async filtrarPorTipo(tipo: string): Promise<void> {
    }

    async buscar(texto: string): Promise<void> {
    }

    async limpiarFiltros(): Promise<void> {
    }

    private parseMonto(montoText: string): number {
        const cleanText = montoText
            .replace(/\$/g, '')
            .replace(/\s/g, '')
            .replace(/-/g, '')
            .trim();
        
        const normalized = cleanText
            .replace(/\./g, '')
            .replace(',', '.');
        
        const monto = parseFloat(normalized);
        return isNaN(monto) ? 0 : monto;
    }
}
