import { expect, type Locator, type Page, type Response } from "@playwright/test";
import ComisionesPendientesAdmin from "../components/admin/comisionesPendientesAdmin";
import {
    esAprobarComision,
    esListadoComisiones,
    formatMedioDePago,
    formatMoney,
    formatTomadorDocumentos,
    formatTomadorNombre,
    formatVigencia,
    EMPTY_VALUE,
    type ComisionPendienteAP,
} from "../helpers/comisionesPendientes";

/**
 * Page Object de admin → Comisiones pendientes AP (POL-3273). La tabla no muestra el `_id`: las filas
 * se ubican por la posición de la emisión en la respuesta del GET (la UI respeta ese orden) y se
 * confirman con el nº de póliza.
 */
export default class AdminComisionesPendientesPage {
    readonly page: Page;
    readonly ui: ComisionesPendientesAdmin;
    /** Último listado que respondió el back (lo que la tabla debería estar mostrando). */
    emisiones: ComisionPendienteAP[] = [];

    constructor(page: Page) {
        this.page = page;
        this.ui = new ComisionesPendientesAdmin(page);
    }

    private async leerListado(response: Response): Promise<ComisionPendienteAP[]> {
        expect(response.ok(), `GET /comisiones-pendientes respondió ${response.status()}`).toBe(true);
        const body = await response.json();
        this.emisiones = Array.isArray(body?.emisiones) ? body.emisiones : [];
        return this.emisiones;
    }

    /** Navega directo a la ruta y espera el listado (tabla o estado vacío). */
    async goto(): Promise<ComisionPendienteAP[]> {
        const listPromise = this.page.waitForResponse(esListadoComisiones, { timeout: 60000 });
        await this.page.goto(this.ui.url);
        const emisiones = await this.leerListado(await listPromise);
        await this.esperarListadoRenderizado();
        return emisiones;
    }

    async irDesdeMenu(): Promise<ComisionPendienteAP[]> {
        await this.page.goto("/u/emision");
        await expect(this.ui.menuLink).toBeVisible({ timeout: 60000 });
        await this.ui.menuLink.hover();
        await expect(this.ui.menuTooltip).toBeVisible();
        const listPromise = this.page.waitForResponse(esListadoComisiones, { timeout: 60000 });
        await this.ui.menuLink.click();
        await expect(this.page).toHaveURL(/\/u\/comisiones-pendientes$/);
        const emisiones = await this.leerListado(await listPromise);
        await this.esperarListadoRenderizado();
        return emisiones;
    }

    async actualizar(): Promise<ComisionPendienteAP[]> {
        const listPromise = this.page.waitForResponse(esListadoComisiones, { timeout: 60000 });
        await this.ui.actualizarBtn.click();
        const emisiones = await this.leerListado(await listPromise);
        await this.esperarListadoRenderizado();
        return emisiones;
    }

    async esperarListadoRenderizado(): Promise<void> {
        await expect(this.ui.heading).toBeVisible();
        await expect(this.ui.cargando).toBeHidden({ timeout: 60000 });
        if (this.emisiones.length === 0) {
            await expect(this.ui.vacio).toBeVisible();
        } else {
            await expect(this.ui.filas).toHaveCount(this.emisiones.length);
        }
    }

    indiceDe(idEmision: string): number {
        return this.emisiones.findIndex((e) => e._id === idEmision);
    }

    /** Fila de la emisión según el último listado; falla si no está. */
    async fila(idEmision: string): Promise<Locator> {
        const index = this.indiceDe(idEmision);
        expect(index, `La emisión ${idEmision} no está en el listado de comisiones pendientes`).toBeGreaterThanOrEqual(0);
        const fila = this.ui.filas.nth(index);
        await expect(this.ui.celda(fila, 1)).toHaveText(this.emisiones[index].numeroPoliza || EMPTY_VALUE);
        return fila;
    }

    /** Verifica que la fila muestre cada dato del GET con el formato del tablero. */
    async assertFilaCoincide(fila: Locator, emision: ComisionPendienteAP): Promise<void> {
        const { ui } = this;
        await expect(ui.celda(fila, 0)).toContainText(emision.company || EMPTY_VALUE);
        await expect(ui.celda(fila, 0)).toContainText(emision.product || EMPTY_VALUE);
        await expect(ui.celda(fila, 1)).toHaveText(emision.numeroPoliza || EMPTY_VALUE);
        await expect(ui.celda(fila, 2)).toContainText(formatTomadorNombre(emision.client));
        const documentos = formatTomadorDocumentos(emision.client);
        if (documentos) await expect(ui.celda(fila, 2)).toContainText(documentos);
        await expect(ui.celda(fila, 2)).not.toContainText(/null|undefined|NaN/);
        await expect(ui.celda(fila, 3)).toContainText(emision.idAuth || EMPTY_VALUE);
        await expect(ui.celda(fila, 4)).toHaveText(formatMedioDePago(emision.infodePago?.formadePago));
        await expect(ui.celda(fila, 5)).toHaveText(formatVigencia(emision.vigenciaDesde, emision.vigenciaHasta));
        await expect(ui.celda(fila, 6)).toHaveText(formatMoney(emision.premium));
        await expect(ui.celda(fila, 7)).toHaveText(formatMoney(emision.comision));
    }

    async abrirConfirmacion(fila: Locator): Promise<void> {
        await this.ui.aprobarBtn(fila).click();
        await expect(this.ui.modal).toBeVisible();
    }

    /** Confirma el modal abierto y devuelve la respuesta del PATCH. */
    async confirmarAprobacion(idEmision: string): Promise<Response> {
        const patchPromise = this.page.waitForResponse(esAprobarComision(idEmision), { timeout: 60000 });
        await this.ui.modalAprobarBtn.click();
        const patch = await patchPromise;
        await expect(this.ui.modal).toBeHidden({ timeout: 30000 });
        return patch;
    }

    async aprobar(idEmision: string): Promise<Response> {
        await this.abrirConfirmacion(await this.fila(idEmision));
        return this.confirmarAprobacion(idEmision);
    }
}
