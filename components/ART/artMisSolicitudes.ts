import { Page, Locator, expect } from "@playwright/test";

/** Mis Solicitudes — tab ART (POL-2882). */
export default class ArtMisSolicitudes {
    readonly page: Page;
    readonly heading: Locator;
    readonly tabArt: Locator;
    readonly listCards: Locator;
    readonly emitCta: Locator;
    readonly recotizarBtn: Locator;
    readonly backBtn: Locator;
    readonly pagination: Locator;
    readonly detail: Locator;
    readonly detailStatus: Locator;
    readonly detailStatusTitle: Locator;
    readonly detailComprobante: Locator;
    readonly confirmarGestionBtn: Locator;
    readonly verPolizaEnMiCarteraBtn: Locator;
    /** Loader de pantalla completa (`ContextLoading`) mientras cargan los contextos: tapa los clicks. */
    readonly loading: Locator;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole("heading", { name: "Mis solicitudes" });
        this.tabArt = page.getByRole("tab", { name: "ART", exact: true });
        this.listCards = page.locator("button.ArtSolicitudListCard, .ArtSolicitudListCard");
        this.emitCta = page.getByRole("button", { name: /Ver cotización y emitir/i });
        this.recotizarBtn = page.getByRole("button", { name: /Recotizar/i });
        this.backBtn = page.locator(".ArtSolicitudDetail__backButton");
        this.pagination = page.locator(".pagination__container");
        this.detail = page.locator("article.ArtSolicitudCard");
        this.detailStatus = this.detail.locator(".ArtSolicitudCard__pill");
        this.detailStatusTitle = this.detail.locator(".ArtSolicitudCard__statusTitle");
        this.detailComprobante = this.detail.locator(".ArtSolicitudCard__comprobante");
        this.confirmarGestionBtn = this.detail.getByRole("button", { name: "Confirmar gestión" });
        this.verPolizaEnMiCarteraBtn = this.detail.getByRole("button", { name: /Ver póliza en Mi Cartera/i });
        this.loading = page.locator(".spinner").filter({ visible: true });
    }

    /** Card del listado de `empleador` en un estado (cotización y emisión del mismo empleador conviven). */
    card(empleador: string, statusRe: RegExp): Locator {
        return this.listCards.filter({ hasText: empleador }).filter({ hasText: statusRe }).first();
    }

    /** Botón de descarga de un documento emitido (`label` tal como lo subió admin, p. ej. "Contrato"). */
    documentoBtn(label: string): Locator {
        return this.detail.locator(".ArtSolicitudCard__docs").getByRole("button", { name: label });
    }

    async goto() {
        await this.page.goto("http://localhost:3000/u/missolicitudes", {
            waitUntil: "domcontentloaded",
            timeout: 120000,
        });
        await expect(this.heading).toBeVisible({ timeout: 60000 });
    }

    async openArtTab() {
        await this.tabArt.click();
        await expect(this.tabArt).toHaveAttribute("aria-selected", "true", { timeout: 30000 });
        await expect(this.listCards.first()).toBeVisible({ timeout: 60000 });
    }

    cardByStatus(statusRe: RegExp): Locator {
        return this.listCards.filter({ hasText: statusRe }).first();
    }

    async openCardByStatus(statusRe: RegExp) {
        const card = this.cardByStatus(statusRe);
        await expect(card).toBeVisible({ timeout: 30000 });
        await card.click();
    }

    async backToList() {
        if (await this.backBtn.isVisible().catch(() => false)) {
            await this.backBtn.click();
        } else {
            await this.page.goBack();
        }
        await this.openArtTab();
    }
}
