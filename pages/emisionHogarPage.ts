import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../components/commonButtons";
import CotizacionHogar from "../components/hogar/cotizacionHogar";
import CotizacionPersona from "../components/hogar/cotizacionPersona";
import CotizacionTablaHogar from "../components/hogar/cotizacionTabla";
import EmisionCliente from "../components/emisionCliente";
import Companias from "../components/companias";
import EmisionFormaPago from "../components/emisionFormaPago";
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
    readonly cotizacionTabla: CotizacionTablaHogar;
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
        this.cotizacionTabla = new CotizacionTablaHogar(page);
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
        const incendioEdificioInput = this.cotizacionTabla.getInputByHogarLabel('Incendio Edificio');
        const incendioMobiliarioInput = this.cotizacionTabla.getInputByHogarLabel('Incendio Mobiliario');
        const cristalesInput = this.cotizacionTabla.getInputByHogarLabel('Cristales');
        const roboInput = this.cotizacionTabla.getInputByHogarLabel('Robo y/o Hurto del Mobiliario');
        const equiposElectronicosInput = this.cotizacionTabla.getInputByHogarLabel('Aparatos y/o Equipos Electrónicos');
        await expect(this.cotizacionTabla.incendioText).toBeVisible({ timeout: 60000 });

        

        await incendioEdificioInput.fill('30000000');
        await incendioMobiliarioInput.fill('45000000');
        await cristalesInput.fill('550000');
        await roboInput.fill('5000000');
        await equiposElectronicosInput.fill('2000000');

        await this.cotizacionTabla.rBtnBici.click();
        await this.cotizacionTabla.rBtnNotebook.click();
        await this.cotizacionTabla.rBtnTablet.click();
        await this.cotizacionTabla.rBtnVarios.click();

        await this.cotizacionTabla.descuentoBar20.click();

        await this.buttons.cotizarBtn.click();

        await this.buttons.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 });

        await expect(this.buttons.siguienteBtn.or(this.cotizacionTabla.cotizacionErrorText)).toBeVisible({ timeout: 60000 });
        const errorVisible = await this.cotizacionTabla.cotizacionErrorText.isVisible();
        if (errorVisible) {
            throw new Error("Hubo un problema al cotizar la póliza.");
        }

    }

    async emitirFormaPago(hogar: any) {
        const nroCBU = "0113941911100007976873";
        const nroTarjeta = "4509953566233704";
        const vencimientoMes = "11";
        const vencimientoAnio = "25";
        await this.emisionFormaPago.selectPaymentOption(hogar.formaPago);
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
        const filepath = "C:\\Polko\\Polko_final\\fixtures\\auto.jpeg";
        await this.emisionInspeccion.dropzoneObjVarios.setInputFiles(filepath);
        await expect(this.emisionInspeccion.imgInspeccionObjVarios).toBeVisible();
        await this.emisionInspeccion.descObjVariosInput.fill("Televisor Samsung 55 pulgadas");
        await this.emisionInspeccion.montoObjVariosInput.fill("500000");
        await this.emisionInspeccion.dropzoneBici.setInputFiles(filepath);
        await expect(this.emisionInspeccion.imgInspeccionBici).toBeVisible();
        await this.emisionInspeccion.descBiciInput.fill("Bicicleta Mountain Bike");
        await this.emisionInspeccion.montoBiciInput.fill("1000000");
        await expect(this.buttons.siguienteBtn).toBeEnabled();
        await this.buttons.siguienteBtn.click();
    }

    async emitirFinal(valorTabla: string | null) {

        const valorFinal = await this.emisionFinal.getValorCoberturaFinal();
        await expect(valorTabla).toEqual(valorFinal);
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