import { Page, Locator, expect } from "@playwright/test";
import SaldoSection from "../components/billetera/saldoSection";
import MovimientosTable from "../components/billetera/movimientosTable";
import RetiroModal from "../components/billetera/retiroModal";
import RetiroConfirmacion from "../components/billetera/retiroConfirmacion";
import CommonButtons from "../components/commonButtons";

export default class BilleteraPage {
    readonly page: Page;
    readonly commonButtons: CommonButtons;

    readonly saldoSection: SaldoSection;
    readonly movimientosTable: MovimientosTable;
    readonly retiroModal: RetiroModal;
    readonly retiroConfirmacion: RetiroConfirmacion;

    readonly billeteraContainer: Locator;
    readonly tituloBilletera: Locator;

    constructor(page: Page) {
        this.page = page;
        this.commonButtons = new CommonButtons(page);

        this.saldoSection = new SaldoSection(page);
        this.movimientosTable = new MovimientosTable(page);
        this.retiroModal = new RetiroModal(page);
        this.retiroConfirmacion = new RetiroConfirmacion(page);

        this.billeteraContainer = page.locator('.billetera__container');
        this.tituloBilletera = page.locator('.billetera__title').first();
    }

    async navigate(): Promise<void> {
        await this.page.goto("http://localhost:3000/u/billetera", {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await this.waitForLoad();
    }

    async navegarDesdeSidebar(): Promise<void> {
        await this.saldoSection.navegarABilletera();
        await this.waitForLoad();
    }

    async waitForLoad(): Promise<void> {
        await this.billeteraContainer.waitFor({ state: 'visible', timeout: 30000 });
        await this.page.locator('.billetera__title').first().waitFor({ state: 'visible', timeout: 15000 });
        await this.page.waitForTimeout(2000);
    }

    async realizarRetiro(): Promise<boolean> {
        await this.saldoSection.clickRetirarFondos();
        
        const modalAbierto = await this.retiroModal.estaAbierto();
        if (!modalAbierto) {
            throw new Error('No se abrió el modal de retiro');
        }

        const puedeExtraer = await this.retiroModal.puedeExtraer();
        if (!puedeExtraer) {
            const legend = await this.retiroModal.getLegendText();
            const error = await this.retiroModal.getErrorText();
            console.log(`No se puede extraer: ${legend} ${error}`);
            return false;
        }

        await this.retiroModal.clickExtraer();
        
        await this.retiroConfirmacion.esperarConfirmacion();
        
        return await this.retiroConfirmacion.verificarExitoVisible();
    }

    async getResumenBilletera(): Promise<{
        disponible: number;
        pendiente: number;
        retenido: number;
        total: number;
    }> {
        const disponible = await this.saldoSection.getSaldoDisponible();
        const pendiente = await this.saldoSection.getSaldoPendiente();
        const retenido = await this.saldoSection.getSaldoRetenido();
        
        return {
            disponible,
            pendiente,
            retenido,
            total: disponible + pendiente + retenido
        };
    }

    async abrirHistorial(): Promise<void> {
        await this.saldoSection.clickVerHistorial();
        await this.page.locator('.comHistModal__title').waitFor({ state: 'visible', timeout: 15000 });
    }

    async cerrarHistorial(): Promise<void> {
        await this.movimientosTable.cerrar();
    }

    async validarMovimientoRetiro(monto: string, estado?: string): Promise<boolean> {
        await this.abrirHistorial();
        const tieneDatos = await this.movimientosTable.verificarTablaTieneDatos();
        if (!tieneDatos) {
            await this.cerrarHistorial();
            return false;
        }
        
        const movimiento = await this.movimientosTable.buscarMovimientoPorDescripcion(monto);
        await this.cerrarHistorial();
        
        return movimiento !== null;
    }

    async refresh(): Promise<void> {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.waitForLoad();
    }
}
