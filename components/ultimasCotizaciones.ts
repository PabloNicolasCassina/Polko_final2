import { expect, Locator, Page } from "@playwright/test";

type ProductType =
    | "AUTOMOTOR"
    | "MOTOVEHICULO"
    | "HOGAR"
    | "ACCIDENTES PERSONALES"
    | "MICROSEGUROS";

type CompanyName =
    | "triunfo"
    | "atm"
    | "rivadavia"
    | "sancor"
    | "rus"
    | "federacion_patronal"
    | "mercantil_andina";

export default class UltimasCotizaciones {
    readonly page: Page;
    readonly heading: Locator;
    readonly tabPolko: Locator;
    readonly tabClientes: Locator;
    readonly filterAseguradora: Locator;
    readonly filterProducto: Locator;
    readonly filterFecha: Locator;
    readonly filterBuscar: Locator;
    readonly table: Locator;
    readonly tableBody: Locator;
    readonly emitirBtn: Locator;
    readonly recotizarBtn: Locator;
    readonly optionsIcon: Locator;
    readonly paginationPrevBtn: Locator;
    readonly paginationNextBtn: Locator;
    readonly paginationInfo: Locator;
    readonly paginationGoToInput: Locator;

    private readonly logoSelectors: Record<CompanyName, string>;
    private readonly companyLogosAvailable: Set<string>;

    constructor(page: Page) {
        this.page = page;
        this.heading = page.getByText("Últimas cotizaciones", { exact: true }).first();
        this.tabPolko = page.getByText("POLKO", { exact: true }).first();
        this.tabClientes = page.getByText("CLIENTES", { exact: true }).first();
        this.filterAseguradora = page.getByPlaceholder("Aseguradora");
        this.filterProducto = page.getByPlaceholder("Producto");
        this.filterFecha = page.getByRole("button", { name: /Fecha/ });
        this.filterBuscar = page.getByPlaceholder("Buscar");
        this.table = page.locator("table").filter({
            has: page.locator("td").filter({
                hasText: /AUTOMOTOR|MOTOVEHICULO|ACCIDENTES PERSONALES|MICROSEGUROS/,
            }).first(),
        }).or(
            // Mobile compacto: sin columna producto, solo fecha + detalle + menú
            page.locator(".mainTable table, table").filter({
                has: page.locator("tbody tr .QT__menuOpenIcon, tbody tr .QT__generic__cell"),
            }).first()
        ).first();
        this.tableBody = this.table.locator("tbody");
        this.emitirBtn = page.getByRole("button", { name: "EMITIR", exact: true });
        this.recotizarBtn = page.getByRole("button", { name: "RECOTIZAR", exact: true });
        this.optionsIcon = page.locator("td:last-child img").last();
        this.paginationPrevBtn = page.locator("img").first();
        this.paginationNextBtn = page.locator("img").nth(1);
        this.paginationInfo = page.locator("p").filter({ hasText: /Página \d+ de \d+/ });
        this.paginationGoToInput = page.locator('input[type="number"]').first();

        this.logoSelectors = {
            triunfo: "svg.QT__company--triunfo",
            atm: "svg.QT__company--atm",
            rivadavia: "svg.QT__company--rivadavia",
            sancor: "svg.QT__company--sancor",
            rus: "svg.QT__company--rus",
            federacion_patronal: "svg.QT__company--federacion_patronal",
            mercantil_andina: "svg.QT__company--mercantil_andina",
        };
        this.companyLogosAvailable = new Set(Object.keys(this.logoSelectors));
    }

    public getCompanyLogo(company: CompanyName): Locator {
        return this.page.locator(this.getCompanyLogoSelector(company));
    }

    public getRow(index: number): Locator {
        return this.tableBody.locator("tr").nth(index);
    }

    public getRowByProduct(productType: ProductType): Locator {
        return this.tableBody.locator("tr").filter({ hasText: productType }).first();
    }

    public getRowCells(row: Locator) {
        return {
            logos: row.locator("td").nth(0),
            date: row.locator("td").nth(1),
            product: row.locator("td").nth(2),
            description: row.locator("td").nth(3),
            actions: row.locator("td").nth(4),
        };
    }

    public getEmitirBtn(row: Locator): Locator {
        return row.getByRole("button", { name: "EMITIR", exact: true });
    }

    public getRecotizarBtn(row: Locator): Locator {
        return row.getByRole("button", { name: "RECOTIZAR", exact: true });
    }

    public getOptionsIcon(row: Locator): Locator {
        return row.locator("td:last-child img").last();
    }

    public async hasCompanyLogo(row: Locator, company: CompanyName): Promise<boolean> {
        return (await row.locator(this.getCompanyLogoSelector(company)).count()) > 0;
    }

    public async getCompanyLogosInRow(row: Locator): Promise<string[]> {
        const companies: string[] = [];

        for (const company of Object.keys(this.logoSelectors) as CompanyName[]) {
            if (await this.hasCompanyLogo(row, company)) {
                companies.push(company);
            }
        }

        return companies;
    }

    public async filterByAseguradora(company: string): Promise<void> {
        await this.filterAseguradora.fill(company);
    }

    public async filterByProducto(product: string): Promise<void> {
        await this.filterProducto.fill(product);
    }

    public async openDateFilter(): Promise<void> {
        await this.filterFecha.click();
    }

    public async search(query: string): Promise<void> {
        await this.filterBuscar.fill(query);
    }

    public async clickEmitir(row: Locator): Promise<void> {
        const emitirBtn = this.getEmitirBtn(row);
        if (await emitirBtn.isVisible().catch(() => false)) {
            await emitirBtn.click();
            return;
        }

        // Mobile: acciones detrás del menú kebab (.QT__menuOpenIcon)
        await row.locator(".QT__menuOpenIcon").click();
        await this.page.getByRole("menuitem", { name: "Emitir" }).click();
    }

    public async findRowByDescription(partialDescription: string, maxRows: number = 20): Promise<number> {
        const rowCount = await this.getRowCount();
        for (let i = 0; i < Math.min(rowCount, maxRows); i++) {
            const row = this.getRow(i);
            const text = ((await row.innerText()) || "").replace(/\s+/g, " ");
            if (text.includes(partialDescription)) {
                return i;
            }
        }
        return -1;
    }

    public async clickRecotizar(row: Locator): Promise<void> {
        await this.getRecotizarBtn(row).click();
    }

    public async clickOptions(row: Locator): Promise<void> {
        await this.getOptionsIcon(row).click();
    }

    public async goToPage(pageNumber: number): Promise<void> {
        await this.paginationGoToInput.fill(pageNumber.toString());
        await this.page.keyboard.press("Enter");
    }

    public async goToNextPage(): Promise<void> {
        await this.paginationNextBtn.click();
    }

    public async goToPreviousPage(): Promise<void> {
        await this.paginationPrevBtn.click();
    }

    public async getCurrentPageInfo(): Promise<string> {
        return (await this.paginationInfo.textContent()) || "";
    }

    public async switchToPolkoTab(): Promise<void> {
        await this.tabPolko.click();
    }

    public async switchToClientesTab(): Promise<void> {
        await this.tabClientes.click();
    }

    public async getRowCount(): Promise<number> {
        return this.tableBody.locator("tr").count();
    }

    public async getRowData(row: Locator) {
        const cells = this.getRowCells(row);

        return {
            date: await cells.date.textContent(),
            product: await cells.product.textContent(),
            description: await cells.description.textContent(),
            companies: await this.getCompanyLogosInRow(row),
        };
    }

    public async getAllRowsData() {
        const count = await this.getRowCount();
        const rows = [];

        for (let i = 0; i < count; i++) {
            rows.push(await this.getRowData(this.getRow(i)));
        }

        return rows;
    }

    public async waitForTableLoad(): Promise<void> {
        await this.heading.waitFor({ state: "visible", timeout: 120000 });
        await this.table.waitFor({ state: "visible", timeout: 120000 });
        await expect(this.tableBody.locator("tr").first()).toBeVisible({ timeout: 120000 });
    }

    public async findAutomotorRow(company: string, skipMatches: number = 0, maxRows: number = 20): Promise<number> {
        const rowCount = await this.getRowCount();
        const shouldCheckLogo = this.companyLogosAvailable.has(company);
        let matches = 0;

        for (let i = 0; i < Math.min(rowCount, maxRows); i++) {
            const row = this.getRow(i);
            const productText = await this.getRowCells(row).product.textContent();

            if (!productText?.includes("AUTOMOTOR")) {
                continue;
            }

            if (shouldCheckLogo) {
                const hasLogo = await this.hasCompanyLogo(row, company as CompanyName);
                if (!hasLogo) {
                    continue;
                }
            }

            if (matches < skipMatches) {
                matches++;
                continue;
            }

            return i;
        }

        return -1;
    }

    public async getAutomotorRow(company: string, skipMatches: number = 0): Promise<Locator> {
        const rowIndex = await this.findAutomotorRow(company, skipMatches);
        expect(rowIndex, `No se encontró cotización AUTOMOTOR de ${company}`).toBeGreaterThanOrEqual(0);
        return this.getRow(rowIndex);
    }

    public async clickEmitirAutomotor(company: string, skipMatches: number = 1): Promise<void> {
        const row = await this.getAutomotorRow(company, skipMatches);
        await this.clickEmitir(row);
    }

    public async clickRecotizarAutomotor(company: string, skipMatches: number = 0): Promise<void> {
        const row = await this.getAutomotorRow(company, skipMatches);
        await this.clickRecotizar(row);
    }

    /**
     * Busca una fila MOTOVEHICULO. Si `company` tiene logo en el row, filtra por él;
     * si no (o no se pasa), cualquier fila del producto. `description` acota por texto
     * (ej. "BENELLI LEONCINO"). `skipMatches` saltea las primeras N coincidencias.
     */
    public async findMotovehiculoRow(options: {
        company?: CompanyName | string;
        description?: string;
        skipMatches?: number;
        maxRows?: number;
    } = {}): Promise<number> {
        const {
            company,
            description,
            skipMatches = 0,
            maxRows = 40,
        } = options;
        const rowCount = await this.getRowCount();
        const shouldCheckLogo = Boolean(company && this.companyLogosAvailable.has(company));
        let matches = 0;

        for (let i = 0; i < Math.min(rowCount, maxRows); i++) {
            const row = this.getRow(i);
            const productText = await this.getRowCells(row).product.textContent();

            if (!productText?.includes("MOTOVEHICULO")) {
                continue;
            }

            if (description) {
                const desc = await this.getRowCells(row).description.textContent();
                if (!desc?.includes(description)) {
                    continue;
                }
            }

            if (shouldCheckLogo) {
                const hasLogo = await this.hasCompanyLogo(row, company as CompanyName);
                if (!hasLogo) {
                    continue;
                }
            }

            if (matches < skipMatches) {
                matches++;
                continue;
            }

            return i;
        }

        return -1;
    }

    public async getMotovehiculoRow(options: {
        company?: CompanyName | string;
        description?: string;
        skipMatches?: number;
    } = {}): Promise<Locator> {
        const rowIndex = await this.findMotovehiculoRow(options);
        const label = [
            options.company ? `de ${options.company}` : "",
            options.description ? `con "${options.description}"` : "",
            options.skipMatches ? `(skip ${options.skipMatches})` : "",
        ].filter(Boolean).join(" ");
        expect(rowIndex, `No se encontró cotización MOTOVEHICULO ${label}`.trim()).toBeGreaterThanOrEqual(0);
        return this.getRow(rowIndex);
    }

    public async clickEmitirMotovehiculo(options: {
        company?: CompanyName | string;
        description?: string;
        skipMatches?: number;
    } = {}): Promise<void> {
        const row = await this.getMotovehiculoRow(options);
        await this.clickEmitir(row);
    }

    public async clickRecotizarMotovehiculo(options: {
        company?: CompanyName | string;
        description?: string;
        skipMatches?: number;
    } = {}): Promise<void> {
        const row = await this.getMotovehiculoRow(options);
        await this.clickRecotizar(row);
    }

    private getCompanyLogoSelector(company: CompanyName): string {
        const selector = this.logoSelectors[company];

        if (!selector) {
            throw new Error(`Compañía desconocida: ${company}`);
        }

        return selector;
    }
}
