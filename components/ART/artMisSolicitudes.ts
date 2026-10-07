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

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByRole("heading", { name: "Mis solicitudes" });
        this.tabArt = page.getByRole("tab", { name: "ART", exact: true });
        this.listCards = page.locator("button.ArtSolicitudListCard, .ArtSolicitudListCard");
        this.emitCta = page.getByRole("button", { name: /Ver cotización y emitir/i });
        this.recotizarBtn = page.getByRole("button", { name: /Recotizar/i });
        this.backBtn = page.locator(".ArtSolicitudDetail__backButton");
        this.pagination = page.locator(".pagination__container");
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
