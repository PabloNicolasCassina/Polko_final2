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

    // Ranking (columna derecha del dashboard)
    readonly resumenContainer: Locator;
    readonly resumenPuestoLabel: Locator;
    readonly resumenEmisionesLabel: Locator;
    readonly rankingTitle: Locator;
    readonly rankingTable: Locator;

    // Widget "Mi billetera" -> sección "Acuerdos"
    readonly acuerdosHeading: Locator;
    readonly acuerdosInfoIcon: Locator;
    readonly acuerdosPlusIcon: Locator;
    readonly acuerdosDetail: Locator;

    // Popup de alta de acuerdo
    readonly agreementsPopup: Locator;
    readonly agreementsPopupCloseIcon: Locator;
    readonly agreementPresetCards: Locator;
    readonly agreementSiguienteBtn: Locator;
    readonly confirmAgreementTitle: Locator;
    readonly confirmAgreementAceptoBtn: Locator;
    readonly confirmAgreementAtrasBtn: Locator;


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

        this.resumenContainer = page.getByText('Resumen', { exact: true }).locator('..');
        this.resumenPuestoLabel = page.getByText('Puesto', { exact: true });
        this.resumenEmisionesLabel = page.getByText('Emisiones', { exact: true }).first();
        this.rankingTitle = page.locator('.Ranking__title');
        this.rankingTable = page.locator('.Ranking__table');

        this.acuerdosHeading = page.getByRole('heading', { name: 'Acuerdos', exact: true });
        this.acuerdosInfoIcon = page.locator('.MWallet__agreementHeader img').first();
        this.acuerdosPlusIcon = page.locator('#Dashboard-acuerdosMasIcono');
        this.acuerdosDetail = page.locator('.MWallet__agreementDetail');

        this.agreementsPopup = page.locator('.AgreementsPopUp');
        this.agreementsPopupCloseIcon = page.locator('.AgreementsPopUp_iconClose');
        this.agreementPresetCards = page.locator('.AgreementCard__container');
        this.agreementSiguienteBtn = page.getByRole('button', { name: 'SIGUIENTE' });
        this.confirmAgreementTitle = page.locator('.ConfirmAgreementsPopUp__title');
        this.confirmAgreementAceptoBtn = page.getByRole('button', { name: 'ACEPTO' });
        this.confirmAgreementAtrasBtn = page.getByRole('button', { name: 'ATRAS' });
    }

    async ingreso() {
        //await this.page.goto("http://localhost:3000/u/dashboard");
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

    /**
     * Devuelve las filas de datos (excluyendo el encabezado) de la tabla de Ranking.
     */
    async getRankingRows(): Promise<{ nombre: string; emisiones: string }[]> {
        const rows = await this.rankingTable.locator('tr').all();
        const data: { nombre: string; emisiones: string }[] = [];
        for (const row of rows) {
            // Las filas de datos tienen <td>; la fila de encabezado solo tiene <th>.
            const cells = await row.locator('td').allTextContents();
            if (cells.length >= 3) {
                data.push({ nombre: cells[1].trim(), emisiones: cells[2].trim() });
            }
        }
        return data;
    }

    /**
     * Abre el popup de alta de acuerdo desde el widget "Mi billetera" del dashboard.
     */
    async abrirNuevoAcuerdo(): Promise<void> {
        await this.acuerdosPlusIcon.click();
        await expect(this.agreementsPopup).toBeVisible();
    }

    /**
     * Selecciona el primer preset de incentivo (viene pre-seleccionado) y avanza.
     */
    async seleccionarPrimerPresetYContinuar(): Promise<void> {
        await expect(this.agreementPresetCards.first()).toBeVisible();
        await this.agreementSiguienteBtn.click();
        await expect(this.confirmAgreementTitle).toBeVisible();
    }

    /**
     * Confirma el acuerdo en el popup de confirmación ("ACEPTO").
     */
    async confirmarAcuerdo(): Promise<void> {
        await this.confirmAgreementAceptoBtn.click();
    }

}



