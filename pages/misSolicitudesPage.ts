import { expect, type Locator, type Page } from "@playwright/test";
import { isCompactViewport } from "../helpers/viewport";

export type MisSolicitudesTab = "Aseguradoras" | "Automotor" | "ART";

/**
 * Page Object de Mis solicitudes (`/u/missolicitudes`).
 * Solo el panel de la pestaña activa está montado, así que los locators de listado
 * (compartidos por Automotor y ART) apuntan siempre a la pestaña visible.
 */
export default class MisSolicitudesPage {
    readonly page: Page;

    readonly header: Locator;

    readonly aseguradorasSection: Locator;
    readonly aseguradorasTitle: Locator;
    readonly aseguradorasEmptyMessage: Locator;

    readonly listTitle: Locator;
    readonly listSubtitle: Locator;
    readonly counter: Locator;
    readonly emptyState: Locator;
    readonly pagination: Locator;

    readonly automotorFilters: Locator;
    readonly automotorFiltersToggle: Locator;
    readonly automotorFiltersPanel: Locator;
    readonly automotorSearchInput: Locator;
    readonly automotorCompanySelect: Locator;
    readonly automotorStatusSelect: Locator;
    readonly automotorCards: Locator;

    readonly artFilters: Locator;
    readonly artEmpleadorInput: Locator;
    readonly artTipoSelect: Locator;
    readonly artWhatsappButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = page.locator(".MisSolicitudes__header");

        this.aseguradorasSection = page.locator(".AseguradorasSection");
        this.aseguradorasTitle = page.locator("#aseguradoras-heading");
        this.aseguradorasEmptyMessage = page.locator(".AseguradorasSection__emptyMessage");

        this.listTitle = page.locator(".MiCarteraEmissions__title");
        this.listSubtitle = page.locator(".MiCarteraEmissions__subtitle");
        this.counter = page.locator(".MiCarteraEmissions__counter");
        this.emptyState = page.locator(".MiCarteraEmissions__emptyState");
        this.pagination = page.getByText(/Página \d+ de \d+/);

        // <= 1024px el CSS oculta los filtros desktop y muestra buscador + "Filtros" (panel colapsable).
        this.automotorFilters = isCompactViewport(page)
            ? page.locator(".MiCarteraEmissions__filtersMobile")
            : page.locator(".MiCarteraEmissions__filters--desktop");
        this.automotorFiltersToggle = this.automotorFilters.locator(".MiCarteraEmissions__filtersToggle");
        this.automotorFiltersPanel = this.automotorFilters.locator(".MiCarteraEmissions__filtersPanel--mobile");
        this.automotorSearchInput = isCompactViewport(page)
            ? this.automotorFilters.locator(".MiCarteraEmissions__filter--search input")
            : this.automotorFilters.locator('input[placeholder="Buscar"]');
        this.automotorCompanySelect = this.automotorFilters.locator('input[placeholder="Compañía"]');
        this.automotorStatusSelect = this.automotorFilters.locator('input[placeholder="Estado"]');
        this.automotorCards = page.locator(".MiCarteraEmissionCard");

        this.artFilters = page.locator(".ArtSolicitudes__filters");
        this.artEmpleadorInput = this.artFilters.locator('input[placeholder="Empleador"]');
        this.artTipoSelect = this.artFilters.locator('input[placeholder="Tipo"]');
        this.artWhatsappButton = page
            .locator(".MiCarteraEmissions__headerActions")
            .getByRole("button", { name: /Contactar por WhatsApp/ });
    }

    tab(name: MisSolicitudesTab): Locator {
        return this.page.getByRole("tab", { name, exact: true });
    }

    async navigate(): Promise<void> {
        await this.page.goto("http://localhost:3000/u/missolicitudes", {
            waitUntil: "domcontentloaded",
            timeout: 120000,
        });
        await expect(this.header).toBeVisible({ timeout: 60000 });
    }

    async irATab(name: MisSolicitudesTab): Promise<void> {
        await this.tab(name).click();
        await expect(this.tab(name)).toHaveAttribute("aria-selected", "true");
        if (name === "Automotor") {
            await this.abrirFiltrosAutomotorSiMobile();
        }
    }

    /** En mobile los selects de Automotor viven en un panel colapsable detrás de "Filtros". Idempotente. */
    async abrirFiltrosAutomotorSiMobile(): Promise<void> {
        if (!isCompactViewport(this.page)) return;
        if (await this.automotorFiltersPanel.isVisible().catch(() => false)) return;
        await this.automotorFiltersToggle.click();
        await expect(this.automotorFiltersPanel).toBeVisible({ timeout: 10000 });
    }

    private async abrirFiltrosSiSelectAutomotor(selectInput: Locator): Promise<void> {
        if (selectInput === this.automotorCompanySelect || selectInput === this.automotorStatusSelect) {
            await this.abrirFiltrosAutomotorSiMobile();
        }
    }

    async getResultadosCount(): Promise<number> {
        const text = (await this.counter.textContent()) ?? "";
        const match = text.match(/(\d+)\s+resultados?/i);
        return match ? Number(match[1]) : 0;
    }

    async buscarAutomotor(texto: string): Promise<void> {
        await this.automotorSearchInput.fill(texto);
        await expect(this.counter).toBeVisible();
    }

    async limpiarSelect(selectInput: Locator): Promise<void> {
        await this.abrirFiltrosSiSelectAutomotor(selectInput);
        const wrapper = selectInput.locator(
            'xpath=ancestor::div[contains(@class,"mantine-Input-wrapper")][1]',
        );
        const clearBtn = wrapper.locator("button.mantine-CloseButton-root");
        if (await clearBtn.isVisible().catch(() => false)) {
            await clearBtn.click();
            await expect(selectInput).toHaveValue("");
        }
    }

    async obtenerOpciones(selectInput: Locator): Promise<string[]> {
        await this.abrirFiltrosSiSelectAutomotor(selectInput);
        await selectInput.click();
        const options = this.page.getByRole("option");
        await expect(options.first()).toBeVisible({ timeout: 10000 });
        const labels = (await options.allTextContents()).map((l) => l.trim()).filter(Boolean);
        await this.page.keyboard.press("Escape");
        await expect(options.first()).toBeHidden({ timeout: 5000 }).catch(() => undefined);
        return labels;
    }

    async seleccionarOpcion(selectInput: Locator, optionLabel: string): Promise<void> {
        await this.abrirFiltrosSiSelectAutomotor(selectInput);
        await selectInput.click();
        await this.page.getByRole("option", { name: optionLabel, exact: true }).click();
        await expect(selectInput).toHaveValue(optionLabel);
    }

    /** Para selects cuyo label no se conoce exacto (p. ej. compañía = razón social). */
    async seleccionarOpcionQueCoincida(selectInput: Locator, patron: RegExp): Promise<string> {
        const opciones = await this.obtenerOpciones(selectInput);
        const label = opciones.find((opcion) => patron.test(opcion));
        expect(label, `Ninguna opción coincide con ${patron}: ${opciones.join(" | ")}`).toBeTruthy();
        await this.seleccionarOpcion(selectInput, label!);
        return label!;
    }

    /**
     * Tab Automotor → filtra Estado (+ Compañía) → abre la solicitud cuyo "ID Solicitud" es `opfId`.
     * La tarjeta no muestra el ID (solo el detalle), así que abre una por una hasta encontrarla.
     */
    async abrirSolicitudAutomotorPorId(opfId: string, estado: string, compania?: RegExp): Promise<void> {
        await this.irATab("Automotor");
        await expect(this.counter).toBeVisible({ timeout: 60000 });
        await this.filtrarAutomotor(estado, compania);

        await expect(this.automotorCards.first(), `No hay solicitudes en "${estado}"`).toBeVisible({ timeout: 30000 });
        const total = await this.automotorCards.count();
        for (let i = 0; i < total; i++) {
            await this.automotorCards.nth(i).click();
            await expect(this.detail.root).toBeVisible({ timeout: 30000 });
            const idSolicitud = this.detail.root.getByText(/ID Solicitud:/);
            await expect(idSolicitud).toBeVisible({ timeout: 30000 });
            if ((await idSolicitud.innerText()).includes(opfId)) return;

            await this.detail.backButton.click();
            await expect(this.automotorCards.first()).toBeVisible({ timeout: 30000 });
            if ((await this.automotorStatusSelect.inputValue().catch(() => "")) !== estado) {
                await this.filtrarAutomotor(estado, compania);
            }
        }
        throw new Error(`La solicitud ${opfId} no está entre las ${total} de "${estado}"`);
    }

    private async filtrarAutomotor(estado: string, compania?: RegExp): Promise<void> {
        const estados = await this.obtenerOpciones(this.automotorStatusSelect);
        expect(estados, `No hay solicitudes Automotor en estado "${estado}"`).toContain(estado);
        await this.seleccionarOpcion(this.automotorStatusSelect, estado);
        if (compania) {
            await this.seleccionarOpcionQueCoincida(this.automotorCompanySelect, compania);
        }
    }

    async abrirSolicitudAutomotor(estado: string, busqueda = "oviedo"): Promise<void> {
        await this.irATab("Automotor");
        await expect(this.counter).toBeVisible({ timeout: 60000 });
        await this.buscarAutomotor(busqueda);

        const estados = await this.obtenerOpciones(this.automotorStatusSelect);
        expect(estados, `No hay solicitudes Automotor en estado "${estado}"`).toContain(estado);
        await this.seleccionarOpcion(this.automotorStatusSelect, estado);

        await this.automotorCards.first().click();
        await expect(this.detail.root).toBeVisible({ timeout: 30000 });
    }

    get detail() {
        const root = this.page.locator(".MiCarteraClientDetail");
        const statusBox = root.locator(".OpfSolicitudDetailExtra");
        return {
            root,
            backButton: root.locator(".MiCarteraClientDetail__backButton"),
            title: root.locator(".MiCarteraClientDetail__title"),
            document: root.locator(".MiCarteraClientDetail__document"),
            notice: root.locator(".MiCarteraClientDetail__notice"),
            inicioVigencia: root
                .locator(".MiCarteraPolicyCard__vigenciaItem")
                .filter({ hasText: "Inicio vigencia:" }),
            finVigencia: root
                .locator(".MiCarteraPolicyCard__vigenciaItem")
                .filter({ hasText: "Fin vigencia:" }),
            sumaAsegurada: root.locator(".MiCarteraPolicyCard__sumaAsegurada"),
            statusTitle: statusBox.locator(".OpfSolicitudDetailExtra__statusTitle"),
            statusDescription: statusBox.locator(".OpfSolicitudDetailExtra__statusDescription"),
            verPolizaEnMiCarteraBtn: statusBox.getByRole("button", { name: /Ver póliza en Mi Cartera/ }),
            contactarWhatsappBtn: statusBox.getByRole("button", { name: /Contactar por WhatsApp/ }),
            cancelarBtn: statusBox.locator(".OpfSolicitudDetailExtra__textCancel"),
            descargarPdfBtn: statusBox.getByRole("button", { name: "Descargar pdf" }),
            solicitarEmisionBtn: statusBox.getByRole("button", { name: "Solicitar emisión" }),
        };
    }

    /** Botón de la sección Documentación del detalle (p. ej. "PDF de cotización"). */
    documentoBtn(label: string): Locator {
        return this.detail.root.locator(".MiCarteraPolicyCard__documentButton").filter({ hasText: label });
    }

    automotorCard(index: number) {
        const card = this.automotorCards.nth(index);
        return {
            root: card,
            title: card.locator(".MiCarteraEmissionCard__title"),
            document: card.locator(".MiCarteraEmissionCard__meta"),
            detail: card.locator(".MiCarteraEmissionCard__detail"),
            amount: card.locator(".MiCarteraEmissionCard__amount"),
            status: card.locator(".MiCarteraEmissionCard__status"),
        };
    }
}
