import { type Locator, type Page } from "@playwright/test";

/** POL-2951 — popup EmissionPriceUpdated (premio/suma actualizados en emisión auto). */
export default class EmissionPriceUpdated {
    readonly page: Page;
    /** Shell handleError: título + card + CTAs (no solo el card de montos). */
    readonly root: Locator;
    readonly card: Locator;
    readonly titlePremio: Locator;
    readonly titleCotizacion: Locator;
    readonly titleSuma: Locator;
    readonly anyTitle: Locator;
    readonly previousPremioLabel: Locator;
    readonly updatedPremioLabel: Locator;
    readonly previousSumaLabel: Locator;
    readonly updatedSumaLabel: Locator;
    readonly confirmBtn: Locator;
    readonly backToQuotationBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        // Título/CTAs viven en EmissionResultLayout; el card solo tiene filas de montos.
        // Scope al layout handleError para no chocar con ProductFormHeader__backLink.
        this.root = page.locator(".EmissionResultLayout--handleError");
        this.card = this.root.locator(".EmissionPriceUpdated__card");
        this.titlePremio = this.root.getByRole("heading", { name: "El premio se actualizó", exact: true });
        this.titleCotizacion = this.root.getByRole("heading", { name: "La cotización se actualizó", exact: true });
        this.titleSuma = this.root.getByRole("heading", { name: "La suma asegurada se actualizó", exact: true });
        this.anyTitle = this.titlePremio.or(this.titleCotizacion).or(this.titleSuma);
        this.previousPremioLabel = this.card.getByText("Premio anterior", { exact: true });
        this.updatedPremioLabel = this.card.getByText("Premio actualizado", { exact: true });
        this.previousSumaLabel = this.card.getByText("Suma asegurada anterior", { exact: true });
        this.updatedSumaLabel = this.card.getByText("Suma asegurada actualizada", { exact: true });
        this.confirmBtn = this.root.getByRole("button", { name: "Continuar con la emisión" });
        this.backToQuotationBtn = this.root.getByRole("button", { name: "Volver a la cotización" });
    }
}
