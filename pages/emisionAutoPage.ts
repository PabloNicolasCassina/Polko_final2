import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../components/commonButtons";
import CotizacionVehiculo from "../components/auto/cotizacionVehiculo";
import CotizacionPersona from "../components/auto/cotizacionPersona";
import CotizacionTabla from "../components/auto/cotizacionTabla";
import EmisionCliente from "../components/auto/emisionCliente";
import Companias from "../components/companias";
import EmisionFormaPago from "../components/auto/emisionFormaPago";
import EmisionDetalleAuto from "../components/auto/emisionDetalleAuto";
import EmisionInspeccion from "../components/auto/emisionInspeccion";
import emisionFinal from "../components/emisionFinal";
import { get } from "http";
import EmisionFinal from "../components/emisionFinal";


export default class EmisionAutoPage {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly cotizacionVehiculo: CotizacionVehiculo;
    readonly cotizacionPersona: CotizacionPersona;
    readonly cotizacionTabla: CotizacionTabla;
    readonly emisionCliente: EmisionCliente;
    readonly companias: Companias;
    readonly emisionFormaPago: EmisionFormaPago;
    readonly emisionDetalleAuto: EmisionDetalleAuto;
    readonly emisionInspeccion: EmisionInspeccion;
    readonly emisionFinal: emisionFinal;




    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.cotizacionVehiculo = new CotizacionVehiculo(page);
        this.cotizacionPersona = new CotizacionPersona(page);
        this.cotizacionTabla = new CotizacionTabla(page);
        this.emisionCliente = new EmisionCliente(page);
        this.companias = new Companias(page);
        this.emisionFormaPago = new EmisionFormaPago(page);
        this.emisionDetalleAuto = new EmisionDetalleAuto(page);
        this.emisionInspeccion = new EmisionInspeccion(page);
        this.emisionFinal = new EmisionFinal(page);
    }

    async seleccionarAuto(auto: any, company: string) {
        const marcaOptionLocator = this.cotizacionVehiculo.getMarcaLocator(auto.marca);
        const anioOptionLocator = this.cotizacionVehiculo.getAnioLocator(auto.año);
        const modelOptionLocator = this.cotizacionVehiculo.getModeloLocator(auto.modelo);
        const versionOptionLocator = this.cotizacionVehiculo.getVersionLocator(auto.version);


        await this.cotizacionVehiculo.marcaSelector.click();
        await marcaOptionLocator.click();
        await this.cotizacionVehiculo.añoSelector.click();
        await anioOptionLocator.click();
        await this.cotizacionVehiculo.modeloSelector.click();
        await expect(modelOptionLocator).toBeVisible({ timeout: 300000 });
        await modelOptionLocator.click();
        await this.cotizacionVehiculo.versionSelector.click();
        await expect(versionOptionLocator).toBeVisible({ timeout: 300000 });
        await versionOptionLocator.click();
        if (auto.ceroKm) {
            await this.cotizacionVehiculo.ceroKmSelector.click();
            await this.buttons.siOptionLocator.click();
        }
        if (auto.gnc) {
            await this.cotizacionVehiculo.gncSelector.click();
            await this.buttons.siOptionLocator.click();
        }
        await this.buttons.siguienteBtn.click();

    }

    async seleccionarPersona(auto: any) {

        const tipoPersonaOptionLocator = this.cotizacionPersona.getTipoPersonaLocator(auto.tipoPersona);
        const sitImpositivaOptionLocator = this.cotizacionPersona.getSitImpositivaLocator(auto.sitImpositiva);
        const provinciaOptionLocator = this.cotizacionPersona.getProvinciaLocator(auto.provincia);
        const localidadOptionLocator = this.cotizacionPersona.getLocalidadLocator(auto.localidad);



        await this.cotizacionPersona.tipoPersona.click()
        await tipoPersonaOptionLocator.click();
        await this.cotizacionPersona.sitImpositiva.click();
        await sitImpositivaOptionLocator.click();
        await this.cotizacionPersona.codPostal.click();
        await this.cotizacionPersona.codPostal.fill(auto.c_postal);
        await this.cotizacionPersona.localidad.click();
        await expect(localidadOptionLocator).toBeVisible({ timeout: 300000 });
        await localidadOptionLocator.click();
        if (auto.zurich) {
            await this.buttons.siguienteBtn.click();
            await this.cotizacionVehiculo.scoringZurich.fill("45");
            await this.cotizacionVehiculo.sexoZurich.click();
            await this.page.getByRole("option", { name: "Masculino" }).click();
            await this.buttons.cotizarBtn.click();

        } else {
            await this.buttons.cotizarBtn.click();
        }

    }

    async tablaCotizacion() {
        await this.cotizacionTabla.configAvanzadaBtn.waitFor();
        await this.cotizacionTabla.configAvanzadaBtn.click();
        await this.cotizacionTabla.fechaVigencia.fill(this.cotizacionTabla.setVechaVigencia());
        await this.cotizacionTabla.descuentoBar15.click();
        await this.buttons.aplicarCambiosBtn.click();
        await expect(this.buttons.loadingSpinner).toBeHidden({ timeout: 60000 });
        
    }

    async emitirFormaPago(auto: any) {
        const nroCBU = "0113941911100007976873";
        const nroTarjeta = "4509953566233704";
        const vencimientoMes = "11";
        const vencimientoAnio = "25";
        await this.emisionFormaPago.formaPagoSelect.click();
        await this.emisionFormaPago.getFormaPago(auto).click();
        if (auto.formaPago === "Débito por CBU" || auto.formaPagoZurich === "Débito por CBU") {
            await this.emisionFormaPago.CBU.fill(nroCBU);
            await this.buttons.siguienteBtn.click();
        } else if (auto.formaPago === "Tarjeta de Crédito" || auto.formaPagoZurich === "Tarjeta de Crédito") {
            await this.emisionFormaPago.marcaTarjeta.click();
            await this.page.getByRole('option', { name: 'Visa' }).click();
            await this.emisionFormaPago.nroTarjeta.fill(nroTarjeta);
            await this.emisionFormaPago.vencimientoTarjetaMes.fill(vencimientoMes);
            await this.emisionFormaPago.vencimientoTarjetaAnio.fill(vencimientoAnio);
            await this.buttons.siguienteBtn.click();
        } else {
            await this.buttons.siguienteBtn.click();
        }

    }

    async emitirCliente() {
        await this.emisionCliente.nosisInput.fill("20386485446")
        await this.emisionCliente.buscarBtn.click();
        await expect(this.emisionCliente.localidadInput).not.toBeEmpty();
        await this.buttons.siguienteBtn.click();
    }

    async emitirDetalleAuto() {
        const patente = this.emisionDetalleAuto.generarPatenteAleatoriaAuto();
        const nroMotor = this.emisionDetalleAuto.generarNroMotorAleatorio();
        const nroChasis = this.emisionDetalleAuto.generarNroChasisAleatorio();

        await expect(this.page.getByText("Datos del vehículo")).toBeVisible({ timeout: 30000 });
        await expect(this.emisionDetalleAuto.patenteInput).toBeVisible({ timeout: 30000 }); // Espera hasta 30s si es necesario
        await this.emisionDetalleAuto.patenteInput.fill(patente);
        await this.emisionDetalleAuto.nroMotorInput.fill(nroMotor);
        await this.emisionDetalleAuto.nroChasisInput.fill(nroChasis);
        await this.emisionDetalleAuto.descripcionGncInput.fill("GNCIP");
        await this.emisionDetalleAuto.marcaReguladorInput.fill("ACME");
        await this.emisionDetalleAuto.nroReguladorInput.fill("123456");
        await this.emisionDetalleAuto.nuevoCilindroBtn.click();
        for (let i = 0; i < 2; i++) {
            const marcaCilindro = this.emisionDetalleAuto.generarMarcaCilindroAleatorio();
            const numeroCilindro = this.emisionDetalleAuto.generarNroCilindroAleatorio();
            await this.emisionDetalleAuto.getMarcaCilindroLocator(i.toString()).fill(marcaCilindro);
            await this.emisionDetalleAuto.getNumeroCilindroLocator(i.toString()).fill(numeroCilindro);
        }
        await this.buttons.siguienteBtn.click();


    }

    async emitirInspeccion() {
        const filepath = "C:\\Polko\\Polko_final\\fixtures\\auto.jpeg";
        await this.emisionInspeccion.inspecciondpzone.setInputFiles(filepath);
        await expect(this.emisionInspeccion.imgInspeccion).toBeVisible();
        await this.emisionInspeccion.etiquetaImg.click();
        await this.emisionInspeccion.etiquetaOption.click();
        await expect(this.buttons.siguienteBtn).toBeEnabled();
        await this.buttons.siguienteBtn.click();
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
                    await expect(this.emisionFinal.descargaBtn).toBeEnabled({ timeout: 60000 });
                };

    


}