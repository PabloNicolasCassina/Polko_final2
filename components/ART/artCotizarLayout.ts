import { Page, Locator, expect } from "@playwright/test";

/** Locators del cotizador ART rediseñado (POL-2882). */
export default class ArtCotizarLayout {
    readonly page: Page;
    readonly productHeading: Locator;
    readonly productSubtitle: Locator;
    readonly sidebarTitle: Locator;
    readonly verTodasBtn: Locator;
    readonly faqTitle: Locator;
    readonly empleadorHeading: Locator;
    readonly empleadorInput: Locator;
    readonly cuitInput: Locator;
    readonly f931Label: Locator;
    readonly siguienteBtn: Locator;
    readonly cotizarBtn: Locator;
    readonly regimenSelect: Locator;
    readonly cantEmpleadosInput: Locator;
    readonly masaSalarialInput: Locator;
    readonly horasSelect: Locator;
    readonly successPopupTitle: Locator;
    readonly verMisSolicitudesBtn: Locator;
    readonly cerrarPopupBtn: Locator;
    readonly compararSticky: Locator;
    readonly cotizarOtrasOpcionesBtn: Locator;
    readonly verDiferencialesBtn: Locator;
    readonly emitirOfferBtn: Locator;
    readonly agregarBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.productHeading = page.getByRole("heading", { name: "ART", exact: true });
        this.productSubtitle = page.getByText(/Cargá los datos del empleador/i);
        this.sidebarTitle = page.getByText("Solicitudes", { exact: true });
        this.verTodasBtn = page.getByRole("button", { name: "Ver todas" });
        this.faqTitle = page.getByText("Sobre el producto ART");
        this.empleadorHeading = page.getByRole("heading", { name: "Datos del empleador" });
        this.empleadorInput = page.locator("#input_empleador");
        this.cuitInput = page.locator("#number_cuit");
        this.f931Label = page.getByText("F.931 (opcional)");
        this.siguienteBtn = page.getByRole("button", { name: "Siguiente" });
        this.cotizarBtn = page.getByRole("button", { name: /^cotizar$/i });
        this.regimenSelect = page.locator("#select_regimen");
        this.cantEmpleadosInput = page.locator("#number_cantidadEmpleados");
        this.masaSalarialInput = page.locator("#number_masaSalarial");
        this.horasSelect = page.locator("#select_cantidadHoras");
        this.successPopupTitle = page.getByRole("heading", { name: "Solicitud enviada" });
        this.verMisSolicitudesBtn = page.getByRole("button", { name: "Ver mis solicitudes" });
        this.cerrarPopupBtn = page.getByRole("button", { name: "Cerrar" });
        this.compararSticky = page.getByRole("button", { name: /COMPARAR \(\d+\)/i });
        this.cotizarOtrasOpcionesBtn = page.getByRole("button", { name: /Cotizar otras opciones/i });
        this.verDiferencialesBtn = page.getByRole("button", { name: /Ver diferenciales/i });
        this.emitirOfferBtn = page.getByRole("button", { name: /^Emitir$/i });
        this.agregarBtn = page.getByRole("button", { name: /^Agregar$/i });
    }

    async gotoCotizar() {
        await this.page.goto("http://localhost:3000/u/cotizar/art", {
            waitUntil: "domcontentloaded",
            timeout: 120000,
        });
        await expect(this.empleadorHeading).toBeVisible({ timeout: 60000 });
    }

    async assertExtendedLayout() {
        await expect(this.productHeading).toBeVisible();
        await expect(this.productSubtitle).toBeVisible();
        await expect(this.sidebarTitle).toBeVisible();
        await expect(this.faqTitle).toBeVisible();
        await expect(this.empleadorHeading).toBeVisible();
        await expect(this.empleadorInput).toBeVisible();
        await expect(this.cuitInput).toBeVisible();
        await expect(this.page.getByText(/Seleccioná las compañías|Seleccionar compañías/i)).toHaveCount(0);
        await expect(this.page.getByText("Configuración avanzada")).toHaveCount(0);
    }

    async fillEmpleador(empleador: string, cuit: string) {
        await this.empleadorInput.fill(empleador);
        await this.cuitInput.fill(cuit);
        await this.siguienteBtn.click();
        await expect(this.page.getByRole("heading", { name: "Datos de los empleados" })).toBeVisible({
            timeout: 30000,
        });
    }

    async selectRegimen(label: "Régimen General" | "Régimen Especial") {
        await this.regimenSelect.click();
        await this.page.getByRole("option", { name: label, exact: true }).click();
    }

    async selectHoras(label: string) {
        await this.horasSelect.click();
        await this.page.getByRole("option", { name: label, exact: true }).click();
    }

    async assertSidebarSolicitudes() {
        await expect(this.sidebarTitle).toBeVisible();
        await expect(this.page.getByText(/Estado de tus últimas solicitudes/i)).toBeVisible();
        await expect(this.verTodasBtn).toBeVisible();
    }
}
