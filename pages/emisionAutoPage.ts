import { Page, Locator, expect } from "@playwright/test";
import path from "path";
import CommonButtons from "../components/commonButtons";
import CotizacionVehiculo from "../components/auto/cotizacionVehiculo";
import CotizacionPersona from "../components/auto/cotizacionPersona";
import CotizacionTabla from "../components/auto/cotizacionTabla";
import EmisionCliente from "../components/emisionCliente";
import Companias from "../components/companias";
import QuotationSidebar from "../components/quotationSidebar";
import EmisionFormaPago from "../components/emisionFormaPago";
import EmisionDetalleAuto from "../components/auto/emisionDetalleAuto";
import EmisionInspeccion from "../components/auto/emisionInspeccion";
import EmisionInspeccionMercantilAndina from "../components/auto/emisionInspeccionMercantilAndina";
import EmisionFinal from "../components/emisionFinal";
import { setupReactErrorGuard } from "../helpers/reactErrorGuard";


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
    readonly emisionFinal: EmisionFinal;
    valorSumaAsegurada: string | null = null;



    constructor(page: Page) {
        this.page = page;
        setupReactErrorGuard(page);
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
        await expect(modelOptionLocator).toBeVisible({ timeout: 180000 });
        await modelOptionLocator.click();
        await this.cotizacionVehiculo.versionSelector.click();
        await expect(versionOptionLocator).toBeVisible({ timeout: 180000 });
        await versionOptionLocator.click();
        if (auto.ceroKm) {
            await this.cotizacionVehiculo.ceroKmSelector.click();
            await this.buttons.siOptionLocator.click();
        }
        if (auto.gnc) {
            await this.cotizacionVehiculo.gncSelector.click();
            await this.buttons.siOptionLocator.click();
        }
        if (auto.prenda) {
            await this.cotizacionVehiculo.sujetoAPrendaCbox.check();
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
        await expect(sitImpositivaOptionLocator).toBeHidden({ timeout: 10000 });
        await this.cotizacionPersona.codPostal.click();
        await this.cotizacionPersona.codPostal.fill(auto.c_postal);
        await this.cotizacionPersona.localidad.click();
        await expect(localidadOptionLocator).toBeVisible({ timeout: 180000 });
        await localidadOptionLocator.click();
        //if (auto.zurich) {
        //    await this.buttons.siguienteBtn.click();
        //    await this.cotizacionVehiculo.scoringZurich.fill("45");
        //    await this.cotizacionVehiculo.sexoZurich.click();
        //    await this.page.getByRole("option", { name: "Masculino" }).click();
        //    await this.buttons.cotizarBtn.click();
//
        //} else {
            await this.buttons.cotizarBtn.click();
        //}
    }

    async tablaCotizacion(auto: any, compania: string) {
        await expect(this.cotizacionTabla.configAvanzadaBtn.or(this.cotizacionTabla.cotizacionErrorText)).toBeVisible({ timeout: 180000 });
        const errorVisible = await this.cotizacionTabla.cotizacionErrorText.isVisible();
        if (errorVisible) {
            throw new Error("Hubo un problema al cotizar la póliza.");
        }
        const sidebar = new QuotationSidebar(this.page);
        if (auto.configAvanzada) {
            // Esperar a que la compañía tenga suma/coberturas antes de abrir config:
            // si se abre antes, Triunfo muestra suma $0 y "Aplicar cambios" queda disabled.
            await expect(this.page.getByText('Suma asegurada:', { exact: true })).toBeVisible({ timeout: 180000 });
            if (sidebar.isCompact()) {
                await sidebar.abrirConfigAvanzada();
            } else {
                await this.cotizacionTabla.configAvanzadaBtn.click();
            }
            await this.cotizacionTabla.fillCompanySpecificAdvancedConfig(auto);
            await sidebar.aplicarConfig(50000);
            await expect(this.buttons.getSuccessBadge(compania)).toBeVisible({ timeout: 200000 });
        } else if (auto.triunfo && auto.descuento > 0) {
            // Desktop: el slider de descuento de Triunfo es siempre visible; compacto: vive en el drawer avanzado.
            await sidebar.abrirConfigAvanzada();
            await this.cotizacionTabla.descuentoPointer.click();
            await this.page.keyboard.press("End");
            await sidebar.aplicarConfig(30000);
            await expect(this.buttons.getSuccessBadge(compania)).toBeVisible({ timeout: 180000 });
        }

        const valorTabla = await this.cotizacionTabla.getValorCoberturaTabla(compania);

        await this.cotizacionTabla.clickBtnPlus(compania);
        await this.cotizacionTabla.carritoBtn.click();
        const carritoPrecio = await this.cotizacionTabla.getValorCarrito(compania);
//
        if (valorTabla && carritoPrecio) {
            const parseValor = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
            const diff = Math.abs(parseValor(valorTabla) - parseValor(carritoPrecio));
            await expect(diff, `No son iguales los valores de la tabla de cotización (${valorTabla}) y el carrito (${carritoPrecio})`).toBeLessThanOrEqual(1);
            console.log(`✓ Precio tabla (${valorTabla}) = Precio carrito (${carritoPrecio})`);
        }
        const tablaComparacionPrecio = await this.cotizacionTabla.getValorCarrito(compania);

        if (valorTabla && carritoPrecio && tablaComparacionPrecio) {
            const parseValor = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
            const numTabla = parseValor(valorTabla);
            const numCarrito = parseValor(carritoPrecio);
            const numComparacion = parseValor(tablaComparacionPrecio);
            await expect(Math.abs(numTabla - numCarrito), `No son iguales los valores de la tabla de cotización (${valorTabla}) y el carrito (${carritoPrecio})`).toBeLessThanOrEqual(1);
            await expect(Math.abs(numTabla - numComparacion), `No son iguales los valores de la tabla de cotización (${valorTabla}) y la tabla de comparación (${tablaComparacionPrecio})`).toBeLessThanOrEqual(1);
            await expect(Math.abs(numCarrito - numComparacion), `No son iguales los valores del carrito (${carritoPrecio}) y la tabla de comparación (${tablaComparacionPrecio})`).toBeLessThanOrEqual(1);
            console.log(`✓ Precio tabla (${valorTabla}) = Precio carrito (${carritoPrecio}) = Precio tabla de comparación (${tablaComparacionPrecio})`);
        }
        await this.cotizacionTabla.btnAtrasCompararBtn.click();
        this.valorSumaAsegurada = await this.cotizacionTabla.getValorSumaAsegurada();
        console.log(`Valor suma asegurada: ${this.valorSumaAsegurada}`);
    }

    // pages/emisionAutoPage.ts -> dentro de la clase EmisionAutoPage

    async emitirFormaPago(datosDelTest: any) {
        const nroCBU = "0113941911100007976873";
        const nroTarjeta = "4509953566233704";
        const vencimientoMes = "11";
        const vencimientoAnio = "27";

        // --- Determina qué método de pago FINAL se usará ---
        // Si hubo selección secundaria, ese es el método final.
        // Si no (ej: Efectivo, o si CBU/Tarjeta fueran opciones primarias directas),
        // el método final es el primario.
        const metodoPagoFinal = datosDelTest.formaPagoDetalle || datosDelTest.formaPago;

        // --- PASO 0: Fecha vigencia (Triunfo la muestra en esta pantalla, no en cotización) ---
        if (datosDelTest.triunfo) {
            const fechaVigencia = this.cotizacionTabla.setFechaVigencia();
            //await this.emisionFormaPago.inicioVigencia.fill(fechaVigencia);
            //await this.emisionFormaPago.inicioVigencia.press('Tab');
            //console.log(`Fecha vigencia Triunfo: ${fechaVigencia}`);
        }

        // --- PASO 1: Seleccionar la opción en el dropdown de ESTA pantalla ---
        // Asegúrate que el dropdown exista en esta pantalla (podría no aparecer si el primario fue "Efectivo")
        if (await this.emisionFormaPago.formaPagoSelect.isVisible()) {
            // Verificar si el campo está bloqueado/deshabilitado
            const isDisabled = await this.emisionFormaPago.formaPagoSelect.isDisabled().catch(() => false);
            
            if (!isDisabled) {
                if (datosDelTest.triunfo || datosDelTest.rivadavia) {
                    if (datosDelTest.formaPago !== "Efectivo") {
                        await this.emisionFormaPago.selectPaymentOption(metodoPagoFinal);
                    }
                } else {
                    await this.emisionFormaPago.selectPaymentOption(metodoPagoFinal);
                }

                console.log(`Intentando seleccionar en dropdown de emisión: ${metodoPagoFinal}`);
                console.log(`Seleccionada forma de pago final: ${metodoPagoFinal}`);
            } else {
                console.log(`Campo de forma de pago está bloqueado/deshabilitado. No se realizará selección.`);
            }
        } else {
            console.log(`Dropdown de forma de pago no visible para ${datosDelTest.formaPago}. Asumiendo que no se requiere selección adicional.`);
        }


        // --- PASO 2: Rellenar campos asociados al método FINAL ---
        if (metodoPagoFinal === "Tarjeta de crédito" || metodoPagoFinal === "Tarjeta de débito") {
            console.log("Rellenando datos de Tarjeta de Crédito...");
            await this.emisionFormaPago.marcaTarjeta.click();
            await this.page.getByRole('option', { name: 'Visa', exact: true }).click(); // Asume Visa
            await this.emisionFormaPago.nroTarjeta.fill(nroTarjeta);
            console.log("datosDelTest.rivadavia", datosDelTest.rivadavia);
            console.log("datosDelTest.zurich", datosDelTest.zurich);
            console.log("datosDelTest.rus", datosDelTest.rus);
            if (!(datosDelTest.rivadavia || datosDelTest.zurich || datosDelTest.rus)) {
                await this.emisionFormaPago.vencimientoTarjetaMes.fill(vencimientoMes);
                await this.emisionFormaPago.vencimientoTarjetaAnio.fill(vencimientoAnio);
            }
        } else if (metodoPagoFinal === "Débito por CBU") {
            console.log("Rellenando CBU...");
            await this.emisionFormaPago.CBU.fill(nroCBU);
            console.log("CBU rellenado exitosamente.");
        } else if (metodoPagoFinal === "Efectivo") {
            console.log("Forma de pago Efectivo seleccionada, sin campos adicionales.");
        }
        // Añade 'else if' para otras formas de pago finales si existen

        // --- PASO 3: Avanzar ---
        console.log("Haciendo click en botón Siguiente...");
        await this.buttons.siguienteBtn.click();
        console.log("Click en botón Siguiente completado.");
    }

    async emitirCliente(datosDelTest: any) {
        await this.emisionCliente.nosisInput.fill(datosDelTest.cuitDni)
        await this.emisionCliente.buscarBtn.click();
        if (datosDelTest.cuitDni === "27381618426") {
            await this.emisionCliente.fechaNacimientoInput.fill("010100");
            await this.emisionCliente.telefonoInput.fill("3512334798");
            //await this.emisionCliente.situacionImpositivaInput.click();
            //await this.buttons.getOptionLocator(datosDelTest.sitImpositiva).click();
        }
        if (datosDelTest.cuitDni === "30711392404") {
            await this.emisionCliente.localidadInput.click();
            await this.buttons.getOptionLocator(datosDelTest.localidad).click()
        }

        if (datosDelTest.cuitDni === "23343180489" || datosDelTest.cuitDni === "30615714158") {
            await this.emisionCliente.telefonoInput.fill(datosDelTest.telefono);
            await this.emisionCliente.emailInput.fill(datosDelTest.mail);
        }

        // Esperar a que el campo sea visible antes de verificar que no esté vacío
        await expect(this.emisionCliente.localidadInput).toBeVisible({ timeout: 180000 });
        await expect(this.emisionCliente.localidadInput).not.toBeEmpty();
        await this.buttons.siguienteBtn.click();
    }

    async emitirDetalleAuto(auto: any) {
        const patente = this.emisionDetalleAuto.generarPatenteAleatoriaAuto();
        const nroMotor = this.emisionDetalleAuto.generarNroMotorAleatorio();
        const nroChasis = this.emisionDetalleAuto.generarNroChasisAleatorio();
        const fechaVencimiento = "30122026";

        await expect(this.page.getByText("Datos del vehículo")).toBeVisible({ timeout: 180000 });
        await expect(this.emisionDetalleAuto.patenteInput).toBeVisible({ timeout: 180000 }); // Espera hasta 180s si es necesario
        await this.emisionDetalleAuto.patenteInput.fill(patente);
        await this.emisionDetalleAuto.nroMotorInput.fill(nroMotor);
        await this.emisionDetalleAuto.nroChasisInput.fill(nroChasis);
        if (auto.gnc) {
            await this.emisionDetalleAuto.descripcionGncInput.fill("GNCIP");
            if (auto.rivadavia) {
                await this.emisionDetalleAuto.fechaVencimiento.fill(fechaVencimiento);
            }
            await this.emisionDetalleAuto.marcaReguladorInput.fill("ACME");
            await this.emisionDetalleAuto.nroReguladorInput.fill("123456");
            await this.emisionDetalleAuto.nuevoCilindroBtn.click();
            for (let i = 0; i < 2; i++) {
                const marcaCilindro = this.emisionDetalleAuto.generarMarcaCilindroAleatorio();
                const numeroCilindro = this.emisionDetalleAuto.generarNroCilindroAleatorio();
                await this.emisionDetalleAuto.getMarcaCilindroLocator(i.toString()).fill(marcaCilindro);
                await this.emisionDetalleAuto.getNumeroCilindroLocator(i.toString()).fill(numeroCilindro);
            }
        }
        await this.buttons.siguienteBtn.click();
    }

    async emitirInspeccion(datosDelTest?: any) {
        const filepath = path.join(__dirname, '..', 'fixtures', 'auto.jpeg');

        if (datosDelTest?.mercantil_andina && !datosDelTest?.ceroKm) {
            if (await this.emisionInspeccion.msgNoNecesitoInspeccion.isVisible()) {
                await this.buttons.siguienteBtn.click();
                return;
            }

            // POL-2892: modal bloqueante → abrir inspección externa → confirmar en Polko.
            await expect(this.emisionInspeccion.btnIrAInspeccion).toBeVisible({ timeout: 60000 });
            const [popup] = await Promise.all([
                this.page.waitForEvent('popup'),
                this.emisionInspeccion.btnIrAInspeccion.click(),
            ]);
            await popup.waitForLoadState('domcontentloaded');

            const inspeccionMercantilAndina = new EmisionInspeccionMercantilAndina(popup);
            await inspeccionMercantilAndina.completarInspeccionDigital(filepath, datosDelTest?.gnc ?? false);
            await popup.close();

            await this.page.bringToFront();
            await expect(this.emisionInspeccion.tituloReencuentro).toBeVisible({ timeout: 30000 });
            await this.emisionInspeccion.btnSiYaComplete.click();
            await expect(this.emisionInspeccion.msgInspeccionConfirmada).toBeVisible({ timeout: 15000 });
            await this.buttons.siguienteBtn.click();
        } else {
            // Inspección estándar (dropzone)
            await this.emisionInspeccion.inspecciondpzone.setInputFiles(filepath);
            await expect(this.emisionInspeccion.imgInspeccion).toBeVisible();
            await this.emisionInspeccion.etiquetaImg.click();
            await this.emisionInspeccion.etiquetaOption.click();
            await expect(this.buttons.siguienteBtn).toBeEnabled();
            await this.buttons.siguienteBtn.click();
        }
    }

    async emitirFinal(compania: string, valorTabla: string | null) {

        const valorFinal = await this.emisionFinal.getValorCoberturaFinal();
        const parseValorMoneda = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
        const numTabla = valorTabla !== null ? parseValorMoneda(valorTabla) : 0;
        const numFinal = parseValorMoneda(valorFinal);
        //await expect(Math.abs(numTabla - numFinal)).toBeLessThanOrEqual(1);
        await expect(this.buttons.emitirBtn).toBeEnabled({ timeout: 180000 });
        await this.buttons.emitirBtn.click();
        await expect(this.emisionFinal.emisionExitosaText.or(this.emisionFinal.errorEmision)).toBeVisible({ timeout: 360000 });
        const errorVisible = await this.emisionFinal.errorEmision.isVisible();
        if (errorVisible) {
            throw new Error("Hubo un problema al emitir la póliza.");
        }
    };




}