import { type Locator, type Page } from "@playwright/test";

/**
 * Admin (consola) — Comisiones pendientes AP (`/u/comisiones-pendientes`, POL-3273).
 * Tabla Mantine sin paginar (una fila por emisión, mismo orden que `GET /comisiones-pendientes`),
 * botón "Aprobar" por fila con modal de confirmación y notificaciones Mantine
 * (verde "Comisión aprobada", amarilla "La emisión ya no está pendiente", roja "No se pudo aprobar la comisión").
 * El link del menú lateral es un ícono sin nombre accesible (tooltip "Comisiones pendientes AP").
 */
export default class ComisionesPendientesAdmin {
    readonly page: Page;
    readonly url = "/u/comisiones-pendientes";

    readonly menuLink: Locator;
    readonly menuTooltip: Locator;

    readonly heading: Locator;
    readonly actualizarBtn: Locator;
    readonly contador: Locator;
    readonly cargando: Locator;
    readonly vacio: Locator;
    readonly errorListado: Locator;
    readonly reintentarBtn: Locator;

    readonly tabla: Locator;
    readonly encabezados: Locator;
    readonly filas: Locator;

    readonly modal: Locator;
    readonly modalCancelarBtn: Locator;
    readonly modalAprobarBtn: Locator;

    readonly notificacionAprobada: Locator;
    readonly notificacionNoPendiente: Locator;
    readonly notificacionError: Locator;

    constructor(page: Page) {
        this.page = page;
        this.menuLink = page.locator("nav button:has(svg.icon-tabler-wallet)");
        this.menuTooltip = page.getByRole("tooltip", { name: "Comisiones pendientes AP" });

        this.heading = page.getByRole("heading", { name: "Comisiones pendientes AP", level: 1 });
        this.actualizarBtn = page.getByRole("button", { name: "Actualizar", exact: true });
        this.contador = page.getByText(/^\d+ comisi(ón|ones) pendientes?$/);
        this.cargando = page.getByText("Cargando comisiones pendientes...", { exact: true });
        this.vacio = page.getByRole("status").filter({ hasText: "No hay comisiones pendientes de aprobar." });
        this.errorListado = page.getByRole("alert").filter({ hasText: "No se pudo cargar el listado" });
        this.reintentarBtn = this.errorListado.getByRole("button", { name: "Reintentar" });

        this.tabla = page.getByRole("table");
        this.encabezados = this.tabla.getByRole("rowgroup").first().getByRole("cell");
        this.filas = this.tabla.getByRole("rowgroup").nth(1).getByRole("row");

        this.modal = page.getByRole("dialog", { name: "Aprobar comisión" });
        this.modalCancelarBtn = this.modal.getByRole("button", { name: "Cancelar", exact: true });
        this.modalAprobarBtn = this.modal.getByRole("button", { name: "Aprobar", exact: true });

        this.notificacionAprobada = page.getByRole("alert").filter({ hasText: "Comisión aprobada" });
        this.notificacionNoPendiente = page.getByRole("alert").filter({ hasText: "La emisión ya no está pendiente" });
        this.notificacionError = page.getByRole("alert").filter({ hasText: "No se pudo aprobar la comisión" });
    }

    /** Celdas de una fila: 0 compañía/producto, 1 póliza, 2 tomador, 3 polkista, 4 medio de pago, 5 vigencia, 6 prima, 7 comisión, 8 acción. */
    celda(fila: Locator, index: number): Locator {
        return fila.getByRole("cell").nth(index);
    }

    aprobarBtn(fila: Locator): Locator {
        return fila.getByRole("button", { name: /^Aprobar comisión de la / });
    }

    copiarIdAuthBtn(fila: Locator): Locator {
        return fila.getByRole("button", { name: "Copiar idAuth del polkista" });
    }

    filaPorPoliza(numeroPoliza: string): Locator {
        return this.filas.filter({ has: this.page.getByRole("cell", { name: numeroPoliza, exact: true }) });
    }
}
