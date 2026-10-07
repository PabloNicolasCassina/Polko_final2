import { Locator, Page, expect } from "@playwright/test";
import CommonButtons from "../components/commonButtons";
import CotizacionCobertura from "../components/ap/cotizacionCobertura";
import CotizacionInformacion from "../components/ap/cotizacionInformacion";
import CotizacionTitular from "../components/ap/cotizacionTitular";
import CotizacionTablaAp from "../components/ap/cotizacionTabla";
import EmisionCliente from "../components/emisionCliente";
import Companias from "../components/companias";
import EmisionFormaPago from "../components/emisionFormaPago";
import EmisionFinal from "../components/emisionFinal";

export default class EmisionApPage {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly cotizacionCobertura: CotizacionCobertura;
    readonly cotizacionInformacion: CotizacionInformacion;
    readonly cotizacionTitular: CotizacionTitular;
    readonly cotizacionTabla: CotizacionTablaAp;
    readonly emisionCliente: EmisionCliente;
    readonly companias: Companias;
    readonly emisionFormaPago: EmisionFormaPago;
    readonly emisionFinal: EmisionFinal;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.cotizacionCobertura = new CotizacionCobertura(page);
        this.cotizacionInformacion = new CotizacionInformacion(page);
        this.cotizacionTitular = new CotizacionTitular(page);
        this.cotizacionTabla = new CotizacionTablaAp(page);
        this.emisionCliente = new EmisionCliente(page);
        this.companias = new Companias(page);
        this.emisionFormaPago = new EmisionFormaPago(page);
        this.emisionFinal = new EmisionFinal(page);
    }

    /**
     * Selecciona el tipo de cobertura
     * @param tipo - "Por día" o "+30 días"
     */
    async seleccionarCobertura(tipo: "Por día" | "+30 días") {
        if (tipo === "Por día") {
            await this.cotizacionCobertura.seleccionarPorDia();
        } else {
            await this.cotizacionCobertura.seleccionarMasTreintaDias();
        }
        await this.buttons.siguienteBtn.click();
    }

    /**
     * Completa la información de la actividad
     * @param datos - { actividad, clasificacion, tarea }
     */
    private getFinVigenciaLabel(): string {
        const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const fechaFutura = new Date();
        fechaFutura.setDate(fechaFutura.getDate() + 5);
        return `${fechaFutura.getDate()} ${meses[fechaFutura.getMonth()]} ${fechaFutura.getFullYear()}`;
    }

    async completarInformacion(datos: { actividad: string; clasificacion: string; tarea: string, cantPersonas: string, vigencia: string }) {

        // Seleccionar cantidad de personas
        await this.cotizacionInformacion.cantPersonasInput.fill(datos.cantPersonas);
        // Seleccionar actividad
        await this.cotizacionInformacion.actividadCombobox.click();
        await this.cotizacionInformacion.getActividadOption(datos.actividad).click();

        // Seleccionar clasificación
        await this.cotizacionInformacion.clasificacionCombobox.click();
        await this.cotizacionInformacion.getClasificacionOption(datos.clasificacion).click();

        // Seleccionar tarea
        await this.cotizacionInformacion.tareaCombobox.click();
        await this.cotizacionInformacion.getTareaOption(datos.tarea).click();

        // Completar fin de vigencia
        if (datos.vigencia === "Por día") {
        await this.cotizacionInformacion.finVigenciaInput.click();
        await this.page.getByRole('button', { name: this.getFinVigenciaLabel(), exact: true }).click();
        }
    }

    /**
     * Completa los datos del titular
     * @param codigoPostal - Código postal del titular
     */
    async completarTitular(codigoPostal: string, situacionImpositiva: string) {
        await this.cotizacionTitular.ingresarCodigoPostal(codigoPostal);
        await expect(this.cotizacionTitular.localidadCombobox).not.toBeEmpty({ timeout: 15000 });
        await this.cotizacionTitular.situacionImpositivaCombobox.click();
        await this.cotizacionTitular.getSituacionImpositivaOption(situacionImpositiva).click();
    }

    /**
     * Cotiza y selecciona un plan
     * @param plan - "Básico" | "Sugerido" | "Avanzado"
     */
    async cotizarYSeleccionarPlan(plan: "Básico" | "Sugerido" | "Avanzado" | "Personalizado" = "Sugerido", datos?: any, descuento: string = "30") {
        // Hacer clic en COTIZAR
        await this.buttons.cotizarBtn.click();

        // Esperar a que se cargue la tabla de cotización
        await expect(this.cotizacionTabla.configAvanzadaBtn.or(this.emisionFinal.errorEmision)).toBeVisible({ timeout: 180000 });

        // Verificar si hay error
        const errorVisible = await this.emisionFinal.errorEmision.isVisible();
        if (errorVisible) {
            throw new Error("Hubo un problema al cotizar la póliza.");
        }

        if (descuento === "30") {
            await this.cotizacionTabla.aplicarDescuento30Porciento();
            await this.buttons.aplicarCambiosBtn.click();
            await expect(this.buttons.loadingSpinner).toBeHidden({ timeout: 180000 });
        }
        await this.cotizacionTabla.tipoFacturacion.click();
        await this.cotizacionTabla.getOptionLocator(datos.tipoFacturacion).click();
        if (await this.buttons.aplicarCambiosBtn.isVisible()) {
            await this.buttons.aplicarCambiosBtn.click();
            await expect(this.buttons.loadingSpinner).toBeHidden({ timeout: 180000 });
        }

        // Seleccionar el plan
        switch (plan) {
            case "Básico":
                await this.cotizacionTabla.emitirPlanBasico();
                break;
            case "Sugerido":
                await this.cotizacionTabla.emitirPlanSugerido();
                break;
            case "Avanzado":
                await this.cotizacionTabla.emitirPlanAvanzado();
                break;
            case "Personalizado":
                await this.cotizacionTabla.abrirConfigAvanzada();
                await this.cotizacionTabla.rangoEdad.click();
                await this.cotizacionTabla.getOptionLocator(datos.rangoEdad).click();
                await this.cotizacionTabla.mei.click();
                await this.cotizacionTabla.getOptionLocator(datos.mei).click();
                await this.cotizacionTabla.asMe.click();
                await this.cotizacionTabla.getOptionLocator(datos.asMe).click();
                //await expect(this.cotizacionTabla.rentaDiaria).toBeVisible();
                //await expect(this.cotizacionTabla.rentaDiaria).toBeDisabled();
           
                //await this.cotizacionTabla.rentaDiaria.click();
                //await this.cotizacionTabla.getOptionLocator(datos.rentaDiaria).click();
                await this.cotizacionTabla.deducible.click();
                await this.cotizacionTabla.getOptionLocator(datos.deducible).click();
                await this.cotizacionTabla.subsidioFallecimiento.click();
                await this.cotizacionTabla.getOptionLocator(datos.subsidioFallecimiento).click();
                await this.buttons.aplicarCambiosBtn.click();
                await expect(this.cotizacionTabla.planPersonalizadoEmitirBtn).toBeVisible({ timeout: 180000 });
                await this.cotizacionTabla.planPersonalizadoEmitirBtn.click();
                break;
        }
    }

    /**
     * Completa la forma de pago
     * @param formaPago - Tipo de forma de pago
     * @param datos - Datos adicionales según la forma de pago
     */
    async completarFormaPago(formaPago: "Débito por CBU" | "Tarjeta de crédito" | "Efectivo", datos?: any) {
        // Seleccionar forma de pago
        await this.emisionFormaPago.selectPaymentOption(formaPago);

        // Completar datos según el tipo de pago
        if (formaPago === "Débito por CBU") {
            const cbu = datos?.cbu || "0113941911100007976873";
            await this.emisionFormaPago.fillCBU(cbu);
        } else if (formaPago === "Tarjeta de crédito") {
            await this.emisionFormaPago.fillTarjetaCredito(datos || {});
            await this.emisionFormaPago.vencimientoTarjetaMes.fill(datos?.vencimientoMes ?? "11");
            await this.emisionFormaPago.vencimientoTarjetaAnio.fill(datos?.vencimientoAnio ?? "27"); 
        }

        await this.buttons.siguienteBtn.click();
    }

    /**
     * Busca y completa los datos del cliente
     * @param cuitDni - CUIT o DNI del cliente
     * @param tipoPersona - Tipo de persona del cliente
     */
    async completarCliente(cuitDniTomador: string, cantPersonas: number = 1, cuitDniAsegurados?: string | string[], tipoPersona: string = "Física", clausulaNoRepeticion?: string, cuitDniBeneficiario?: string) {
        // Fila 1 - Tomador: buscar por CUIT/DNI y esperar localidad
        await this.emisionCliente.completarBtn.click();
        await this.emisionCliente.tipoPersonaCombobox.click();
        await this.emisionCliente.getTipoPersonaOption(tipoPersona).click();
        await this.emisionCliente.buscarClienteBtn.click();
        await this.emisionCliente.getEditarClienteBtn(1).click();
        await this.emisionCliente.nosisInput.fill(cuitDniTomador);
        await this.emisionCliente.buscarBtn.click();
        await expect(this.emisionCliente.localidadInput).toBeVisible({ timeout: 180000 });
        await expect(this.emisionCliente.localidadInput).not.toBeEmpty();
        await this.emisionCliente.getEditarClienteBtn(1).click();

        if (cuitDniBeneficiario) {
            await this.emisionCliente.getEditarClienteBtn(2).click();
            await this.emisionCliente.radioButtonOtro.click();
            await this.emisionCliente.buscarClienteBtn.click();
            await this.emisionCliente.buscarClienteBtn.click();
            await this.emisionCliente.nosisInput.fill(cuitDniBeneficiario);
            await this.emisionCliente.buscarBtn.click();
            await expect(this.emisionCliente.getCheckLlenadoCliente(2)).toBeVisible({ timeout: 180000 });
            await expect(this.emisionCliente.getWarningLlenadoCliente(2)).not.toBeVisible({ timeout: 180000 });
            await this.emisionCliente.getEditarClienteBtn(2).click();
        }

        // Agregar Asegurados adicionales (ya existe 1 por defecto)
        for (let i = 1; i < cantPersonas; i++) {
            await this.emisionCliente.nuevoClienteBtn.click();
        }

        // Fila 3+ - Asegurados: buscar por CUIT/DNI individual o compartido
        for (let i = 0; i < cantPersonas; i++) {
            const fila = 3 + i;
            const cuit = Array.isArray(cuitDniAsegurados)
                ? cuitDniAsegurados[i]
                : (cuitDniAsegurados ?? cuitDniTomador);
            await this.emisionCliente.getEditarClienteBtn(fila).click();
            await this.emisionCliente.nosisInput.fill(cuit);
            await this.emisionCliente.buscarBtn.click();
            await expect(this.emisionCliente.getCheckLlenadoCliente(fila)).toBeVisible({ timeout: 180000 });
            await expect(this.emisionCliente.getWarningLlenadoCliente(fila)).not.toBeVisible({ timeout: 180000 });
            await this.emisionCliente.getEditarClienteBtn(fila).click();
        }
        // Fila extra - Tercero con cláusula de no repetición (si aplica)
        if (clausulaNoRepeticion) {
            await this.emisionCliente.nuevoClienteBtn.click();
            const filaClausula = 3 + cantPersonas;
            const rolIndexClausula = 2 + cantPersonas;
            await this.emisionCliente.getSelectorRolCliente(rolIndexClausula).click();
            await this.page.getByRole('option', { name: 'Tercero c/claus. no repetición', exact: true }).click();
            await this.emisionCliente.getEditarClienteBtn(filaClausula).click();
            await this.emisionCliente.nosisInput.fill(clausulaNoRepeticion);
            await this.emisionCliente.buscarBtn.click();
            await expect(this.emisionCliente.getCheckLlenadoCliente(filaClausula)).toBeVisible({ timeout: 180000 });
            await expect(this.emisionCliente.getWarningLlenadoCliente(filaClausula)).not.toBeVisible({ timeout: 180000 });
            await this.emisionCliente.getEditarClienteBtn(filaClausula).click();
        }
        if (await this.emisionCliente.errorMatriz.isVisible()) {
            throw new Error("Error en la matriz de clientes.");
        }

        await expect(this.emisionCliente.cargaMatriz).toBeHidden({ timeout: 180000 });
        await this.buttons.siguienteBtn.click();
    }

    /**
     * Emite la póliza final
     */
    async emitirFinal() {
        await expect(this.buttons.emitirBtn).toBeEnabled({ timeout: 180000 });
        await this.buttons.emitirBtn.click();

        // Esperar resultado de la emisión
        await expect(this.emisionFinal.emisionExitosaText.or(this.emisionFinal.errorEmision)).toBeVisible({ timeout: 180000 });

        const errorVisible = await this.emisionFinal.errorEmision.isVisible();
        if (errorVisible) {
            throw new Error("Hubo un problema al emitir la póliza.");
        }

        await expect(this.emisionFinal.descargaBtn).toBeEnabled({ timeout: 180000 });
    }
}
