import { expect, type Locator, type Page, type Response } from "@playwright/test";
import CotizarAsistenciaViajero from "../components/asistenciaViajero/cotizarAsistenciaViajero";
import EmisionAsistenciaViajero from "../components/asistenciaViajero/emisionAsistenciaViajero";
import ResultadoEmisionAsistenciaViajero from "../components/asistenciaViajero/resultadoEmisionAsistenciaViajero";
import QuotationSidebar from "../components/quotationSidebar";
import type {
    ClienteAsistencia,
    CONTACTO_EMERGENCIA,
    DestinoAsistencia,
} from "../data/asistenciaViajeroEmision";
import { parseMontoArs } from "../helpers/pdfPoliza";
import {
    formatFechaAr,
    labelDiaCalendario,
    labelMesCalendario,
    type FechasViaje,
} from "../helpers/edadViajero";
import { escapeRegExp, isCompactViewport } from "../helpers/viewport";

export const COTIZAR_ASISTENCIA_PATH = "/u/cotizar/asistencia_viajero";
const COTIZACION_SSE_PATH = "/cotizacion/asistencia-viajero/sse";
const EMISION_PATH = "/newemitir/asistencia-viajero";
const TIMEOUT_COTIZACION = 180000;
const TIMEOUT_EMISION = 300000;
const MAX_MESES_CALENDARIO = 24;

export interface PlanAsistencia {
    nombre: string;
    /** Total en pesos de la tarjeta. */
    precio: number;
    /** Referencia en dólares de la tarjeta; null si el plan no la trae (Universal). */
    usd: number | null;
    /** Id de producto (TerraWind) o `code` de Snuggle, del `#emitirButton_<codigo>`. */
    codigo: string;
}

/** Fila del panel "Formas de pago" de la tarjeta del plan. */
export interface FormaDePagoCotizada {
    /** "Transferencia", "9 cuotas sin interés", "Tarjeta en un pago"… (sin el chip "Mejor precio"). */
    titulo: string;
    /** null cuando el panel dice "Ver al pagar". */
    precio: number | null;
    usd: number | null;
}

export interface PasajeroCargado {
    fechaNacimiento: string;
    documento: string;
    fila: string;
}

function isPost(path: string) {
    return (response: Response): boolean =>
        response.request().method() === "POST" && new URL(response.url()).pathname.endsWith(path);
}

/**
 * Cotizador y emisión de Asistencia al viajero rediseñados (TerraWind + agregador Snuggle). Arranca en
 * `/u/cotizar/asistencia_viajero`; el listado separa cada compañía en el sidebar "Asistencias".
 */
export default class CotizarAsistenciaViajeroPage {
    readonly page: Page;
    readonly cotizacion: CotizarAsistenciaViajero;
    readonly emision: EmisionAsistenciaViajero;
    readonly resultado: ResultadoEmisionAsistenciaViajero;
    readonly sidebar: QuotationSidebar;

    constructor(page: Page) {
        this.page = page;
        this.cotizacion = new CotizarAsistenciaViajero(page);
        this.emision = new EmisionAsistenciaViajero(page);
        this.resultado = new ResultadoEmisionAsistenciaViajero(page);
        this.sidebar = new QuotationSidebar(page);
    }

    async goto(): Promise<void> {
        await this.page.goto(COTIZAR_ASISTENCIA_PATH, { waitUntil: "domcontentloaded", timeout: 120000 });
        await expect(this.cotizacion.datosViajeHeading).toBeVisible({ timeout: 60000 });
        await expect(this.cotizacion.paisDestinoSearchbox).toBeVisible({ timeout: 60000 });
    }

    async seleccionarDestino(destino: DestinoAsistencia): Promise<void> {
        if (!destino.busqueda || !destino.opcion) {
            await this.cotizacion.multiplesDestinosCheckbox.check({ force: true });
            await expect(this.cotizacion.multiplesDestinosCheckbox).toBeChecked();
            return;
        }
        await this.cotizacion.paisDestinoSearchbox.click();
        await this.cotizacion.paisDestinoSearchbox.fill(destino.busqueda);
        const opcion = this.cotizacion.opcionDestino(destino.opcion);
        await expect(opcion).toBeVisible({ timeout: 15000 });
        await opcion.click();
        await expect(this.cotizacion.paisDestinoSearchbox).toHaveValue(destino.opcion);
    }

    /** Elige salida y regreso en el DatePickerInput navegando mes a mes hasta cada fecha. */
    async seleccionarFechas(fechas: FechasViaje): Promise<void> {
        await this.clickSeguro(this.cotizacion.fechasControl);
        await expect(this.cotizacion.calendario).toBeVisible({ timeout: 10000 });
        for (const fecha of [fechas.salida, fechas.regreso]) {
            const mes = new RegExp(`^${escapeRegExp(labelMesCalendario(fecha))}$`, "i");
            for (let i = 0; !mes.test((await this.cotizacion.calendarioMes.innerText()).trim()); i++) {
                expect(i, `El calendario no llegó a ${labelMesCalendario(fecha)}`).toBeLessThan(MAX_MESES_CALENDARIO);
                await this.clickSeguro(this.cotizacion.calendarioSiguienteMes);
            }
            await this.clickSeguro(this.cotizacion.diaCalendario(labelDiaCalendario(fecha)));
        }
        await expect(this.cotizacion.fechasControl).toHaveText(
            `${formatFechaAr(fechas.salida)} – ${formatFechaAr(fechas.regreso)}`,
        );
        await expect(this.cotizacion.diasCobertura).toHaveText(`${fechas.dias} días de cobertura`);
    }

    async cargarEdades(edades: readonly number[]): Promise<void> {
        for (const [index, edad] of edades.entries()) {
            if (index > 0) await this.cotizacion.agregarPasajeroBtn.click();
            await this.cotizacion.edadPasajeroInput(index).fill(String(edad));
        }
        for (const [index, edad] of edades.entries()) {
            await expect(this.cotizacion.edadPasajeroInput(index)).toHaveValue(String(edad));
        }
    }

    /** "Cotizar" y espera el listado. Devuelve el payload del SSE de cotización (edades enviadas). */
    async cotizar(): Promise<any> {
        const ssePromise = this.page.waitForResponse(isPost(COTIZACION_SSE_PATH), { timeout: 90000 });
        await this.cotizacion.cotizarBtn.click();
        const sse = await ssePromise;
        expect(sse.ok(), `POST ${COTIZACION_SSE_PATH} respondió ${sse.status()}`).toBe(true);
        await expect(this.cotizacion.resultadoHeading).toBeVisible({ timeout: 60000 });
        return sse.request().postDataJSON();
    }

    private tile(tile: string): Locator {
        if (this.sidebar.isCompact()) {
            return this.page
                .locator("button.MobileCompanyList__item")
                .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(tile)}`) });
        }
        return this.cotizacion.companiaTile(tile);
    }

    /** Espera el resultado de la compañía (tilde verde o error) y devuelve si cotizó. */
    async esperarCompania(tile: string): Promise<boolean> {
        if (this.sidebar.isCompact()) await this.sidebar.abrirCompaniasMobile();
        const exito = this.tile(tile).locator(".QuotationSidebar__statusBadge--success");
        const error = this.tile(tile).locator(".QuotationSidebar__statusBadge--error");
        await expect(exito.or(error), `${tile} no terminó de cotizar`).toBeVisible({ timeout: TIMEOUT_COTIZACION });
        const cotizo = await exito.isVisible();
        if (this.sidebar.isCompact()) await this.sidebar.cerrarDrawerMobile();
        return cotizo;
    }

    /** Sin planes no hay header de compañía: solo el aviso "<compañía> no tiene planes para este viaje". */
    async seleccionarCompania(tile: string, label: string): Promise<void> {
        if (this.sidebar.isCompact()) await this.sidebar.abrirCompaniasMobile();
        await this.tile(tile).click();
        if (this.sidebar.isCompact()) {
            await expect(this.sidebar.companyTileActive).toContainText(tile, { timeout: 30000 });
        } else {
            await expect(this.tile(tile)).toHaveClass(/is-active/, { timeout: 30000 });
        }
        await expect(
            this.cotizacion.companiaSeleccionadaHeader.filter({ hasText: label }).or(this.cotizacion.companiaSinPlanes).first(),
        ).toBeVisible({ timeout: 30000 });
    }

    /** Listado de la compañía seleccionada: con planes, sin planes para el viaje, o error/timeout del proveedor. */
    async estadoCompania(): Promise<"con-planes" | "sin-planes" | "error"> {
        const { planes, companiaSinPlanes, companiaSinCotizacion } = this.cotizacion;
        await expect(planes.first().or(companiaSinPlanes).or(companiaSinCotizacion).first()).toBeVisible({ timeout: 30000 });
        if ((await planes.count()) > 0) return "con-planes";
        return (await companiaSinPlanes.isVisible()) ? "sin-planes" : "error";
    }

    /** Como `estadoCompania`, pero ante un error del proveedor (timeout del sandbox) recotiza una vez. */
    async estadoCompaniaConReintento(): Promise<"con-planes" | "sin-planes" | "error"> {
        const estado = await this.estadoCompania();
        if (estado !== "error" || !(await this.cotizacion.recotizarBtn.isVisible())) return estado;
        const ssePromise = this.page.waitForResponse(isPost(COTIZACION_SSE_PATH), { timeout: 90000 });
        await this.cotizacion.recotizarBtn.click();
        expect((await ssePromise).ok(), "Recotizar no respondió OK").toBe(true);
        await expect(this.cotizacion.planes.first().or(this.cotizacion.companiaSinPlanes).first())
            .toBeVisible({ timeout: TIMEOUT_COTIZACION })
            .catch(() => undefined);
        return this.estadoCompania();
    }

    async leerPlan(plan: Locator): Promise<PlanAsistencia> {
        const nombre = (await this.cotizacion.planNombre(plan).innerText()).trim();
        const precio = parseMontoArs((await this.cotizacion.planPrecio(plan).innerText()).trim());
        const usdLocator = this.cotizacion.planPrecioUsd(plan);
        const usd = (await usdLocator.count()) > 0 ? parseMontoArs(await usdLocator.innerText()) : null;
        const id = (await this.cotizacion.planEmitirBtn(plan).getAttribute("id")) ?? "";
        return { nombre, precio, usd, codigo: id.replace(/^emitirButton_/, "") };
    }

    /**
     * Abre "Ver las N formas de pago" del plan, lee cada forma (tienen que ser N) y lo cierra. Devuelve null si
     * la tarjeta no tiene el desplegable.
     */
    async leerFormasDePago(plan: PlanAsistencia): Promise<FormaDePagoCotizada[] | null> {
        const { cotizacion } = this;
        const toggle = cotizacion.planFormasPagoToggle(this.planPorCodigo(plan.codigo));
        if (!(await toggle.isVisible())) return null;
        const etiqueta = (await toggle.innerText()).trim();
        const cantidad = Number(etiqueta.match(/\d+/)?.[0]);

        await this.clickSeguro(toggle);
        await expect(cotizacion.formasPagoPanel).toBeVisible({ timeout: 10000 });
        await expect(cotizacion.formasPagoPanel).toContainText(plan.nombre);
        await expect(cotizacion.formasPagoItems, `"${etiqueta}" no lista ${cantidad} formas`).toHaveCount(cantidad);

        const formas: FormaDePagoCotizada[] = [];
        for (const item of await cotizacion.formasPagoItems.all()) {
            const titulo = (await cotizacion.formaPagoTitulo(item).innerText()).replace(/\s*Mejor precio\s*$/, "").trim();
            const precio = (await cotizacion.formaPagoPrecio(item).innerText()).trim();
            const secundario = cotizacion.formaPagoSecundario(item);
            const usd = (await secundario.count()) > 0 ? (await secundario.innerText()).trim() : "";
            formas.push({
                titulo,
                precio: /\d/.test(precio) ? parseMontoArs(precio) : null,
                usd: /^USD/.test(usd) ? parseMontoArs(usd) : null,
            });
        }

        await this.clickSeguro(cotizacion.formasPagoCerrarBtn);
        await expect(cotizacion.formasPagoPanel).toBeHidden();
        return formas;
    }

    /** Planes de la compañía seleccionada, en el orden del listado (Polko los ordena por total). */
    async leerPlanes(): Promise<PlanAsistencia[]> {
        const planes: PlanAsistencia[] = [];
        for (const plan of await this.cotizacion.planes.all()) planes.push(await this.leerPlan(plan));
        return planes;
    }

    planPorCodigo(codigo: string): Locator {
        return this.cotizacion.planes.filter({ has: this.page.locator(`[id="emitirButton_${codigo}"]`) });
    }

    async emitirPlan(codigo: string): Promise<void> {
        await this.clickSeguro(this.cotizacion.planEmitirBtn(this.planPorCodigo(codigo)));
        await expect(this.emision.emisionHeading.or(this.emision.pasajerosHeading).first()).toBeVisible({
            timeout: 60000,
        });
    }

    /** Precio en pesos de cada opción del select de Snuggle, por medio: `{ Tarjeta: 78045, Transferencia: 62436 }`. */
    async leerOpcionesFormaPagoSnuggle(): Promise<Record<string, number>> {
        await expect(this.emision.formaPagoSnuggleSelect).toBeVisible({ timeout: 60000 });
        await this.emision.formaPagoSnuggleSelect.click();
        const opciones = this.page.getByRole("option");
        await expect(opciones.first()).toBeVisible({ timeout: 10000 });
        const textos = await opciones.allInnerTexts();
        await this.page.keyboard.press("Escape");
        await expect(opciones.first()).toBeHidden();
        return Object.fromEntries(
            textos.map((texto) => {
                const [medio, precio = ""] = texto.split(" · ");
                return [medio.trim(), parseMontoArs(precio)];
            }),
        );
    }

    async elegirFormaPagoSnuggle(medio: string): Promise<void> {
        await this.emision.formaPagoSnuggleSelect.click();
        await this.emision.formaPagoSnuggleOpcion(medio).click();
        await expect(this.emision.formaPagoSnuggleSelect).toHaveValue(new RegExp(`^${escapeRegExp(medio)} · `));
    }

    async totalTarjetaLateral(): Promise<number> {
        return parseMontoArs((await this.emision.sidebarTotalPesos.innerText()).trim());
    }

    async siguienteAPasajeros(): Promise<void> {
        await this.emision.siguienteBtn.click();
        await expect(this.emision.pasajerosHeading).toBeVisible({ timeout: 60000 });
    }

    async elegirFormaPago(medio: string): Promise<void> {
        await expect(this.emision.formaPagoHeading).toBeVisible({ timeout: 60000 });
        await this.emision.formaPagoRadio(medio).check({ force: true });
        await expect(this.emision.formaPagoRadio(medio)).toBeChecked();
        await this.emision.siguienteBtn.click();
        await expect(this.emision.pasajerosHeading).toBeVisible({ timeout: 60000 });
    }

    /**
     * Busca al cliente por CUIT en el pasajero `index` y completa lo que el padrón no trae (género, email,
     * celular, localidad, domicilio). Devuelve lo que quedó cargado para validarlo contra la cotización.
     */
    async completarPasajero(index: number, cliente: ClienteAsistencia): Promise<PasajeroCargado> {
        const { emision } = this;
        await expect(emision.pasajerosHeading).toBeVisible({ timeout: 60000 });
        if (index > 0) await emision.editarPasajeroBtn(index).click();
        if (!(await emision.buscarClienteInput.isVisible())) await emision.buscarPasajeroBtn.click();

        await emision.sexoRadio(cliente.genero).check({ force: true });
        await emision.buscarClienteInput.fill(cliente.cuit);
        await emision.buscarClienteBtn.click();
        await expect(emision.campoPasajero(index, "nombre")).not.toHaveValue("", { timeout: 60000 });

        await emision.generoSelect.click();
        await emision.opcion(cliente.genero).click();
        await expect(emision.generoSelect).toHaveValue(cliente.genero);

        await this.completarSiVacio(emision.campoPasajero(index, "email"), cliente.email);
        await this.completarSiVacio(emision.campoPasajero(index, "telefono"), cliente.telefono);
        await this.completarSiVacio(emision.campoPasajero(index, "calle"), "Calle Falsa");
        await this.completarSiVacio(emision.campoPasajero(index, "numero"), "123");
        if (!(await emision.localidadSelect.inputValue()).trim()) {
            await expect(async () => {
                await emision.localidadSelect.click();
                await this.page.getByRole("option").first().click({ timeout: 10000 });
                await expect(emision.localidadSelect).not.toHaveValue("", { timeout: 5000 });
            }).toPass({ timeout: 60000 });
        }

        return {
            fechaNacimiento: await emision.fechaNacimientoInput.inputValue(),
            documento: await emision.campoPasajero(index, "numeroDocumento").inputValue(),
            fila: (await emision.filaPasajero(index).innerText()).trim(),
        };
    }

    async completarContactoEmergencia(contacto: typeof CONTACTO_EMERGENCIA): Promise<void> {
        await this.emision.emergenciaNombreInput.fill(contacto.nombre);
        await this.emision.emergenciaApellidoInput.fill(contacto.apellido);
        await this.emision.emergenciaCelularInput.fill(contacto.telefono);
    }

    /** "Siguiente" desde pasajeros: falla con el mensaje de edad si la validación lo frena. */
    async irAlResumen(): Promise<void> {
        await this.emision.siguienteBtn.click();
        await expect(this.emision.resumenHeading.or(this.emision.erroresEdad).first()).toBeVisible({ timeout: 60000 });
        const errores = await this.emision.erroresEdad.allInnerTexts();
        expect(errores, "La validación de edades frenó el paso de pasajeros").toEqual([]);
        await expect(this.emision.emitirBtn).toBeVisible();
    }

    async totalResumen(): Promise<number> {
        return parseMontoArs((await this.emision.footerTotalPesos.innerText()).trim());
    }

    /** "Emitir" / "Generar link de pago": devuelve el POST de emisión y espera el desenlace en pantalla. */
    async emitir(): Promise<Response> {
        const emisionPromise = this.page.waitForResponse(isPost(EMISION_PATH), { timeout: TIMEOUT_EMISION });
        await this.emision.emitirBtn.click();
        const response = await emisionPromise;
        await expect(this.resultado.cualquierDesenlace.first()).toBeVisible({ timeout: 60000 });
        return response;
    }

    private async completarSiVacio(campo: Locator, valor: string): Promise<void> {
        if (!(await campo.isVisible())) return;
        if ((await campo.inputValue()).trim()) return;
        await campo.fill(valor);
    }

    /** En compacto el calendario y el carrusel de planes dejan el target bajo el header sticky. */
    private async clickSeguro(target: Locator): Promise<void> {
        if (isCompactViewport(this.page)) {
            await target.dispatchEvent("click");
            return;
        }
        await target.click();
    }
}
