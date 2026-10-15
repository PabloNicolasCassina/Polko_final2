import { expect, type Page, type Response } from "@playwright/test";
import EmisionesPorFueraAdmin, { type EstadoOpfAdmin } from "../components/admin/emisionesPorFueraAdmin";
import { extractOpfListItems, isOpfListResponse, isOpfPatchResponse } from "../helpers/opfMocks";

function isAdminListResponse(response: Response): boolean {
    return isOpfListResponse(response) && new URL(response.url()).searchParams.get("origin") === "admin";
}

export interface CambioEstadoAdmin {
    premio?: number;
    datosEmision?: Record<string, string>;
}

/**
 * Page Object de admin → Emisiones por fuera. Admin no tiene URL por ticket ni muestra el ID en el
 * listado: se filtra por compañía, se ubica la fila por la posición del `_id` en la respuesta del
 * listado (misma orden que la tabla) y se confirma con el título del diálogo de detalle.
 */
export default class AdminEmisionesPorFueraPage {
    readonly page: Page;
    readonly ui: EmisionesPorFueraAdmin;

    constructor(page: Page) {
        this.page = page;
        this.ui = new EmisionesPorFueraAdmin(page);
    }

    async goto(): Promise<void> {
        const listPromise = this.page.waitForResponse(isAdminListResponse, { timeout: 60000 });
        await this.page.goto(this.ui.url);
        const list = await listPromise;
        expect(list.ok(), `Listado de admin respondió ${list.status()}`).toBe(true);
        await expect(this.ui.heading).toBeVisible();
    }

    /** Abre el detalle del ticket y devuelve su ítem del listado (`status`, `request`, …). */
    async abrirTicket(opfId: string, companyEnum: string): Promise<any> {
        const listPromise = this.page.waitForResponse(
            (response) =>
                isAdminListResponse(response)
                && new URL(response.url()).searchParams.get("company") === companyEnum,
            { timeout: 60000 },
        );
        await this.ui.companiaSelect.selectOption(companyEnum);
        const items = extractOpfListItems(await (await listPromise).json());
        const index = items.findIndex((item) => (item._id ?? item.id) === opfId);
        expect(index, `${opfId} no está en la primera página de admin filtrando por ${companyEnum}`).toBeGreaterThanOrEqual(0);

        const fila = this.ui.filas.nth(index);
        await expect(this.ui.filas).toHaveCount(items.length);
        await this.ui.filaAbrirDetalle(fila).click();
        await expect(this.ui.detalleTitulo(opfId)).toBeVisible();
        return items[index];
    }

    /** Cambia el estado desde el diálogo de detalle abierto y devuelve el body del PATCH. */
    async cambiarEstado(opfId: string, estado: EstadoOpfAdmin, datos: CambioEstadoAdmin = {}): Promise<any> {
        await this.ui.detalleEstadoBtn.click();
        await this.ui.estadoOpcion(estado).click();
        await expect(this.ui.estadoMenuTitulo).toBeVisible();

        for (const [label, valor] of Object.entries(datos.datosEmision ?? {})) {
            await this.ui.datoEmisionInput(label).fill(valor);
        }
        if (await this.ui.premioInput.isVisible()) {
            expect(datos.premio, `admin pide premio para pasar a "${estado}"`).toBeTruthy();
            await this.ui.premioInput.fill(String(datos.premio));
        }

        const patchPromise = this.page.waitForResponse(isOpfPatchResponse(opfId), { timeout: 60000 });
        await this.ui.confirmarBtn.click();
        const patch = await patchPromise;
        expect(patch.ok(), `PATCH de admin respondió ${patch.status()}`).toBe(true);

        await expect(this.ui.estadoError).toBeHidden();
        await expect(this.ui.detalleEstadoActual(estado)).toBeVisible();
        return patch.request().postDataJSON();
    }

    async cerrarDetalle(): Promise<void> {
        await this.ui.detalleCerrarBtn.click();
        await expect(this.ui.detalle).toBeHidden();
    }
}
