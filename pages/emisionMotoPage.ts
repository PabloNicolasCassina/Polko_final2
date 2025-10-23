import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../components/commonButtons";
import CotizacionMoto from "../components/moto/cotizacionMoto";
import CotizacionPersona from "../components/moto/cotizacionPersonaMoto";
import CotizacionTablaMoto from "../components/moto/cotizacionTablaMoto";
import EmisionCliente from "../components/moto/emisionCliente";
import Companias from "../components/companias";
import EmisionFormaPago from "../components/moto/emisionFormaPago";
import EmisionDetalleMoto from "../components/moto/emisionDetalleMoto";
import EmisionInspeccion from "../components/moto/emisionInspeccion";
import EmisionFinal from "../components/emisionFinal";
import { get } from "http";


export default class EmisionMotoPage {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly cotizacionMoto: CotizacionMoto;
    readonly cotizacionPersona: CotizacionPersona;
    readonly cotizacionTablaMoto: CotizacionTablaMoto;
    readonly emisionCliente: EmisionCliente;
    readonly companias: Companias;
    readonly emisionFormaPago: EmisionFormaPago;
    readonly emisionDetalleMoto: EmisionDetalleMoto;
    readonly emisionInspeccion: EmisionInspeccion;
    readonly emisionFinal: EmisionFinal;




    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.cotizacionMoto = new CotizacionMoto(page);
        this.cotizacionPersona = new CotizacionPersona(page);
        this.cotizacionTablaMoto = new CotizacionTablaMoto(page);
        this.emisionCliente = new EmisionCliente(page);
        this.companias = new Companias(page);
        this.emisionFormaPago = new EmisionFormaPago(page);
        this.emisionDetalleMoto = new EmisionDetalleMoto(page);
        this.emisionInspeccion = new EmisionInspeccion(page);
        this.emisionFinal = new EmisionFinal(page);
    }

    async seleccionarMoto(moto: any, company: string) {
        const marcaOptionLocator = this.cotizacionMoto.getMarcaLocator(moto.marca);
        const anioOptionLocator = this.cotizacionMoto.getAnioLocator(moto.año);
        const versionOptionLocator = this.cotizacionMoto.getVersionLocator(moto.version);


        await this.cotizacionMoto.marcaSelector.click();
        await marcaOptionLocator.click();
        await this.cotizacionMoto.añoSelector.click();
        await anioOptionLocator.click();
        await this.cotizacionMoto.versionSelector.click();
        await expect(versionOptionLocator).toBeVisible({ timeout: 300000 });
        await versionOptionLocator.click();
        if (moto.ceroKm) {
            await this.cotizacionMoto.ceroKmSelector.click();
            await this.buttons.siOptionLocator.click();
        }
        await this.buttons.siguienteBtn.click();

    }

    async seleccionarPersona(moto: any) {

        const tipoPersonaOptionLocator = this.cotizacionPersona.getTipoPersonaLocator(moto.tipoPersona);
        const sitImpositivaOptionLocator = this.cotizacionPersona.getSitImpositivaLocator(moto.sitImpositiva);
        const provinciaOptionLocator = this.cotizacionPersona.getProvinciaLocator(moto.provincia);
        const localidadOptionLocator = this.cotizacionPersona.getLocalidadLocator(moto.localidad);



        await this.cotizacionPersona.tipoPersona.click()
        await tipoPersonaOptionLocator.click();
        await this.cotizacionPersona.sitImpositiva.click();
        await sitImpositivaOptionLocator.click();
        await this.cotizacionPersona.codPostal.click();
        await this.cotizacionPersona.codPostal.fill(moto.c_postal);
        await this.cotizacionPersona.localidad.click();
        await expect(localidadOptionLocator).toBeVisible({ timeout: 300000 });
        await localidadOptionLocator.click();
        await this.buttons.cotizarBtn.click();

    }

    async tablaCotizacion(moto: any) {
        await this.cotizacionTablaMoto.configAvanzadaBtn.waitFor();
        await this.cotizacionTablaMoto.configAvanzadaBtn.click();
        await this.cotizacionTablaMoto.fechaVigencia.fill(this.cotizacionTablaMoto.setVechaVigencia());
        if (!moto.sancor) {
            await this.cotizacionTablaMoto.descuentoBar15.click();
        }
        await this.buttons.aplicarCambiosBtn.click();
        await expect(this.buttons.loadingSpinner).toBeHidden({ timeout: 60000 });

    }

    async emitirFormaPago(moto: any) {
        const nroCBU = "0113941911100007976873";
        const nroTarjeta = "4509953566233704";
        const vencimientoMes = "11";
        const vencimientoAnio = "25";
        await this.emisionFormaPago.formaPagoSelect.click();
        await this.emisionFormaPago.getFormaPago(moto).click();
        if (moto.formaPago === "Débito por CBU") {
            await this.emisionFormaPago.CBU.fill(nroCBU);
            await this.buttons.siguienteBtn.click();
        } else if (moto.formaPago === "Tarjeta de Crédito") {
            await this.emisionFormaPago.marcaTarjeta.click();
            await this.page.getByRole('option', { name: 'Visa' }).click();
            await this.emisionFormaPago.nroTarjeta.fill(nroTarjeta);
            if (moto.atm) {
                await this.emisionFormaPago.vencimientoTarjetaMes.fill(vencimientoMes);
                await this.emisionFormaPago.vencimientoTarjetaAnio.fill(vencimientoAnio);
            }



        }

        await this.buttons.siguienteBtn.click();

    }

    async emitirCliente() {
        await this.emisionCliente.nosisInput.fill("20386485446")
        await this.emisionCliente.buscarBtn.click();
        await expect(this.emisionCliente.localidadInput).not.toBeEmpty();
        await this.buttons.siguienteBtn.click();
    }

    async emitirDetalleAuto() {
        const patente = this.emisionDetalleMoto.generarPatenteAleatoriaAuto();
        const nroMotor = this.emisionDetalleMoto.generarNroMotorAleatorio();
        const nroChasis = this.emisionDetalleMoto.generarNroChasisAleatorio();

        await expect(this.page.getByText("Datos del vehículo")).toBeVisible({ timeout: 30000 });
        await expect(this.emisionDetalleMoto.patenteInput).toBeVisible({ timeout: 30000 }); // Espera hasta 30s si es necesario
        await this.emisionDetalleMoto.patenteInput.fill(patente);
        await this.emisionDetalleMoto.nroMotorInput.fill(nroMotor);
        await this.emisionDetalleMoto.nroChasisInput.fill(nroChasis);
        await this.buttons.siguienteBtn.click();


    }

    async emitirInspeccion() {
        const filepath = "C:\\Polko\\Polko_final\\fixtures\\moto.jpg";
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