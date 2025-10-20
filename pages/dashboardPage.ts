import { Page, Locator, expect } from "@playwright/test";

export default class DashboardPage {
    readonly page: Page;
    readonly homeBtn: Locator;
    readonly productosBtn: Locator;
    readonly productosAutomotor: Locator;
    readonly productosMoto: Locator;
    readonly productosHogar: Locator;
    readonly productosAP: Locator;
    readonly documentacionBtn: Locator;
    readonly walletBtn: Locator;
    readonly marketingBtn: Locator;
    readonly academiaBtn: Locator;
    readonly misaseguradorasBtn: Locator;
    readonly masterBtn: Locator;
    readonly aseguradoraFilter: Locator;
    readonly retirarFondos: Locator;

    constructor(page: Page) {
        this.page = page;
        this.homeBtn = page.locator('#Sidebar-menu');
        this.productosBtn = page.locator('#Sidebar-Productos-icon');
        this.productosAutomotor = page.getByText('Automotor', { exact: true });
        this.productosMoto = page.getByText('Motovehículo', { exact: true });
        this.productosHogar = page.getByText('Hogar', { exact: true });
        this.productosAP = page.getByText('Accidentes personales', { exact: true });
        this.documentacionBtn = page.locator('#Sidebar-Documentacion-icon');
        this.walletBtn = page.locator('#Sidebar-Billetera-icon');
        this.marketingBtn = page.locator('#Sidebar-Marketing-icon');
        this.academiaBtn = page.locator('#Sidebar-Academia-icon');
        this.misaseguradorasBtn = page.locator('#Sidebar-mis Aseguradoras-icon');
        this.masterBtn = page.locator('#Sidebar-Master-icon');
        this.retirarFondos = page.getByRole('button', { name: 'RETIRAR FONDOS' })
        this.aseguradoraFilter = page.getByRole('searchbox', { name: 'Aseguradora' })


    }

    async ingreso() {
        await this.page.goto("http://localhost:3000/u/dashboard");
        await this.page.waitForLoadState("networkidle");
        await expect(this.retirarFondos).toBeVisible();
    }

    async navegacionAuto() {
        await this.homeBtn.click();
        await this.productosBtn.click();
        await this.productosAutomotor.click();
    }

    async ultimasCotizaciones(producto: string, modo: string) {
        const row = this.page
            .getByRole('row', { name: producto })
            .getByRole('button', { name: modo })
            .first()
            .click()
    }

}



