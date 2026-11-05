import { test, expect, type Download, type Page, type Response, type TestInfo } from "@playwright/test";
import CotizarAsistenciaViajeroPage, {
    type FormaDePagoCotizada,
    type PlanAsistencia,
} from "../pages/cotizarAsistenciaViajeroPage";
import MiCarteraPage from "../pages/miCarteraPage";
import { documentarCaso } from "./documentarCaso";
import { mockUserDataString } from "./mockUser";
import { extraerMontos, parseMontoArs } from "./pdfPoliza";
import { edadCliente, edadesACotizar, elegirFechasViaje, formatFechaAr, type FechasViaje } from "./edadViajero";
import { TIMEOUT_EXTRA_POLIZA_MI_CARTERA } from "./polizaMiCartera";
// import { descargarYValidarPdfCotizacion } from "./comparadorCotizacion";
import {
    COMPANIAS_ASISTENCIA,
    CONTACTO_EMERGENCIA,
    GRUPOS_PASAJEROS,
    PASARELAS_LINK_PAGO,
    type ClienteAsistencia,
    type CompaniaAsistencia,
    type DestinoAsistencia,
    type MedioPagoSnuggle,
    type MedioPagoTerraWind,
} from "../data/asistenciaViajeroEmision";

/**
 * Flujo de emisión de Asistencia al viajero compartido por `emisionAsistViajero.spec.ts` y
 * `emisionCompletoAsistViajero.spec.ts`: cotizar con las edades reales, emitir el plan más barato de la
 * compañía y cerrar según el circuito (vouchers de TerraWind o link de pago de Snuggle).
 */

const TOLERANCIA_PESOS = 1;
const MAX_INTENTOS_RANGO_OCUPADO = 5;
/** TerraWind rechaza un voucher del mismo pasajero en un rango que ya tiene uno (error 520). */
const ERROR_RANGO_OCUPADO = /voucher emitido en ese rango|ya tiene\s+un voucher|TERRAWIND_API_ERROR[\s\S]{0,80}520/i;
const EMISION_LABEL = "POST /newemitir/asistencia-viajero";
/** "Medios habilitados" del resumen de Snuggle: sale de `viewSettings.paymentMethods` de cada plan. */
const MEDIOS_HABILITADOS_SNUGGLE = /Link de pago|Transferencia bancaria|Checkout externo del proveedor/;
/** Errores que muestra el checkout cuando el link no sirve (ej. pre-checkout de Snuggle sin la cotización). */
const ERROR_CHECKOUT = /quote not found|cotizaci[oó]n no encontrada|link (de pago )?(vencido|expirado)|payment link expired/i;
const SNUGGLE_VOUCHER_PDF_PATH = /\/documentacion\/asistencia-viajero\/snuggle\/[^/]+\/voucher\/[^/]+$/;
const FORMA_TARJETA = /^Tarjeta en un pago/;
const FORMA_TRANSFERENCIA = /^Transferencia/;

export const PRECONDICIONES =
    "Usuario logueado (storageState del project), datos de usuario mockeados con TerraWind y los proveedores de " +
    "Snuggle habilitados, frontend en localhost:3000, general_api y microservice_products (:8082) con credenciales " +
    "de Snuggle sandbox y SNUGGLE_SUCCESS_CALLBACK_URL_PRE configurados.";

export interface CasoEmision {
    id: string;
    compania: CompaniaAsistencia;
    destino: DestinoAsistencia;
    dias: number;
    grupo: keyof typeof GRUPOS_PASAJEROS;
    medioPago?: MedioPagoTerraWind;
    /**
     * Snuggle: "Transferencia" contrata por transferencia el plan más barato que la acepta (si ninguno la acepta,
     * el test se saltea). Sin valor, el plan más barato con tarjeta (link de pago).
     */
    pagoSnuggle?: MedioPagoSnuggle;
    /** Días hacia adelante entre los que se sortea la salida (default de `elegirFechasViaje`). */
    ventanaSalidaDias?: number;
}

export async function applyUserMock(page: Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({ contentType: "application/json", body: mockUserDataString });
    });
}

async function adjuntarIntercambio(testInfo: TestInfo, nombre: string, response: Response): Promise<any> {
    const body = await response.json().catch(() => null);
    await testInfo.attach(`${nombre}-request.json`, {
        body: JSON.stringify(response.request().postDataJSON(), null, 2),
        contentType: "application/json",
    });
    await testInfo.attach(`${nombre}-response.json`, {
        body: JSON.stringify(body, null, 2),
        contentType: "application/json",
    });
    return body;
}

function expectPrecio(valor: number, cotizado: number, donde: string): void {
    expect(
        Math.abs(valor - cotizado),
        `${donde}: $${valor.toLocaleString("es-AR")} no coincide con el cotizado $${cotizado.toLocaleString("es-AR")}`,
    ).toBeLessThanOrEqual(TOLERANCIA_PESOS);
}

function formaDePago(formas: FormaDePagoCotizada[] | null, titulo: RegExp): FormaDePagoCotizada | undefined {
    return formas?.find((forma) => titulo.test(forma.titulo));
}

function pesos(monto: number): string {
    return `$${monto.toLocaleString("es-AR")}`;
}

function descripcionViaje(caso: CasoEmision): string {
    const grupo = GRUPOS_PASAJEROS[caso.grupo];
    return `${caso.destino.label} · ${caso.dias} días · ${grupo.label}${caso.medioPago ? ` · ${caso.medioPago}` : ""}`;
}

async function documentar(caso: CasoEmision, feature: string, story: string, descripcion: string): Promise<void> {
    const compania = COMPANIAS_ASISTENCIA[caso.compania];
    const pasajeros = GRUPOS_PASAJEROS[caso.grupo].pasajeros;
    await documentarCaso({
        epic: "Asistencia al viajero",
        feature,
        story,
        severidad: "critical",
        prioridad: "high",
        descripcion,
        precondiciones: PRECONDICIONES,
        parametros: {
            "ID caso": caso.id,
            Compañía: compania.label,
            Destino: caso.destino.label,
            Región: caso.destino.regionSnuggle,
            Días: String(caso.dias),
            Pasajeros: pasajeros.map((p) => `${p.nombre} ${p.apellido} (${p.cuit}, ${p.rango})`).join(" + "),
            ...(caso.medioPago ?? caso.pagoSnuggle ? { "Forma de pago": (caso.medioPago ?? caso.pagoSnuggle)! } : {}),
        },
        tags: ["asistencia-viajero", compania.snuggle ? "snuggle" : "terrawind", "regression"],
    });
}

/**
 * Cotiza el viaje con las edades reales de los pasajeros y valida que el SSE lleve esas edades. Devuelve
 * el plan más barato de la compañía o null si la compañía no ofrece planes para el viaje.
 */
async function cotizarPlan(
    av: CotizarAsistenciaViajeroPage,
    testInfo: TestInfo,
    caso: CasoEmision,
    pasajeros: readonly ClienteAsistencia[],
    fechas: FechasViaje,
): Promise<{ plan: PlanAsistencia | null; edades: number[]; formasDePago: FormaDePagoCotizada[] | null }> {
    const compania = COMPANIAS_ASISTENCIA[caso.compania];
    const edades = edadesACotizar(pasajeros, fechas.salida);

    await test.step("Ingresar al cotizador de Asistencia al viajero", () => av.goto());
    await test.step(`Destino: ${caso.destino.label}`, () => av.seleccionarDestino(caso.destino));
    await test.step(
        `Fechas: ${formatFechaAr(fechas.salida)} → ${formatFechaAr(fechas.regreso)} (${fechas.dias} días)`,
        () => av.seleccionarFechas(fechas),
    );
    await test.step(`Edades de los pasajeros según su fecha de nacimiento: ${edades.join(", ")}`, () =>
        av.cargarEdades(edades),
    );
    await test.step("Cotizar: el SSE lleva el país, las fechas, los días y las edades cargadas", async () => {
        const body = await av.cotizar();
        await testInfo.attach("asistencia-cotizacion-request.json", {
            body: JSON.stringify(body, null, 2),
            contentType: "application/json",
        });
        expect((body?.pasajeros ?? []).map((p: any) => Number(p.edad))).toEqual(edades);
        expect(body?.nombrePais).toBe(caso.destino.opcion);
        expect(body?.vigenciaDesde).toBe(formatFechaAr(fechas.salida));
        expect(body?.vigenciaHasta).toBe(formatFechaAr(fechas.regreso));
        expect(Number(body?.travelDaysCounter)).toBe(fechas.dias);
    });

    const { estado, planes } = await test.step(`${compania.label}: planes cotizados en Polko`, async () => {
        await av.esperarCompania(compania.tile);
        await av.seleccionarCompania(compania.tile, compania.label);
        const estado = await av.estadoCompaniaConReintento();
        expect(estado, `${compania.label} no pudo cotizar ${descripcionViaje(caso)} (error o timeout del proveedor)`).not.toBe("error");
        if (estado === "sin-planes") return { estado, planes: [] as PlanAsistencia[] };
        const planes = await av.leerPlanes();
        await testInfo.attach(`planes-${caso.compania}.json`, {
            body: JSON.stringify(planes, null, 2),
            contentType: "application/json",
        });
        for (const leido of planes) expect(leido.precio, `"${leido.nombre}" sin precio`).toBeGreaterThan(0);
        return { estado, planes };
    });
    const porTransferencia = caso.pagoSnuggle === "Transferencia";
    const plan = await test.step(`${compania.label}: tomar el plan más barato${porTransferencia ? " que acepta transferencia" : ""}`, async () => {
        if (estado === "sin-planes") {
            testInfo.annotations.push({
                type: "Sin planes",
                description: `${compania.label} no tiene planes para ${descripcionViaje(caso)} (edades ${edades.join(", ")})`,
            });
            return null;
        }
        const elegido = porTransferencia ? await planMasBaratoConTransferencia(av, planes) : planes[0];
        if (!elegido) {
            testInfo.annotations.push({
                type: "Sin transferencia",
                description: `Ningún plan de ${compania.label} tiene "Transferencia" en las formas de pago para ${descripcionViaje(caso)}`,
            });
            return null;
        }
        testInfo.annotations.push({
            type: "Precio cotizado",
            description: `${compania.label} · ${elegido.nombre} (${elegido.codigo}): $${elegido.precio.toLocaleString("es-AR")}`,
        });
        return elegido;
    });

    // Pendiente de la rama del comparador de asistencia: el drawer y el PDF de cotización tienen que
    // mostrar el mismo total que la tarjeta.
    // if (plan) {
    //     await test.step(`Comparar "${plan.nombre}" y validar el PDF de cotización`, async () => {
    //         const tarjeta = av.planPorCodigo(plan.codigo);
    //         await av.cotizacion.planAgregarBtn(tarjeta).click();
    //         const comparar = av.page.getByRole("button", { name: /COMPARAR \(\d+\)/ });
    //         await expect(comparar).toHaveText("COMPARAR (1)");
    //         await comparar.click();
    //         const drawer = av.page.locator(".CoverageComparison__drawer");
    //         await expect(drawer).toBeVisible();
    //         const precioDrawer = parseMontoArs(await drawer.locator(".CoverageComparison__drawerPrice").first().innerText());
    //         expectPrecio(precioDrawer, plan.precio, "Comparador de coberturas");
    //         await descargarYValidarPdfCotizacion(
    //             av.page,
    //             testInfo,
    //             drawer.locator(".CoverageComparison__downloadButton"),
    //             plan.precio,
    //             `${caso.id}-${plan.codigo}`,
    //             { textos: [plan.nombre, caso.destino.opcion ?? ""].filter(Boolean) },
    //         );
    //         await av.page.locator(".CoverageComparison__drawerCloseButton").click();
    //         await expect(drawer).toBeHidden();
    //     });
    // }

    const formasDePago = plan ? await validarFormasDePagoCotizacion(av, testInfo, plan) : null;
    return { plan, edades, formasDePago };
}

/** Recorre los planes en el orden del listado (por total) abriendo sus formas de pago hasta uno con "Transferencia". */
async function planMasBaratoConTransferencia(
    av: CotizarAsistenciaViajeroPage,
    planes: PlanAsistencia[],
): Promise<PlanAsistencia | undefined> {
    for (const plan of planes) {
        if (formaDePago(await av.leerFormasDePago(plan), FORMA_TRANSFERENCIA)) return plan;
    }
    return undefined;
}

/** Lo que se cobra: el precio de "Transferencia" de las formas de pago si el caso contrata por transferencia. */
function precioACobrar(caso: CasoEmision, plan: PlanAsistencia, formasDePago: FormaDePagoCotizada[] | null): number {
    if (caso.pagoSnuggle !== "Transferencia") return plan.precio;
    return formaDePago(formasDePago, FORMA_TRANSFERENCIA)?.precio ?? plan.precio;
}

/**
 * Si la tarjeta del plan tiene "Ver las N formas de pago", lo abre: "Tarjeta en un pago" tiene que tener el precio
 * (y los dólares) de la tarjeta. Devuelve las formas para cruzarlas con el paso "Forma de pago" de la emisión.
 */
async function validarFormasDePagoCotizacion(
    av: CotizarAsistenciaViajeroPage,
    testInfo: TestInfo,
    plan: PlanAsistencia,
): Promise<FormaDePagoCotizada[] | null> {
    if (!(await av.cotizacion.planFormasPagoToggle(av.planPorCodigo(plan.codigo)).isVisible())) return null;
    return test.step(`"${plan.nombre}": "Ver las formas de pago" muestra "Tarjeta en un pago" con el precio de la tarjeta`, async () => {
        const formas = (await av.leerFormasDePago(plan))!;
        await testInfo.attach(`formas-de-pago-${plan.codigo}.json`, {
            body: JSON.stringify(formas, null, 2),
            contentType: "application/json",
        });
        testInfo.annotations.push({
            type: "Formas de pago",
            description: formas.map((f) => `${f.titulo}: ${f.precio != null ? pesos(f.precio) : "ver al pagar"}`).join(" · "),
        });
        const tarjeta = formaDePago(formas, FORMA_TARJETA);
        expect(tarjeta, `"Tarjeta en un pago" no está entre las formas de pago: ${formas.map((f) => f.titulo).join(", ")}`).toBeDefined();
        expect(tarjeta!.precio, '"Tarjeta en un pago" sin precio').not.toBeNull();
        expectPrecio(tarjeta!.precio!, plan.precio, '"Tarjeta en un pago" de las formas de pago');
        if (plan.usd != null) expect(tarjeta!.usd, '"Tarjeta en un pago" en dólares').toBeCloseTo(plan.usd, 2);
        return formas;
    });
}

/**
 * Planes de Snuggle con transferencia en "Ver las formas de pago": el paso "Forma de pago" ofrece "Tarjeta" y
 * "Transferencia" con esos precios y la tarjeta lateral cambia con la elección. Pasa por el otro medio y sigue
 * con `medio`.
 */
async function elegirFormaPagoSnuggle(
    av: CotizarAsistenciaViajeroPage,
    formas: FormaDePagoCotizada[],
    transferencia: FormaDePagoCotizada,
    medio: MedioPagoSnuggle,
): Promise<void> {
    const tarjeta = formaDePago(formas, FORMA_TARJETA)!;
    const precios: Record<MedioPagoSnuggle, number> = { Tarjeta: tarjeta.precio!, Transferencia: transferencia.precio! };
    const otro: MedioPagoSnuggle = medio === "Tarjeta" ? "Transferencia" : "Tarjeta";

    await test.step('Forma de pago: "Tarjeta" y "Transferencia" tienen los precios de "Ver las formas de pago"', async () => {
        await expect(
            av.emision.formaPagoHeading,
            'El plan tiene "Transferencia" en las formas de pago y la emisión no pide elegir la forma de pago',
        ).toBeVisible({ timeout: 60000 });
        expect(transferencia.precio, '"Transferencia" sin precio en las formas de pago de la cotización').not.toBeNull();
        const opciones = await av.leerOpcionesFormaPagoSnuggle();
        expect(Object.keys(opciones).sort()).toEqual(["Tarjeta", "Transferencia"]);
        expectPrecio(opciones.Tarjeta, tarjeta.precio!, '"Tarjeta" del paso Forma de pago');
        expectPrecio(opciones.Transferencia, transferencia.precio!, '"Transferencia" del paso Forma de pago');
    });

    for (const elegido of [otro, medio]) {
        const precio = precios[elegido];
        await test.step(`Elegir "${elegido}": la tarjeta lateral pasa a ${pesos(precio)}`, async () => {
            await av.elegirFormaPagoSnuggle(elegido);
            await expect
                .poll(async () => Math.abs((await av.totalTarjetaLateral()) - precio), {
                    message: `La tarjeta lateral no muestra el precio de "${elegido}" (${pesos(precio)})`,
                    timeout: 10000,
                })
                .toBeLessThanOrEqual(TOLERANCIA_PESOS);
        });
    }

    await test.step(`Siguiente con "${medio}"`, () => av.siguienteAPasajeros());
}

/**
 * Del "Emitir" de la tarjeta al resumen: forma de pago (TerraWind), los dos pasajeros por CUIT validando
 * que la edad cotizada sea la de su fecha de nacimiento, contacto de emergencia y resumen con el mismo total.
 */
async function completarEmision(
    av: CotizarAsistenciaViajeroPage,
    caso: CasoEmision,
    plan: PlanAsistencia,
    pasajeros: readonly ClienteAsistencia[],
    edades: number[],
    fechas: FechasViaje,
    formasDePago: FormaDePagoCotizada[] | null,
): Promise<void> {
    const compania = COMPANIAS_ASISTENCIA[caso.compania];
    const transferencia = compania.snuggle ? formaDePago(formasDePago, FORMA_TRANSFERENCIA) : undefined;
    const medioSnuggle: MedioPagoSnuggle = caso.pagoSnuggle ?? "Tarjeta";
    const precio = precioACobrar(caso, plan, formasDePago);

    await test.step(`Emitir "${plan.nombre}": la tarjeta lateral muestra el total cotizado`, async () => {
        await av.emitirPlan(plan.codigo);
        await expect(av.emision.sidebarTotalPesos).toBeVisible({ timeout: 30000 });
        expectPrecio(parseMontoArs(await av.emision.sidebarTotalPesos.innerText()), plan.precio, "Tarjeta lateral de la emisión");
    });

    if (caso.medioPago) {
        await test.step(`Forma de pago: ${caso.medioPago}`, () => av.elegirFormaPago(caso.medioPago!));
    } else if (transferencia) {
        await elegirFormaPagoSnuggle(av, formasDePago!, transferencia, medioSnuggle);
    } else {
        await test.step(`${compania.label} sin transferencia en las formas de pago: no pide forma de pago en Polko`, async () => {
            await expect(av.emision.pasajerosHeading).toBeVisible({ timeout: 60000 });
            await expect(av.emision.formaPagoHeading).toBeHidden();
        });
    }

    for (const [index, cliente] of pasajeros.entries()) {
        await test.step(
            `Pasajero ${index + 1}: ${cliente.nombre} ${cliente.apellido} (CUIT ${cliente.cuit}) tiene la edad cotizada (${edades[index]})`,
            async () => {
                const cargado = await av.completarPasajero(index, cliente);
                expect(cargado.documento).toBe(cliente.dni);
                expect(cargado.fechaNacimiento, "La fecha de nacimiento del padrón cambió").toBe(cliente.fechaNacimiento);
                expect(edadCliente(cliente, fechas.salida), "Edad a la fecha de salida").toBe(edades[index]);
                expect(cargado.fila).toBe(`Pasajero ${index + 1} · ${edades[index]} años`);
            },
        );
    }

    await test.step(compania.snuggle ? "Resumen (Snuggle no pide contacto de emergencia)" : "Contacto de emergencia y resumen", async () => {
        if (compania.snuggle) {
            await expect(av.emision.emergenciaNombreInput).toBeHidden();
        } else {
            await av.completarContactoEmergencia(CONTACTO_EMERGENCIA);
        }
        await av.irAlResumen();
        if (!compania.snuggle) {
            await expect(av.emision.resumenSeccion("Contacto de emergencia")).toContainText(CONTACTO_EMERGENCIA.nombre);
        }
        await expect(av.emision.resumenPlan).toContainText(plan.nombre);
        await expect(av.emision.resumenPlan).toContainText(compania.label);
        await expect(av.emision.resumenViaje).toContainText(formatFechaAr(fechas.salida));
        await expect(av.emision.resumenViaje).toContainText(formatFechaAr(fechas.regreso));
        if (caso.destino.opcion) await expect(av.emision.resumenViaje).toContainText(caso.destino.opcion);
        for (const cliente of pasajeros) await expect(av.emision.resumenPasajeros).toContainText(`DNI ${cliente.dni}`);
        await expect(av.emision.resumenPago).toContainText(
            caso.medioPago ?? (transferencia ? new RegExp(`${medioSnuggle} · \\$`) : MEDIOS_HABILITADOS_SNUGGLE),
        );
        expectPrecio(await av.totalResumen(), precio, "Total del resumen");
    });
}

async function esRangoOcupado(av: CotizarAsistenciaViajeroPage, emision: Response): Promise<boolean> {
    if (!(await av.resultado.errorTitle.isVisible())) return false;
    const detalle = `${await emision.text().catch(() => "")} ${await av.resultado.errorDetalle.innerText().catch(() => "")}`;
    return ERROR_RANGO_OCUPADO.test(detalle);
}

async function falloEmision(av: CotizarAsistenciaViajeroPage, donde: string, emision?: Response): Promise<never> {
    const detalle = (await av.resultado.errorDetalle.innerText().catch(() => "")).replace(/\s+/g, " ");
    const backend = emision ? ` | ${EMISION_LABEL} ${emision.status()}: ${(await emision.text().catch(() => "")).slice(0, 400)}` : "";
    throw new Error(`${donde} no se emitió: ${detalle || "sin detalle en pantalla"}${backend}`);
}

/** TerraWind: dos "Número de voucher", la póliza en Mi Cartera con el precio cotizado y un voucher por DNI. */
async function cerrarConVouchersTerraWind(
    page: Page,
    testInfo: TestInfo,
    av: CotizarAsistenciaViajeroPage,
    plan: PlanAsistencia,
    pasajeros: readonly ClienteAsistencia[],
    emision: Response,
): Promise<void> {
    const vouchers = await test.step("¡Vouchers emitidos con éxito! con un número de voucher por pasajero", async () => {
        if (!(await av.resultado.exitoTerraWindTitle.isVisible())) await falloEmision(av, "TerraWind", emision);
        await expect(av.resultado.numerosVoucher()).toHaveCount(pasajeros.length);
        const numeros = (await av.resultado.numerosVoucher().locator(".EmissionSuccess__rowValue").allInnerTexts()).map((n) => n.trim());
        for (const numero of numeros) expect(numero).toMatch(/^\w+$/);
        testInfo.annotations.push({ type: "Vouchers TerraWind", description: numeros.join(", ") });
        return numeros;
    });

    test.setTimeout(testInfo.timeout + TIMEOUT_EXTRA_POLIZA_MI_CARTERA);
    const miCartera = new MiCarteraPage(page);
    const poliza = await test.step(`Mi Cartera: la póliza del voucher ${vouchers[0]} tiene el precio cotizado`, async () => {
        await miCartera.goto();
        await miCartera.abrirCard(await miCartera.buscarPolizaEmitida(vouchers[0]));
        const card = miCartera.detail.locator("article.MiCarteraPolicyCard").filter({ hasText: vouchers[0] }).first();
        await expect(card).toBeVisible({ timeout: 60000 });
        expectPrecio(parseMontoArs(await card.locator(".MiCarteraPolicyCard__amount").innerText()), plan.precio, "Mi Cartera");
        return card;
    });

    for (const cliente of pasajeros) {
        await test.step(`Mi Cartera: descargar el voucher de ${cliente.nombre} ${cliente.apellido} (DNI ${cliente.dni})`, async () => {
            const boton = poliza.locator(".MiCarteraPolicyCard__documentButton").filter({
                has: page.locator(".MiCarteraPolicyCard__documentLabel", { hasText: `Voucher (DNI ${cliente.dni})` }),
            });
            const labels = await poliza.locator(".MiCarteraPolicyCard__documentLabel").allInnerTexts();
            await expect(boton, `No hay voucher para DNI ${cliente.dni}. Documentos: ${labels.join(", ")}`).toBeEnabled({
                timeout: 60000,
            });
            await adjuntarDescarga(testInfo, await miCartera.descargarDocumento(boton), `voucher-${cliente.dni}`);
        });
    }
}

async function adjuntarDescarga(testInfo: TestInfo, download: Download, nombre: string): Promise<void> {
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    await testInfo.attach(`${nombre}-${download.suggestedFilename()}`, {
        path: await download.path(),
        contentType: "application/pdf",
    });
}

/**
 * Snuggle: "Pago pendiente" con el link del checkout (se abre y el monto tiene que ser el cotizado),
 * emitida con un voucher por pasajero, sin link de pago (cobro manual) con el total cotizado, o por
 * transferencia: pendiente con el importe exacto (el precio de "Transferencia") y la cuenta de destino.
 */
async function cerrarContratacionSnuggle(
    page: Page,
    testInfo: TestInfo,
    av: CotizarAsistenciaViajeroPage,
    caso: CasoEmision,
    plan: PlanAsistencia,
    precio: number,
    pasajeros: readonly ClienteAsistencia[],
    emision: Response,
): Promise<void> {
    const compania = COMPANIAS_ASISTENCIA[caso.compania];
    const { resultado } = av;
    const contratacion = await adjuntarIntercambio(testInfo, "asistencia-snuggle-hire", emision);

    await test.step("La contratación lleva los dos pasajeros con sus datos reales y un único titular", async () => {
        if (!(await resultado.snuggleResultado.isVisible())) {
            if (await resultado.cotizacionYaContratada.isVisible()) throw new Error("Esta cotización ya se contrató");
            await falloEmision(av, compania.label, emision);
        }
        const request = emision.request().postDataJSON();
        expect(request?.quoteCode, "La contratación no lleva quoteCode").toBeTruthy();
        expect(String(request?.productCode)).toBe(plan.codigo);
        const enviados = request?.passengers ?? [];
        expect(enviados).toHaveLength(pasajeros.length);
        expect(enviados.filter((p: any) => p.owner === true)).toHaveLength(1);
        for (const [index, cliente] of pasajeros.entries()) {
            expect(enviados[index]).toEqual(
                expect.objectContaining({
                    documentNumber: cliente.dni,
                    birthday: cliente.fechaNacimiento.replace(/\//g, "-"),
                    gender: cliente.genero === "Masculino" ? "m" : "f",
                }),
            );
        }
        await expect(resultado.snuggleResultado).toContainText(compania.label);
    });

    if (caso.pagoSnuggle === "Transferencia") {
        await test.step(`Transferencia pendiente: importe exacto ${pesos(precio)} y cuenta de destino`, async () => {
            expect(emision.request().postDataJSON()?.paymentMethod, "La contratación no va como transferencia").toBe("transfer");
            await expect(resultado.snuggleResultado).toContainText("Falta que tu asegurado transfiera", { timeout: 30000 });
            await expect(resultado.snuggleEstado).toContainText("Transferencia pendiente");
            await expect(resultado.transferenciaMonto).toBeVisible();
            expectPrecio(parseMontoArs(await resultado.transferenciaMonto.innerText()), precio, "Importe exacto a transferir");
            if (contratacion?.total != null) expectPrecio(Number(contratacion.total), precio, "total de /newemitir");
            await expect(resultado.transferenciaCuentas.first(), "No muestra la cuenta de destino para transferir").toBeVisible();
            testInfo.annotations.push({
                type: "Transferencia",
                description:
                    `${compania.label} · ${pesos(precio)} · ` +
                    (await resultado.transferenciaCuentas.allInnerTexts()).map((c) => c.replace(/\s+/g, " ")).join(" | "),
            });
        });
        return;
    }

    await test.step("El total de la contratación es el cotizado", async () => {
        await expect(resultado.snuggleTotal).toBeVisible({ timeout: 30000 });
        expectPrecio(parseMontoArs(await resultado.snuggleTotal.innerText()), plan.precio, "Total de la contratación");
        if (contratacion?.total != null) expectPrecio(Number(contratacion.total), plan.precio, "total de /newemitir");
        testInfo.annotations.push({
            type: "Contratación Snuggle",
            description:
                `${compania.label} · ${(await resultado.snuggleEstado.innerText()).trim()} · ` +
                (await resultado.snuggleCodigos.allInnerTexts()).map((c) => c.replace(/\s+/g, " ")).join(" · "),
        });
    });

    if (await resultado.snuggleIrAPagarBtn.isVisible()) {
        await test.step('"Ir a pagar" abre el checkout con el monto cotizado', async () => {
            const link = (await resultado.snuggleLinkPago.innerText()).trim();
            expect(link).toMatch(/^https:\/\//);
            if (contratacion?.paymentLink) expect(link).toBe(contratacion.paymentLink);
            const checkoutPromise = page.context().waitForEvent("page", { timeout: 30000 });
            await resultado.snuggleIrAPagarBtn.click();
            const checkout = await checkoutPromise;
            await checkout.waitForLoadState("domcontentloaded", { timeout: 60000 });
            expect(checkout.url(), "El link no abre una pasarela conocida").toMatch(PASARELAS_LINK_PAGO);
            let montos: number[] = [];
            let errorCheckout: string | null = null;
            await expect
                .poll(
                    async () => {
                        const texto = await checkout.locator("body").innerText().catch(() => "");
                        errorCheckout = texto.match(ERROR_CHECKOUT)?.[0] ?? null;
                        montos = extraerMontos(texto);
                        return errorCheckout !== null || montos.some((monto) => Math.abs(monto - plan.precio) <= TOLERANCIA_PESOS);
                    },
                    { timeout: 60000 },
                )
                .toBe(true)
                .catch(() => undefined);
            await testInfo.attach("checkout-pago", {
                body: await checkout.screenshot({ fullPage: true }),
                contentType: "image/png",
            });
            testInfo.annotations.push({
                type: "Link de pago",
                description: `${checkout.url()} · ${errorCheckout ? `error: ${errorCheckout}` : `montos: ${montos.join(", ")}`}`,
            });
            expect(
                errorCheckout,
                `El checkout (${new URL(checkout.url()).host}) muestra "${errorCheckout}": el link de pago no sirve`,
            ).toBeNull();
            expect(
                montos.some((monto) => Math.abs(monto - plan.precio) <= TOLERANCIA_PESOS),
                `El checkout (${new URL(checkout.url()).host}) no muestra el cotizado $${plan.precio.toLocaleString("es-AR")}. ` +
                    `Montos en la página: ${montos.map((m) => `$${m.toLocaleString("es-AR")}`).join(", ") || "ninguno"}`,
            ).toBe(true);
            await checkout.close();
        });
        return;
    }

    if ((await resultado.snuggleVouchers.count()) > 0) {
        await test.step("Emitida: un voucher por pasajero", async () => {
            await expect(resultado.snuggleVouchers).toHaveCount(pasajeros.length);
            for (const [index, fila] of (await resultado.snuggleVouchers.all()).entries()) {
                const pdfPromise = page.waitForResponse(
                    (response) => SNUGGLE_VOUCHER_PDF_PATH.test(new URL(response.url()).pathname),
                    { timeout: 120000 },
                );
                const downloadPromise = page.waitForEvent("download", { timeout: 120000 });
                await resultado.voucherDescargarBtn(fila).click();
                expect((await pdfPromise).ok(), "La descarga del voucher de Snuggle falló").toBe(true);
                await adjuntarDescarga(testInfo, await downloadPromise, `voucher-snuggle-${index + 1}`);
            }
        });
        return;
    }

    await test.step("Sin link de pago: queda registrada para cobro manual", async () => {
        await expect(resultado.snuggleLinkNoDisponible.or(resultado.snuggleResultado.getByText(/no tiene link de pago/)).first()).toBeVisible();
        testInfo.annotations.push({
            type: "Sin link de pago",
            description: `${compania.label} devolvió la contratación sin link (cobro gestionado por Operaciones)`,
        });
    });
}

async function emitirCaso(page: Page, testInfo: TestInfo, caso: CasoEmision): Promise<void> {
    const compania = COMPANIAS_ASISTENCIA[caso.compania];
    const pasajeros = GRUPOS_PASAJEROS[caso.grupo].pasajeros;
    await applyUserMock(page);
    const av = new CotizarAsistenciaViajeroPage(page);

    for (let intento = 1; ; intento++) {
        const fechas = elegirFechasViaje(pasajeros, caso.dias, caso.ventanaSalidaDias);
        const { plan, edades, formasDePago } = await cotizarPlan(av, testInfo, caso, pasajeros, fechas);
        test.skip(
            !plan,
            caso.pagoSnuggle === "Transferencia"
                ? `${compania.label} no tiene planes con transferencia para ${descripcionViaje(caso)}`
                : `${compania.label} no ofrece planes para ${descripcionViaje(caso)}`,
        );

        await completarEmision(av, caso, plan!, pasajeros, edades, fechas, formasDePago);
        const emision = await test.step(`Emitir con ${compania.label}`, () => av.emitir());

        if (!compania.snuggle) {
            await adjuntarIntercambio(testInfo, `asistencia-terrawind-emision-${intento}`, emision);
            if (intento < MAX_INTENTOS_RANGO_OCUPADO && (await esRangoOcupado(av, emision))) {
                testInfo.annotations.push({
                    type: "Rango ocupado",
                    description: `Intento ${intento}: TerraWind ya tiene un voucher en ${formatFechaAr(fechas.salida)} → ${formatFechaAr(fechas.regreso)}`,
                });
                continue;
            }
            await cerrarConVouchersTerraWind(page, testInfo, av, plan!, pasajeros, emision);
            return;
        }

        await cerrarContratacionSnuggle(page, testInfo, av, caso, plan!, precioACobrar(caso, plan!, formasDePago), pasajeros, emision);
        return;
    }
}

export function tituloCasoEmision(caso: CasoEmision): string {
    const compania = COMPANIAS_ASISTENCIA[caso.compania];
    return (
        `${caso.destino.regionSnuggle} (${caso.destino.label}) · ${caso.dias} días: ${compania.label} · ` +
        `${GRUPOS_PASAJEROS[caso.grupo].label}${caso.medioPago ? ` · ${caso.medioPago}` : ""} → ` +
        (compania.snuggle ? (caso.pagoSnuggle === "Transferencia" ? "transferencia" : "link de pago") : "vouchers")
    );
}

/** Documenta el caso en Allure y lo emite de punta a punta. */
export async function probarEmision(page: Page, testInfo: TestInfo, caso: CasoEmision, feature: string): Promise<void> {
    const compania = COMPANIAS_ASISTENCIA[caso.compania];
    const grupo = GRUPOS_PASAJEROS[caso.grupo];
    const viaje = `${caso.destino.label} (región Snuggle "${caso.destino.regionSnuggle}") por ${caso.dias} días`;
    const story = `${caso.destino.regionSnuggle} · ${compania.label}`;
    if (compania.snuggle && caso.pagoSnuggle === "Transferencia") {
        test.setTimeout(480000);
        await documentar(
            caso,
            feature,
            story,
            `Cotiza asistencia al viajero a ${viaje} para ${grupo.label} con las edades reales de los clientes, ` +
                `elige el plan más barato de ${compania.label} que tiene "Transferencia" en "Ver las formas de pago" ` +
                "(si no hay, se saltea) y lo contrata por transferencia. Valida que el paso Forma de pago y la tarjeta " +
                "lateral tengan el precio de transferencia, y que la contratación quede pendiente con ese importe exacto " +
                "y la cuenta de destino.",
        );
    } else if (compania.snuggle) {
        test.setTimeout(480000);
        await documentar(
            caso,
            feature,
            story,
            `Cotiza asistencia al viajero a ${viaje} para ${grupo.label} con las edades reales de los clientes, ` +
                `elige el plan más barato de ${compania.label} y genera el link de pago. Valida que la contratación ` +
                "lleve los dos pasajeros con su fecha de nacimiento, documento y género, que el total sea el cotizado " +
                'y que "Ir a pagar" abra el checkout con ese monto. Si la operación vuelve emitida descarga los dos vouchers.',
        );
    } else {
        test.setTimeout(600000);
        await documentar(
            caso,
            feature,
            story,
            `Cotiza asistencia al viajero a ${viaje} para ${grupo.label} con las edades reales de los clientes a la ` +
                `fecha de salida, emite el plan más barato de TerraWind pagando con ${caso.medioPago} y valida que la ` +
                "tarjeta, el resumen y la póliza en Mi Cartera tengan el precio cotizado. Descarga desde Mi Cartera un " +
                "voucher por pasajero. Ante el error 520 de TerraWind (rango ocupado) recotiza con otras fechas.",
        );
    }
    await emitirCaso(page, testInfo, caso);
}
