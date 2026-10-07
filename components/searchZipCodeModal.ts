import { Page, Locator } from "@playwright/test";

/** Modal "No sé mi código" / Localizar Código Postal (POL-2770). */
export default class SearchZipCodeModal {
    readonly page: Page;
    readonly root: Locator;
    readonly openLink: Locator;
    readonly title: Locator;
    readonly provinciaInput: Locator;
    readonly localidadInput: Locator;
    readonly confirmarBtn: Locator;
    readonly atrasBtn: Locator;
    readonly descriptionHint: Locator;

    constructor(page: Page) {
        this.page = page;
        // El modal reusa los mismos name Formik que el form (idProvincia / codigosLocalidad).
        // El form usa #select_idProvincia vía FormField; el modal usa MantineSelectField
        // directo (sin ese id). Scopear al overlay y usar roles del searchbox.
        this.root = page.locator(".pcmodal__container").filter({
            has: page.getByText("Localizar Código Postal"),
        });
        this.openLink = page.getByText("No sé mi código");
        this.title = this.root.getByText("Localizar Código Postal");
        this.provinciaInput = this.root.getByRole("searchbox", { name: /^Provincia$/i });
        this.localidadInput = this.root.getByRole("searchbox", { name: /^Localidad$/i });
        this.confirmarBtn = this.root.getByRole("button", { name: /^CONFIRMAR$/i });
        this.atrasBtn = page.getByRole("button", { name: /^Atrás$/i });
        this.descriptionHint = this.root.getByText("Ingrese al menos 4 caracteres");
    }

    async open() {
        await this.openLink.click();
        await this.title.waitFor({ state: "visible", timeout: 15000 });
    }

    async selectProvincia(label: string) {
        await this.provinciaInput.click();
        await this.page.getByRole("option", { name: label, exact: true }).click();
    }

    async searchAndSelectLocalidad(query: string) {
        await this.localidadInput.click();
        await this.localidadInput.fill(query);
        await this.page.getByRole("option").first().waitFor({ state: "visible", timeout: 20000 });
        await this.page.getByRole("option").first().click();
    }

    async confirm() {
        await this.confirmarBtn.click();
        await this.root.waitFor({ state: "hidden", timeout: 15000 });
    }
}
