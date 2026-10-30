import { type Locator, type Page } from "@playwright/test";

export type TabArtAdmin = "Cotizaciones" | "Emisiones" | "Historial";

/**
 * Admin (consola) — Administrador de Solicitudes ART (`/u/solicitudes/art`).
 * Tabs Cotizaciones / Emisiones / Historial, tabla con el ID en la última columna y un modal
 * de detalle por tipo: "Detalle de Cotización - <id>" (estado + aseguradoras con alícuota) y
 * "Detalle de Emisión - <id>" (acción por paso; "Emitir" pide número de contrato y PDF).
 * Los labels del formulario no están asociados a sus controles: se ubican por el `.form-group`.
 */
export default class SolicitudesArtAdmin {
    readonly page: Page;
    readonly url = "/u/solicitudes/art";

    readonly heading: Locator;
    readonly tabla: Locator;
    readonly filas: Locator;
    readonly actualizarBtn: Locator;

    readonly modal: Locator;
    readonly modalTitulo: Locator;
    readonly estadoSelect: Locator;
    readonly accionSelect: Locator;
    readonly agregarCotizacionBtn: Locator;
    readonly cotizacionItems: Locator;
    readonly numeroContratoInput: Locator;
    readonly documentacionInput: Locator;
    readonly documentosCargados: Locator;
    readonly guardarBtn: Locator;
    readonly notificacionError: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole("heading", { name: "Administrador de Solicitudes ART", level: 1 });
        this.tabla = page.getByRole("region", { name: "Listado de solicitudes" }).getByRole("table");
        this.filas = this.tabla.locator("tbody tr");
        this.actualizarBtn = page.getByRole("toolbar", { name: "Acciones del listado" }).getByRole("button", {
            name: "Actualizar listado",
        });

        this.modal = page.locator(".modal");
        this.modalTitulo = this.modal.locator(".modal-header h2");
        this.estadoSelect = this.campo("Estado").locator("select");
        this.accionSelect = this.campo("Acción").locator("select");
        this.agregarCotizacionBtn = this.modal.getByRole("button", { name: /Agregar Cotización/ });
        this.cotizacionItems = this.modal.locator(".cotizacion-item");
        this.numeroContratoInput = this.campo("Número de Contrato").locator("input");
        this.documentacionInput = this.campo("Documentación (PDF)").locator("input[type='file']");
        this.documentosCargados = this.campo("Documentación (PDF)").locator(".file-item");
        this.guardarBtn = this.modal.getByRole("button", { name: "Guardar Cambios" });
        this.notificacionError = page.locator(".notification.error");
    }

    tab(nombre: TabArtAdmin): Locator {
        return this.page.getByRole("tablist").getByRole("tab", { name: nombre, exact: true });
    }

    fila(id: string): Locator {
        return this.filas.filter({ hasText: id });
    }

    /** `.form-group` del modal cuyo label es exactamente `label`. */
    campo(label: string): Locator {
        return this.modal
            .locator(".form-group")
            .filter({ has: this.page.locator("label.form-label").getByText(label, { exact: true }) });
    }

    cotizacionAseguradoraSelect(index: number): Locator {
        return this.cotizacionItems.nth(index).locator("select");
    }

    cotizacionAlicuotaInput(index: number): Locator {
        return this.cotizacionItems.nth(index).locator("input[type='number']");
    }
}
