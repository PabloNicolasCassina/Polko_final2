/// <reference types="node" />
import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../components/commonButtons";
import CotizacionEmpleador from "../components/ART/cotizacionEmpleador";
import CotizacionEmpleado from "../components/ART/cotizacionEmpleado";
import DashboardPage from "./dashboardPage";
import TablaUltCotizaciones from "../components/ART/tablaUltCotizaciones";
import TablaEmision, { CompanyKey } from "../components/ART/tablaEmision";
import EmisionFinal from "../components/emisionFinal";
import path from "path";



export default class EmisionArtPage {
    readonly page: Page;
    readonly cotizacionEmpleador: CotizacionEmpleador;
    readonly cotizacionEmpleado: CotizacionEmpleado;
    readonly buttons: CommonButtons;
    readonly dashboardPage: DashboardPage;
    readonly tablaUltCotizaciones: TablaUltCotizaciones
    readonly tablaEmision: TablaEmision;
    readonly emisionFinal: EmisionFinal;






    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.cotizacionEmpleador = new CotizacionEmpleador(page);
        this.cotizacionEmpleado = new CotizacionEmpleado(page);
        this.dashboardPage = new DashboardPage(page);
        this.tablaUltCotizaciones = new TablaUltCotizaciones(page)
        this.tablaEmision = new TablaEmision(page);
        this.emisionFinal = new EmisionFinal(page);

    }


    async completarDatosEmpleador(artData: any) {
        const filePath = path.join(__dirname, '..', 'fixtures', 'art.pdf');
        await this.cotizacionEmpleador.empleadorInput.fill(artData.empleador);
        await this.cotizacionEmpleador.cuitInput.fill(artData.cuit);
        if (artData.tieneContratoVigente) {
            await this.cotizacionEmpleador.chkContrato.click();
        }
        await this.cotizacionEmpleador.f931Input.setInputFiles(filePath);
        await this.buttons.siguienteBtn.click();
    }

    async completarDatosEmpleado(artData: any) {
        const regimenOptionLocator = this.cotizacionEmpleado.getOptionLocator(artData.regimen);
        await this.cotizacionEmpleado.selectRegimen.click();
        await regimenOptionLocator.click();
        await this.cotizacionEmpleado.cantEmpleados.fill(artData.cantEmpleados);
        if (artData.regimen === "Régimen General") {
            await this.cotizacionEmpleado.masaSalarial.fill(artData.masaSalarial);
        } else if (artData.regimen === "Régimen Especial") {
            await this.cotizacionEmpleado.horasSemanales.click();
            await this.cotizacionEmpleado.getOptionLocator(artData.horasSemanales).click();
        }
        await this.buttons.cotizarBtn.click();
        await this.buttons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });
        await expect(this.cotizacionEmpleado.resultadoCotizacion.or(this.cotizacionEmpleado.errorCotizacion)).toBeVisible();
        const huboError = await this.cotizacionEmpleado.errorCotizacion.isVisible();
        if (huboError) {
            const errorTexto = await this.cotizacionEmpleado.errorCotizacion.textContent();
            throw new Error(`Falló la cotización: ${errorTexto}`);
        }

        await expect(this.cotizacionEmpleado.resultadoCotizacion).toBeVisible();
        await this.cotizacionEmpleado.btnVerCotizacion.click();
        await expect (this.dashboardPage.retirarFondos).toBeVisible({ timeout: 1200000 });

    }

    async tablaUltCotizacionesEmision()
    {
        await this.tablaUltCotizaciones.filterBox.click();
        await this.tablaUltCotizaciones.selectARTOption().click();
        await this.buttons.emitirBtn.first().click();
    }

    async seleccionarCobertura(compania?: CompanyKey)
    {
        await this.buttons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });
        if (compania) {
            const companyButton = this.tablaEmision.getCompanyButton(compania);
            await expect(companyButton).toBeVisible({ timeout: 60000 });
            await companyButton.scrollIntoViewIfNeeded();
            await companyButton.click();
            return;
        }

        if (await this.tablaEmision.regimenEspecial.isVisible()) {
            await this.buttons.emitirBtn.first().click();
            return;
        }

        await this.tablaEmision.masBtn.click();
        await this.tablaEmision.menosBtn.click();
        await this.buttons.emitirBtn.first().click();
    }

    

    async emitirFinal() {
        await expect(this.buttons.emitirBtn).toBeEnabled({ timeout: 60000 });
        await this.buttons.emitirBtn.click();
        await expect(this.buttons.loadingSpinner).toBeHidden({ timeout: 1200000 });
        await expect(this.emisionFinal.emisionExitosaText.or(this.emisionFinal.errorEmision)).toBeVisible({ timeout: 60000 });
        const errorVisible = await this.emisionFinal.errorEmision.isVisible();
        if (errorVisible) {
            throw new Error("Hubo un problema al emitir la póliza.");
        }
    }
}
