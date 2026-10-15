import { type Locator, type Page } from "@playwright/test";

export type EstadoOpfAdmin =
    | "Solicitud pendiente de cotización"
    | "Cotizada"
    | "Solicitud pendiente de emisión"
    | "Emitida"
    | "Cancelada";

/**
 * Admin (consola) — Emisiones por fuera (`/u/solicitudes/emisiones-por-fuera`).
 * Listado de tickets OPF, diálogo "Detalle del ticket <id>" y menú de cambio de estado
 * (Cotizada pide premio; Emitida pide los datos de emisión de la compañía).
 * El menú de estado se monta como `listbox` debajo del botón "Estado … Clic para cambiar estado".
 */
export default class EmisionesPorFueraAdmin {
    readonly page: Page;
    readonly url = "/u/solicitudes/emisiones-por-fuera";

    readonly heading: Locator;
    readonly idUsuarioInput: Locator;
    readonly usuarioInput: Locator;
    readonly apellidoClienteInput: Locator;
    readonly companiaSelect: Locator;
    readonly origenGroup: Locator;
    readonly estadoGroup: Locator;
    readonly verArchivadasBtn: Locator;
    readonly actualizarBtn: Locator;
    readonly tabla: Locator;
    readonly filas: Locator;

    readonly detalle: Locator;
    readonly detalleCerrarBtn: Locator;
    readonly detalleEstadoBtn: Locator;
    readonly detalleEstadoReadonly: Locator;
    readonly estadoMenu: Locator;
    readonly estadoMenuTitulo: Locator;
    readonly premioInput: Locator;
    readonly confirmarBtn: Locator;
    readonly volverBtn: Locator;
    readonly estadoError: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole("heading", { name: "Emisiones por fuera", level: 1 });

        const filtros = page.getByRole("region", { name: "Filtros de tickets" });
        this.idUsuarioInput = filtros.getByRole("textbox", { name: "ID usuario (Auth0)" });
        this.usuarioInput = filtros.getByRole("textbox", { name: "Usuario", exact: true });
        this.apellidoClienteInput = filtros.getByRole("textbox", { name: "Apellido del cliente" });
        this.companiaSelect = filtros.getByRole("combobox", { name: "Compañía" });
        this.origenGroup = filtros.getByRole("group", { name: "Origen" });
        this.estadoGroup = filtros.getByRole("group", { name: "Estado" });

        const acciones = page.getByRole("toolbar", { name: "Acciones del tablero" });
        this.verArchivadasBtn = acciones.getByRole("button", { name: "Ver archivadas" });
        this.actualizarBtn = acciones.getByRole("button", { name: "Actualizar listado" });

        this.tabla = page.getByRole("region", { name: "Listado de tickets" }).getByRole("table");
        this.filas = this.tabla.getByRole("rowgroup").nth(1).getByRole("row");

        this.detalle = page.getByRole("dialog", { name: /^Detalle del ticket / });
        this.detalleCerrarBtn = this.detalle.getByRole("button", { name: "Cerrar", exact: true });
        this.detalleEstadoBtn = this.detalle.getByRole("button", { name: /^Estado .*Clic para cambiar estado$/ });
        this.detalleEstadoReadonly = this.detalle.getByRole("region", { name: "Resumen" }).locator(".emisiones-por-fuera__estado-dropdown--readonly");
        this.estadoMenu = this.detalle.getByRole("listbox");
        this.estadoMenuTitulo = this.estadoMenu.getByText(/^Marcar como /);
        this.premioInput = this.estadoMenu.getByRole("spinbutton", { name: "Premio" });
        this.confirmarBtn = this.estadoMenu.getByRole("button", { name: "Confirmar", exact: true });
        this.volverBtn = this.estadoMenu.getByRole("button", { name: "Volver", exact: true });
        // El toast de éxito ("Estado actualizado") queda fuera del árbol accesible por el modal y se cierra solo:
        // el éxito se valida con el PATCH y con el estado del detalle.
        this.estadoError = this.estadoMenu.getByRole("alert");
    }

    filtroOrigen(origen: "Error" | "FP" | "Adicional"): Locator {
        return this.origenGroup.getByRole("button", { name: origen, exact: true });
    }

    filtroEstado(estado: EstadoOpfAdmin): Locator {
        return this.estadoGroup.getByRole("button", { name: estado, exact: true });
    }

    /** Botón de estado de una fila del listado (abre el mismo menú que el del detalle). */
    filaEstadoBtn(fila: Locator): Locator {
        return fila.getByRole("button", { name: /^Estado .*Clic para cambiar estado$/ });
    }

    /** La fila es clickeable en cualquier celda salvo la de estado: se abre por la primera. */
    filaAbrirDetalle(fila: Locator): Locator {
        return fila.getByRole("cell").first();
    }

    detalleTitulo(opfId: string): Locator {
        return this.detalle.getByRole("heading", { name: `Detalle del ticket ${opfId}`, level: 2 });
    }

    detalleEstadoActual(estado: EstadoOpfAdmin): Locator {
        return this.detalle.getByRole("region", { name: "Resumen" }).getByText(estado, { exact: true });
    }

    estadoOpcion(estado: EstadoOpfAdmin): Locator {
        return this.estadoMenu.getByRole("button", { name: estado, exact: true });
    }

    /** Campos de "Marcar como Emitida": el aria-label es el label del schema de la compañía (p. ej. "Número de póliza"). */
    datoEmisionInput(label: string): Locator {
        return this.estadoMenu.getByRole("textbox", { name: label, exact: true });
    }
}
