import { Page, Locator, expect } from "@playwright/test";
import { escapeRegExp, isCompactViewport } from "../helpers/viewport";

/**
 * Sidebar del cotizador rediseñado (Auto / Moto).
 * - Desktop (> 1024px): `QuotationSidebar` fijo con tiles de compañía + config avanzada + "Aplicar cambios".
 * - Compacto (<= 1024px): `QuotationMobileSidebar` = barra `.QuotationMobileBar` + Drawer
 *   con vista de compañías (`.MobileCompanyList`) o vista avanzada ("Aplicar configuración").
 */
export default class QuotationSidebar {
    readonly page: Page;

    readonly mobileBar: Locator;
    readonly mobileChangeLink: Locator;
    readonly mobileAdvancedBtn: Locator;
    readonly mobileDrawer: Locator;
    readonly mobileCompanyList: Locator;
    readonly mobileAdvancedCompanyCard: Locator;
    readonly mobileApplyBtn: Locator;
    readonly desktopApplyBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.mobileBar = page.locator(".QuotationMobileBar");
        this.mobileChangeLink = page.locator(".QuotationMobileBar__changeLink");
        this.mobileAdvancedBtn = page.locator(".QuotationMobileBar__advancedButton");
        this.mobileDrawer = page.locator(".QuotationMobileDrawer__wrapper");
        this.mobileCompanyList = page.locator("ul.MobileCompanyList");
        this.mobileAdvancedCompanyCard = page.locator(".AdvancedDrawer__companyCard");
        this.mobileApplyBtn = page.locator(".QuotationMobileDrawer__footerButton");
        this.desktopApplyBtn = page.getByRole("button", { name: /^aplicar cambios$/i });
    }

    isCompact(): boolean {
        return isCompactViewport(this.page);
    }

    companyTile(label: string): Locator {
        if (this.isCompact()) {
            return this.mobileCompanyList.locator("button.MobileCompanyList__item").filter({
                has: this.page.locator(".MobileCompanyList__name", {
                    hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`),
                }),
            });
        }
        return this.page.getByRole("button", { name: label, exact: true });
    }

    get companyTileActive(): Locator {
        if (this.isCompact()) {
            return this.mobileBar.locator(".QuotationMobileBar__companyName");
        }
        return this.page.locator(".QuotationSidebar__companyTile.is-active");
    }

    /** Badge de éxito en el listado de compañías (en compacto requiere el drawer abierto). */
    companySuccessBadge(label: string): Locator {
        return this.companyTile(label).locator(".QuotationSidebar__statusBadge--success");
    }

    /** Badge de éxito visible sin abrir el drawer: tile en desktop, barra (compañía seleccionada) en compacto. */
    selectedCompanySuccessBadge(label: string): Locator {
        const desktop = this.page
            .locator(".QuotationSidebar__companyTile")
            .filter({ has: this.page.locator(".QuotationSidebar__companyName", { hasText: label }) })
            .locator(".QuotationSidebar__statusBadge--success");
        const mobile = this.mobileBar
            .filter({ has: this.page.locator(".QuotationMobileBar__companyName", { hasText: label }) })
            .locator(".QuotationMobileBar__statusIcon .QuotationSidebar__statusBadge--success");
        return desktop.or(mobile);
    }

    get applyBtn(): Locator {
        return this.isCompact() ? this.mobileApplyBtn : this.desktopApplyBtn;
    }

    async abrirCompaniasMobile(): Promise<void> {
        if (await this.mobileCompanyList.isVisible().catch(() => false)) return;
        if (await this.mobileAdvancedCompanyCard.isVisible().catch(() => false)) {
            await this.mobileAdvancedCompanyCard.click();
        } else {
            await expect(this.mobileChangeLink).toBeVisible({ timeout: 30000 });
            await this.mobileChangeLink.click();
        }
        await expect(this.mobileCompanyList).toBeVisible({ timeout: 10000 });
    }

    async cerrarDrawerMobile(): Promise<void> {
        if (!(await this.mobileDrawer.isVisible().catch(() => false))) return;
        await this.page.keyboard.press("Escape");
        await expect(this.mobileDrawer).toBeHidden({ timeout: 10000 });
    }

    async seleccionarCompania(label: string): Promise<void> {
        if (!this.isCompact()) {
            await this.companyTile(label).click();
            return;
        }
        await this.abrirCompaniasMobile();
        await this.companyTile(label).click();
        await expect(this.mobileCompanyList).toBeHidden({ timeout: 10000 });
    }

    async esperarCotizacionCompania(label: string, timeout: number): Promise<void> {
        if (!this.isCompact()) {
            await expect(
                this.companySuccessBadge(label),
                `Sin tilde verde en ${label} (timeout ${timeout}ms)`,
            ).toBeVisible({ timeout });
            return;
        }
        await this.abrirCompaniasMobile();
        await expect(
            this.companySuccessBadge(label),
            `Sin tilde verde en ${label} (timeout ${timeout}ms)`,
        ).toBeVisible({ timeout });
        await this.cerrarDrawerMobile();
    }

    /** Alguna compañía cotizó OK (badge en desktop; badge de la barra o tarjeta de cobertura en compacto). */
    async esperarAlgunaCotizacion(timeout: number, resultSelector: string): Promise<void> {
        const target = this.isCompact()
            ? this.page.locator(`.QuotationMobileBar__statusIcon .QuotationSidebar__statusBadge--success, ${resultSelector}`)
            : this.page.locator(".QuotationSidebar__statusBadge--success");
        await expect(
            target.first(),
            "Ninguna aseguradora mostró tilde verde de cotización exitosa",
        ).toBeVisible({ timeout });
    }

    /** En compacto abre el drawer en la vista avanzada; en desktop la config ya está visible en el sidebar. */
    async abrirConfigAvanzada(): Promise<void> {
        if (!this.isCompact()) return;
        if (await this.mobileApplyBtn.isVisible().catch(() => false)) return;
        await this.cerrarDrawerMobile();
        await expect(this.mobileAdvancedBtn).toBeVisible({ timeout: 30000 });
        await this.mobileAdvancedBtn.click();
        await expect(this.mobileApplyBtn).toBeVisible({ timeout: 10000 });
    }

    async aplicarConfig(timeout = 10000): Promise<void> {
        const btn = this.applyBtn;
        await expect(btn).toBeEnabled({ timeout });
        await expect(btn).not.toHaveClass(/(^|\s)disabled(\s|$)/, { timeout });
        await btn.click();
        if (this.isCompact()) {
            await expect(this.mobileDrawer).toBeHidden({ timeout: 30000 }).catch(async () => {
                await this.cerrarDrawerMobile();
            });
        }
    }
}
