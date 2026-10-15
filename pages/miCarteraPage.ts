import { expect, type Download, type Locator, type Page, type Response } from "@playwright/test";
import { isCompactViewport, isNarrowViewport } from "../helpers/viewport";
import { verificarSinDesbordeHorizontal } from "../helpers/mobileLayout";

export const TAB_EMITIDAS_POLKO = "Pólizas emitidas en Polko";
export const TAB_CARTERA_COMPLETA = "Cartera completa";
export type MiCarteraTab = typeof TAB_EMITIDAS_POLKO | typeof TAB_CARTERA_COMPLETA;

export const ORIGEN_LABEL = "Origen";
export const ORIGEN_POLKO = "Emitidas en Polko";
export const ORIGEN_REPORTE_COBRANZA = "Reporte de cobranza";

export const VER_ARCHIVADAS = "Ver archivadas";
export const VER_ACTIVAS = "Ver activas";
export const SIN_ARCHIVADAS = "No tenés pólizas archivadas.";

const BACK_LABEL_CORTO = "Volver";
const RECOTIZAR_LABEL = "Recotizar en Polko";
const RECOTIZAR_LABEL_CORTO = "Recotizar";
const DOCUMENTACION_ENDPOINT = "/my-client-base/getDocumentacion";
const DESCARGA_DOCUMENTO_PATH = /\/my-client-base\/policies\/[^/]+\/documents\//;

/**
 * Page Object de Mi Cartera (`/u/micartera`), rediseño POL-3124 + responsive POL-3180.
 * Dos pestañas sobre el mismo listado (`MisEmisiones`):
 * - "Pólizas emitidas en Polko": búsqueda server-side (debounce 1s), compañía/producto/estado client-side;
 *   el contador es solo el número.
 * - "Cartera completa": búsqueda, compañía, producto, fuente del dato y archivadas server-side y paginado;
 *   el contador ("N resultados") solo aparece con algún filtro activo.
 */
export default class MiCarteraPage {
    readonly page: Page;

    readonly title: Locator;
    readonly listTitle: Locator;
    readonly listSubtitle: Locator;
    readonly desktopFilters: Locator;
    readonly mobileFilters: Locator;
    readonly mobileFiltersToggle: Locator;
    readonly mobileFiltersPanel: Locator;
    /** Contenedor de filtros activo según viewport (desktop o mobile). */
    readonly filters: Locator;
    readonly searchInput: Locator;
    readonly companySelect: Locator;
    readonly productSelect: Locator;
    readonly statusSelect: Locator;
    readonly originSelect: Locator;
    readonly viewArchivedButton: Locator;
    readonly archivePills: Locator;
    readonly exportButton: Locator;
    readonly cards: Locator;
    readonly skeletons: Locator;
    readonly counter: Locator;
    readonly emptyState: Locator;

    readonly paymentNotice: Locator;
    readonly paymentNoticeUpdatedDate: Locator;
    readonly paymentNoticeClose: Locator;
    readonly paymentNoticeTrigger: Locator;

    readonly detail: Locator;
    readonly detailBackButton: Locator;
    /** Label visible del botón volver: el completo o "Volver" (<= 768px). */
    readonly detailBackLabel: Locator;
    readonly detailTitle: Locator;
    readonly detailRecotizarLink: Locator;
    readonly detailClientDocument: Locator;
    readonly detailCompanyName: Locator;
    readonly detailProduct: Locator;
    readonly detailAmount: Locator;
    readonly detailStatus: Locator;
    readonly detailDescription: Locator;
    readonly detailIdentifiers: Locator;
    readonly detailOrigin: Locator;
    readonly detailActionButtons: Locator;
    readonly detailDocumentsTitle: Locator;
    readonly detailDocumentButtons: Locator;
    readonly detailDocumentLabels: Locator;

    /** Búsqueda con la que "Cartera completa" pidió por última vez (la reutiliza "Pólizas emitidas en Polko"). */
    private busquedaCartera: string | null = null;

    constructor(page: Page) {
        this.page = page;
        this.title = page.locator(".MiCarteraHeader__title");
        this.listTitle = page.locator(".MiCarteraEmissions__title");
        this.listSubtitle = page.locator(".MiCarteraEmissions__subtitle");
        this.desktopFilters = page.locator(".MiCarteraEmissions__filters--desktop");
        this.mobileFilters = page.locator(".MiCarteraEmissions__filtersMobile");
        this.mobileFiltersToggle = this.mobileFilters.locator(".MiCarteraEmissions__filtersToggle");
        this.mobileFiltersPanel = this.mobileFilters.locator(".MiCarteraEmissions__filtersPanel--mobile");
        // <= 1024px el CSS oculta los filtros desktop y muestra buscador + "Filtros" (panel colapsable).
        this.filters = isCompactViewport(page) ? this.mobileFilters : this.desktopFilters;
        // El placeholder del buscador se acorta a "Buscar" según el ancho: se ancla al contenedor.
        this.searchInput = this.filters.locator(".MiCarteraEmissions__filter--search input");
        this.companySelect = this.filters.locator('input[placeholder="Compañía"]');
        this.productSelect = this.filters.locator('input[placeholder="Producto"]');
        this.statusSelect = this.filters.locator('input[placeholder="Estado"]');
        this.originSelect = this.filters.locator('input[placeholder="Fuente del dato"]');
        this.viewArchivedButton = page.locator(".MiCarteraViewArchived__trigger");
        this.archivePills = page.locator(".MiCarteraEmissionCard .MiCarteraArchivePill");
        this.exportButton = page.locator(".MiCarteraExportPopover__trigger");
        this.cards = page.locator(".MiCarteraEmissionCard");
        this.skeletons = page.locator(".EmissionCardSkeleton");
        this.counter = page.locator(".MiCarteraEmissions__counter");
        this.emptyState = page.locator(".MiCarteraEmissions__emptyState");

        this.paymentNotice = page.locator(".PolizasPagas__notice");
        this.paymentNoticeUpdatedDate = this.paymentNotice.locator(".PolizasPagas__noticeUpdatedDate");
        this.paymentNoticeClose = page.locator(".PolizasPagas__noticeClose");
        this.paymentNoticeTrigger = page.locator(".PolizasPagas__noticeTrigger");

        this.detail = page.locator(".MiCarteraClientDetail");
        this.detailBackButton = this.detail.locator(".MiCarteraClientDetail__backButton");
        this.detailBackLabel = this.detailBackButton.filter({ visible: true });
        this.detailTitle = this.detail.locator(".MiCarteraClientDetail__title");
        this.detailRecotizarLink = this.detail.locator(".MiCarteraRecotizar");
        this.detailClientDocument = this.detail.locator(".MiCarteraClientDetail__document");
        this.detailCompanyName = this.detail.locator(".MiCarteraPolicyCard__companyName");
        this.detailProduct = this.detail.locator(".MiCarteraPolicyCard__product");
        this.detailAmount = this.detail.locator(".MiCarteraPolicyCard__amount");
        this.detailStatus = this.detail.locator(".MiCarteraPolicyCard__status");
        this.detailDescription = this.detail.locator(".MiCarteraPolicyCard__description");
        this.detailIdentifiers = this.detail.locator(".MiCarteraPolicyCard__meta");
        this.detailOrigin = this.detail.locator(".MiCarteraPolicyCard__origin");
        this.detailActionButtons = this.detail.locator(".MiCarteraPolicyCard__actions button");
        this.detailDocumentsTitle = this.detail.locator(".MiCarteraPolicyCard__documentsTitle");
        this.detailDocumentButtons = this.detail.locator(".MiCarteraPolicyCard__documentButton");
        this.detailDocumentLabels = this.detail.locator(".MiCarteraPolicyCard__documentLabel");
    }

    async goto(): Promise<void> {
        await this.page.goto("/u/micartera", { waitUntil: "domcontentloaded", timeout: 120000 });
        await this.waitForListaCargada();
    }

    /**
     * Busca en "Pólizas emitidas en Polko" una póliza recién emitida (por patente o número de póliza)
     * hasta que aparezca una única card; recarga entre intentos por si la emisión todavía no figura.
     */
    async buscarPolizaEmitida(texto: string, timeout = 120000): Promise<Locator> {
        await expect(async () => {
            await this.page.reload({ waitUntil: "domcontentloaded" });
            await this.waitForListaCargada();
            await this.irATab(TAB_EMITIDAS_POLKO);
            await this.buscar(texto);
            await expect(this.cards).toHaveCount(1, { timeout: 5000 });
        }).toPass({ timeout, intervals: [5000, 10000, 15000] });
        return this.cards.first();
    }

    /** Botón de documento del detalle cuyo label matchea (ej. /^p[oó]liza/i). */
    detailDocumentButton(label: string | RegExp): Locator {
        return this.detailDocumentButtons.filter({
            has: this.page.locator(".MiCarteraPolicyCard__documentLabel", { hasText: label }),
        });
    }

    /** Click en un documento del detalle: falla con el detalle del BE si la descarga no responde OK. */
    async descargarDocumento(boton: Locator): Promise<Download> {
        const responsePromise = this.page.waitForResponse(
            (response) =>
                response.request().method() === "POST" && DESCARGA_DOCUMENTO_PATH.test(new URL(response.url()).pathname),
            { timeout: 180000 },
        );
        const downloadPromise = this.page.waitForEvent("download", { timeout: 180000 });
        downloadPromise.catch(() => undefined);
        await boton.click();
        const response = await responsePromise;
        if (!response.ok()) {
            const detalle = await response.text().catch(() => "");
            throw new Error(`La descarga del documento respondió ${response.status()}: ${detalle}`);
        }
        return downloadPromise;
    }

    tab(name: MiCarteraTab): Locator {
        return this.page.getByRole("tab", { name: new RegExp(`^${name}`) });
    }

    tabSearchHint(name: MiCarteraTab): Locator {
        return this.tab(name).locator(".MiCartera__tabSearchHint");
    }

    /** Espera a que el listado termine de cargar (cards o empty state, sin skeletons). */
    async waitForListado(): Promise<void> {
        await expect(this.cards.first().or(this.emptyState)).toBeVisible({ timeout: 90000 });
        await expect(this.skeletons).toHaveCount(0);
    }

    async waitForListaCargada(): Promise<void> {
        await expect(this.title).toBeVisible({ timeout: 30000 });
        await expect(this.searchInput).toBeVisible({ timeout: 90000 });
        await this.abrirFiltrosSiMobile();
        await this.waitForListado();
    }

    /** En mobile los selects viven en un panel colapsable detrás del botón "Filtros". Idempotente. */
    async abrirFiltrosSiMobile(): Promise<void> {
        if (!isCompactViewport(this.page)) return;
        if (await this.mobileFiltersPanel.isVisible().catch(() => false)) return;
        await this.mobileFiltersToggle.click();
        await expect(this.mobileFiltersPanel).toBeVisible({ timeout: 10000 });
    }

    /** Respuesta del BE de cartera cuyos query params cumplen `match`. */
    waitForDocumentacion(match: (params: URLSearchParams) => boolean = () => true, timeout = 120000): Promise<Response> {
        return this.page.waitForResponse(
            (response) => {
                if (!response.url().includes(DOCUMENTACION_ENDPOINT)) return false;
                return match(new URL(response.url()).searchParams);
            },
            { timeout },
        );
    }

    async irATab(name: MiCarteraTab): Promise<void> {
        const tab = this.tab(name);
        if (await this.tabSeleccionada(name)) {
            await this.abrirFiltrosSiMobile();
            await this.waitForListado();
            return;
        }
        const search = (await this.searchInput.inputValue()).trim();
        const reutilizaCache = name === TAB_EMITIDAS_POLKO && this.busquedaCartera === search;
        const response = reutilizaCache ? null : this.waitForDocumentacion();
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true");
        if (response) {
            expect((await response).ok(), "getDocumentacion debería responder OK al cambiar de pestaña").toBe(true);
        }
        if (name === TAB_CARTERA_COMPLETA) this.busquedaCartera = search;
        await expect(this.listTitle).toHaveText(name);
        await this.abrirFiltrosSiMobile();
        await this.waitForListado();
    }

    /** "Pólizas emitidas en Polko" muestra solo el número; "Cartera completa", "N resultados". */
    async getResultadosCount(): Promise<number> {
        const text = (await this.counter.textContent()) ?? "";
        const match = text.match(/^\s*(\d+)/);
        return match ? Number(match[1]) : 0;
    }

    /** Label que debería verse en el botón volver del detalle según el ancho. */
    backLabelVisible(labelCompleto: string): string {
        return isNarrowViewport(this.page) ? BACK_LABEL_CORTO : labelCompleto;
    }

    /** Label del link de recotizar: "Recotizar" (<= 768px) o "Recotizar en Polko". */
    recotizarLabelVisible(): string {
        return isNarrowViewport(this.page) ? RECOTIZAR_LABEL_CORTO : RECOTIZAR_LABEL;
    }

    /**
     * La búsqueda va al BE con debounce. "Pólizas emitidas en Polko" puede reutilizar el
     * resultado ya traído por "Cartera completa" sin volver a pedir: en ese caso no hay response.
     */
    async buscar(texto: string): Promise<void> {
        const target = texto.trim();
        if ((await this.searchInput.inputValue()).trim() === target) {
            await this.waitForListado();
            return;
        }
        const enCartera = await this.tabSeleccionada(TAB_CARTERA_COMPLETA);
        if (!enCartera && this.busquedaCartera === target) {
            await this.searchInput.fill(texto);
            await this.waitForListado();
            return;
        }
        const response = this.waitForDocumentacion((params) =>
            target ? params.get("search") === target : !params.has("search"),
        );
        await this.searchInput.fill(texto);
        expect((await response).ok(), `getDocumentacion debería responder OK al buscar "${texto}"`).toBe(true);
        if (enCartera) this.busquedaCartera = target;
        await this.waitForListado();
    }

    private async tabSeleccionada(name: MiCarteraTab): Promise<boolean> {
        return (await this.tab(name).getAttribute("aria-selected")) === "true";
    }

    async limpiarBusqueda(): Promise<void> {
        await this.buscar("");
    }

    private selectWrapper(selectInput: Locator): Locator {
        return selectInput.locator('xpath=ancestor::div[contains(@class,"mantine-Input-wrapper")][1]');
    }

    async limpiarSelect(selectInput: Locator): Promise<void> {
        await this.abrirFiltrosSiMobile();
        const clearBtn = this.selectWrapper(selectInput).locator("button.mantine-CloseButton-root");
        if (await clearBtn.isVisible().catch(() => false)) {
            await clearBtn.click();
            await expect(selectInput).toHaveValue("");
        }
    }

    async limpiarFiltrosSelect(): Promise<void> {
        await this.limpiarSelect(this.companySelect);
        await this.limpiarSelect(this.productSelect);
        if (await this.statusSelect.isVisible().catch(() => false)) {
            await this.limpiarSelect(this.statusSelect);
        }
        if (await this.originSelect.isVisible().catch(() => false)) {
            await this.limpiarSelect(this.originSelect);
        }
    }

    async obtenerOpciones(selectInput: Locator): Promise<string[]> {
        await this.abrirFiltrosSiMobile();
        await selectInput.click();
        const options = this.page.getByRole("option");
        await expect(options.first()).toBeVisible({ timeout: 10000 });
        const labels = (await options.allTextContents())
            .map((label) => label.trim())
            .filter(Boolean);
        await this.page.keyboard.press("Escape");
        await expect(options.first()).toBeHidden({ timeout: 5000 }).catch(() => undefined);
        return labels;
    }

    async seleccionarOpcion(selectInput: Locator, optionLabel: string): Promise<void> {
        await this.abrirFiltrosSiMobile();
        await selectInput.click();
        await this.page.getByRole("option", { name: optionLabel, exact: true }).click();
        await expect(selectInput).toHaveValue(optionLabel);
    }

    /**
     * Selección de un filtro server-side ("Cartera completa"): espera la respuesta cuyo
     * query param `param` viene informado.
     */
    async seleccionarOpcionServer(selectInput: Locator, optionLabel: string, param: string): Promise<void> {
        const response = this.waitForDocumentacion((params) => params.has(param));
        await this.abrirFiltrosSiMobile();
        await selectInput.click();
        await this.page.getByRole("option", { name: optionLabel, exact: true }).click();
        // Mientras carga, MisEmisiones reemplaza filtros y listado por skeletons: el select no existe hasta la respuesta.
        expect((await response).ok(), `getDocumentacion debería responder OK filtrando ${param}`).toBe(true);
        await this.waitForListado();
        await this.abrirFiltrosSiMobile();
        await expect(selectInput).toHaveValue(optionLabel);
    }

    async limpiarSelectServer(selectInput: Locator, param: string): Promise<void> {
        await this.abrirFiltrosSiMobile();
        if (!(await selectInput.inputValue())) return;
        const response = this.waitForDocumentacion((params) => !params.has(param));
        await this.selectWrapper(selectInput).locator("button.mantine-CloseButton-root").click();
        await response;
        await this.waitForListado();
        await this.abrirFiltrosSiMobile();
        await expect(selectInput).toHaveValue("");
    }

    /** "Cartera completa": alterna entre pólizas activas y archivadas (`archived` server-side). */
    async toggleVerArchivadas(): Promise<void> {
        const archivadas = (await this.viewArchivedButton.getAttribute("aria-pressed")) !== "true";
        const response = this.waitForDocumentacion((params) => params.get("archived") === String(archivadas));
        await this.viewArchivedButton.click();
        expect((await response).ok(), "getDocumentacion debería responder OK al alternar archivadas").toBe(true);
        await expect(this.viewArchivedButton).toHaveAttribute("aria-pressed", String(archivadas));
        await expect(this.viewArchivedButton).toHaveText(archivadas ? VER_ACTIVAS : VER_ARCHIVADAS);
        await this.waitForListado();
    }

    /**
     * Mobile: solo se ven los filtros mobile (no los desktop "aplastados") y nada del listado
     * desborda horizontalmente. No-op en desktop. Asserts soft.
     */
    async verificarLayoutMobile(): Promise<void> {
        if (!isCompactViewport(this.page)) return;
        await expect
            .soft(this.desktopFilters, "Los filtros desktop no deberían verse en mobile (se duplican con los mobile)")
            .toBeHidden();
        await expect.soft(this.mobileFilters, "Los filtros mobile deberían verse").toBeVisible();
        await verificarSinDesbordeHorizontal(this.page, {
            encabezado: this.title,
            "aviso de datos de pago": this.paymentNotice,
            "filtros mobile": this.mobileFilters,
            "primera card del listado": this.cards,
        });
    }

    async verificarLayoutMobileDetalle(): Promise<void> {
        await verificarSinDesbordeHorizontal(this.page, { "detalle de póliza": this.detail });
    }

    async abrirDetalle(index = 0): Promise<string> {
        const card = this.cards.nth(index);
        const clientName = ((await card.locator(".MiCarteraEmissionCard__title").textContent()) ?? "").trim();
        await card.click();
        await expect(this.detail).toBeVisible({ timeout: 60000 });
        await expect(this.detailTitle).toBeVisible({ timeout: 60000 });
        return clientName;
    }

    async volverDelDetalle(): Promise<void> {
        await this.detailBackButton.click();
        await expect(this.detail).toBeHidden();
        await expect(this.searchInput).toBeVisible();
        await this.abrirFiltrosSiMobile();
        await this.waitForListado();
    }

    /** Card del listado que contiene todos los textos indicados (cliente, detalle, monto, etc.). */
    cardConTextos(...textos: string[]): Locator {
        return textos.reduce((card, texto) => card.filter({ hasText: texto }), this.cards);
    }

    cardDocument(card: Locator): Locator {
        return card.locator(".MiCarteraEmissionCard__meta");
    }

    cardAmount(card: Locator): Locator {
        return card.locator(".MiCarteraEmissionCard__amount");
    }

    cardStatus(card: Locator): Locator {
        return card.locator(".MiCarteraEmissionCard__status");
    }

    async abrirCard(card: Locator): Promise<void> {
        await card.click();
        await expect(this.detail).toBeVisible({ timeout: 60000 });
        await expect(this.detailTitle).toBeVisible({ timeout: 60000 });
    }

    cardTitles(): Locator {
        return this.cards.locator(".MiCarteraEmissionCard__title");
    }

    cardDetails(): Locator {
        return this.cards.locator(".MiCarteraEmissionCard__detail");
    }

    cardStatuses(): Locator {
        return this.cards.locator(".MiCarteraEmissionCard__status");
    }

    cardsOrigenPolko(): Locator {
        return this.page.locator(".MiCarteraEmissionCard--polkoOrigin");
    }

    async getVisibleTitles(): Promise<string[]> {
        return (await this.cardTitles().allTextContents()).map((t) => t.trim());
    }

    async getVisibleDetails(): Promise<string[]> {
        return (await this.cardDetails().allTextContents()).map((t) => t.trim());
    }

    async getVisibleStatuses(): Promise<string[]> {
        return (await this.cardStatuses().allTextContents()).map((t) => t.trim());
    }

    /** Extrae la compañía del detalle: "Compañía - Producto[ - fecha]". */
    static companyFromDetail(detail: string): string {
        return detail.split(" - ")[0]?.trim() ?? "";
    }

    /**
     * Extrae el producto del detalle. "Pólizas emitidas en Polko" trae fecha al final
     * ("Compañía - Producto - dd/mm/aaaa"); "Cartera completa" puede no traerla ("Compañía - Producto").
     */
    static productFromDetail(detail: string): string {
        const parts = detail.split(" - ").map((p) => p.trim());
        const hasDate = /^\d{2}\/\d{2}\/\d{4}$/.test(parts[parts.length - 1] ?? "");
        const productParts = hasDate ? parts.slice(1, -1) : parts.slice(1);
        return productParts.join(" - ");
    }
}
