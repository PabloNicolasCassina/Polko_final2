import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../components/commonButtons";
import CotizacionHogar from "../components/hogar/cotizacionHogar";
import CotizacionPersona from "../components/hogar/cotizacionPersona";
import CotizacionTabla from "../components/hogar/cotizacionTabla";
import EmisionCliente from "../components/hogar/emisionCliente";
import Companias from "../components/companias";
import EmisionFormaPago from "../components/hogar/emisionFormaPago";
import EmisionDetalleHogar from "../components/hogar/emisionDetallehogar";
import EmisionInspeccion from "../components/hogar/emisionInspeccion";
import emisionFinal from "../components/emisionFinal";
import { get } from "http";
import EmisionFinal from "../components/emisionFinal";


export default class EmisionHogarPage {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly cotizacionHogar: CotizacionHogar;
    readonly cotizacionPersona: CotizacionPersona;
    readonly cotizacionTabla: CotizacionTabla;
    readonly emisionCliente: EmisionCliente;
    readonly companias: Companias;
    readonly emisionFormaPago: EmisionFormaPago;
    readonly emisionDetallehogar: EmisionDetalleHogar;
    readonly emisionInspeccion: EmisionInspeccion;
    readonly emisionFinal: emisionFinal;




    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.cotizacionHogar = new CotizacionHogar(page);
        this.cotizacionPersona = new CotizacionPersona(page);
        this.cotizacionTabla = new CotizacionTabla(page);
        this.emisionCliente = new EmisionCliente(page);
        this.companias = new Companias(page);
        this.emisionFormaPago = new EmisionFormaPago(page);
        this.emisionDetallehogar = new EmisionDetalleHogar(page);
        this.emisionInspeccion = new EmisionInspeccion(page);
        this.emisionFinal = new EmisionFinal(page);
    }

    async seleccionarHogar(hogar: any) {
        console.log(`${hogar.tamanioVivienda}`);
        const tipoViviendaOptionLocator = this.cotizacionHogar.getOptionLocator(hogar.tipoVivienda);
        const tamanioViviendaOptionLocator = this.cotizacionHogar.getOptionLocator(hogar.tamanioVivienda);
        const localidadOptionLocator = this.cotizacionHogar.getOptionLocator(hogar.localidad);


        await this.cotizacionHogar.tipoViviendaSelector.click();
        await tipoViviendaOptionLocator.click();
        await this.cotizacionHogar.tamanioViviendaSelector.click();
        await tamanioViviendaOptionLocator.click();
        await this.cotizacionHogar.codigoPostalSelector.fill(hogar.c_postal);
        await this.cotizacionHogar.localidadSelector.click();
        await expect(localidadOptionLocator).toBeVisible({ timeout: 300000 });
        await localidadOptionLocator.click();
        await this.buttons.siguienteBtn.click();

    }


    async tablaCotizacion() {
        await expect(this.cotizacionTabla.configAvanzadaBtn.or(this.cotizacionTabla.cotizacionErrorText)).toBeVisible({ timeout: 60000 });
        const errorVisible = await this.cotizacionTabla.cotizacionErrorText.isVisible();
        if (errorVisible) {
            throw new Error("Hubo un problema al cotizar la póliza.");
        }
        await this.cotizacionTabla.configAvanzadaBtn.click();
        await this.cotizacionTabla.fechaVigencia.fill(this.cotizacionTabla.setVechaVigencia());
        await this.cotizacionTabla.descuentoBar15.click();
        await this.buttons.aplicarCambiosBtn.click();
        await expect(this.buttons.loadingSpinner).toBeHidden({ timeout: 60000 });

    }

    async emitirFormaPago(hogar: any) {
        const nroCBU = "0113941911100007976873";
        const nroTarjeta = "4509953566233704";
        const vencimientoMes = "11";
        const vencimientoAnio = "25";
        await this.emisionFormaPago.formaPagoSelect.click();
        await this.emisionFormaPago.getFormaPago(hogar).click();
        if (hogar.formaPago === "Débito por CBU" || hogar.formaPagoZurich === "Débito por CBU") {
            await this.emisionFormaPago.CBU.fill(nroCBU);
            await this.buttons.siguienteBtn.click();
        } else if (hogar.formaPago === "Tarjeta de Crédito" || hogar.formaPagoZurich === "Tarjeta de Crédito") {
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


    async emitirInspeccion() {
        const filepath = "C:\\Polko\\Polko_final\\fixtures\\hogar.jpeg";
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