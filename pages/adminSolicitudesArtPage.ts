import { expect, type Page, type Response } from "@playwright/test";
import SolicitudesArtAdmin, { type TabArtAdmin } from "../components/admin/solicitudesArtAdmin";

export interface CotizacionArtAdmin {
    /** Enum de la API (`Prevencion`, `Federacion_Patronal`, …). */
    company: string;
    /** Solo régimen general: el modal de especial no pide alícuota. */
    alicuota?: number;
}

export interface EmisionArtAdmin {
    numeroContrato: string;
    /** PDF que se adjunta como "Contrato" (el primer archivo toma ese tipo por defecto). */
    contrato: { name: string; buffer: Buffer };
}

const TIPO_POR_TAB: Record<TabArtAdmin, string> = {
    Cotizaciones: "cotizacion",
    Emisiones: "emision",
    Historial: "emision",
};

function esListadoArt(tab: TabArtAdmin) {
    return (response: Response): boolean => {
        const url = new URL(response.url());
        if (response.request().method() !== "GET") return false;
        if (tab === "Historial") return url.pathname.endsWith("/emision/art");
        return url.pathname.endsWith("/solicitudes/art") && url.searchParams.get("tipo") === TIPO_POR_TAB[tab];
    };
}

function esDetalleArt(tipo: "cotizacion" | "emision", id: string, method = "GET") {
    return (response: Response): boolean =>
        response.request().method() === method && new URL(response.url()).pathname.endsWith(`/${tipo}/art/${id}`);
}

/**
 * Page Object de admin → Solicitudes ART. Admin no tiene URL por solicitud: se abre el tab, se ubica
 * la fila por el ID (columna "ID") y se espera el GET de detalle antes de operar el modal.
 * Las validaciones del modal usan `alert()`: se capturan para que un error de formulario no quede
 * como un timeout esperando el PATCH.
 */
export default class AdminSolicitudesArtPage {
    readonly page: Page;
    readonly ui: SolicitudesArtAdmin;

    constructor(page: Page) {
        this.page = page;
        this.ui = new SolicitudesArtAdmin(page);
        page.on("dialog", (dialog) => dialog.dismiss().catch(() => undefined));
    }

    async goto(): Promise<void> {
        const listPromise = this.page.waitForResponse(esListadoArt("Cotizaciones"), { timeout: 60000 });
        await this.page.goto(this.ui.url);
        const list = await listPromise;
        expect(list.ok(), `Listado de cotizaciones ART respondió ${list.status()}`).toBe(true);
        await expect(this.ui.heading).toBeVisible();
    }

    /** Abre el modal de la solicitud `id` en `tab` y devuelve su detalle (GET por ID). */
    async abrirSolicitud(tab: TabArtAdmin, id: string): Promise<any> {
        if ((await this.ui.tab(tab).getAttribute("aria-selected")) !== "true") {
            const listPromise = this.page.waitForResponse(esListadoArt(tab), { timeout: 60000 });
            await this.ui.tab(tab).click();
            expect((await listPromise).ok(), `Listado ART (${tab}) falló`).toBe(true);
        }
        const fila = this.ui.fila(id);
        await expect(fila, `${id} no está en la primera página de ${tab} en admin`).toHaveCount(1, { timeout: 30000 });

        const tipo = tab === "Cotizaciones" ? "cotizacion" : "emision";
        const detallePromise = this.page.waitForResponse(esDetalleArt(tipo, id), { timeout: 60000 });
        await fila.click();
        const detalle = await detallePromise;
        expect(detalle.ok(), `GET ${tipo} ${id} respondió ${detalle.status()}`).toBe(true);
        const titulo = tab === "Cotizaciones" ? "Detalle de Cotización" : "Detalle de Emisión";
        await expect(this.ui.modalTitulo).toHaveText(`${titulo} - ${id}`);
        return detalle.json();
    }

    /** Marca la cotización abierta como "Cotizada" con `cotizaciones` y devuelve el body del PATCH. */
    async cotizar(id: string, cotizaciones: CotizacionArtAdmin[]): Promise<any> {
        await this.ui.estadoSelect.selectOption("Success");
        for (const [index, cotizacion] of cotizaciones.entries()) {
            if ((await this.ui.cotizacionItems.count()) <= index) await this.ui.agregarCotizacionBtn.click();
            await this.ui.cotizacionAseguradoraSelect(index).selectOption(cotizacion.company);
            if (cotizacion.alicuota !== undefined) {
                await this.ui.cotizacionAlicuotaInput(index).fill(String(cotizacion.alicuota));
            }
        }
        return this.guardar("cotizacion", id);
    }

    /** "Emitir" la emisión abierta con número de contrato y PDF; devuelve el body del PATCH. */
    async emitir(id: string, datos: EmisionArtAdmin): Promise<any> {
        await this.ui.accionSelect.selectOption("Success");
        await this.ui.numeroContratoInput.fill(datos.numeroContrato);
        await this.ui.documentacionInput.setInputFiles({
            name: datos.contrato.name,
            mimeType: "application/pdf",
            buffer: datos.contrato.buffer,
        });
        await expect(this.ui.documentosCargados).toHaveCount(1);
        return this.guardar("emision", id);
    }

    private async guardar(tipo: "cotizacion" | "emision", id: string): Promise<any> {
        const patchPromise = this.page.waitForResponse(esDetalleArt(tipo, id, "PATCH"), { timeout: 60000 });
        const alertPromise = this.page.waitForEvent("dialog", { timeout: 60000 }).then((dialog) => dialog.message());
        patchPromise.catch(() => undefined);
        alertPromise.catch(() => undefined);
        await this.ui.guardarBtn.click();
        const resultado = await Promise.race([
            patchPromise.then((patch) => ({ patch, alert: null })),
            alertPromise.then((alert) => ({ patch: null, alert })),
        ]);
        if (!resultado.patch) throw new Error(`Admin no guardó ${tipo} ${id}: "${resultado.alert}"`);
        const patch = resultado.patch;
        const detalleError = patch.ok() ? "" : `: ${(await patch.text().catch(() => "")).slice(0, 500)}`;
        expect(patch.ok(), `PATCH ${tipo} ${id} respondió ${patch.status()}${detalleError}`).toBe(true);
        await expect(this.ui.notificacionError).toBeHidden();
        await expect(this.ui.modal).toBeHidden({ timeout: 30000 });
        return patch.request().postDataJSON();
    }
}
