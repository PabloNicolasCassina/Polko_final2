import { appendFileSync, writeFileSync } from "fs";
import path from "path";
import { test, expect, type TestInfo } from "@playwright/test";
import CotizarAsistenciaViajeroPage, { type PlanAsistencia } from "../pages/cotizarAsistenciaViajeroPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { documentarCaso } from "../helpers/documentarCaso";
import { edadesACotizar, formatFechaAr, sumarDias, type FechasViaje } from "../helpers/edadViajero";
import { applyUserMock, PRECONDICIONES } from "../helpers/emisionAsistViajero";
import {
    CLIENTES_ASISTENCIA,
    COMPANIAS_ASISTENCIA,
    PLANES_UNIVERSAL,
    type PlanUniversal,
} from "../data/asistenciaViajeroEmision";

/**
 * Relevamiento auxiliar: cuáles de los 15 planes de Universal Assistance generan link de pago al final de la
 * emisión. El destino y los días no importan: cada test cotiza los viajes de `PLANES_UNIVERSAL` en orden hasta
 * que Polko recibe el plan (Snuggle no siempre se lo manda), todos con salida el 15/12/2026, lo contrata con link
 * de pago (un pasajero de 0-75)
 * y espera hasta 2:30 min a que aparezca el link: Universal en tarifa sugerida lo entrega después de contratar
 * ("Estamos generando el link de pago").
 *
 * No falla por no tener link: es un relevamiento. Si el plan no sale en ningún viaje se saltea, y falla solo si
 * la contratación da error. En todos los casos deja en el reporte "¿Link de pago?", el detalle, "Cotización" y
 * "Código interno de Polko" (anotaciones del test y adjunto `relevamiento.json`), y suma una fila a
 * `docs/relevamiento-link-pago-universal-<fecha>.md` con todos los planes de la corrida.
 *
 *   npx playwright test tests/relevamientoLinkPagoUniversal.spec.ts --project=chromium
 */

const PASAJERO = CLIENTES_ASISTENCIA.oviedo;
const SALIDA = new Date(2026, 11, 15);
const ESPERA_LINK_MS = 150000;
const PREFIJO_INTEGRADOR = /^snuggle:/i;
const SIN_CONTRATAR = "No llegó a contratarse";
const ANSI = /\x1b\[[0-9;]*m/g;
const REPORTE = path.join(
    __dirname,
    "..",
    "docs",
    `relevamiento-link-pago-universal-${new Date().toISOString().slice(0, 10)}.md`,
);
const ENCABEZADO_REPORTE =
    "# Relevamiento de link de pago · Universal Assistance\n\n" +
    "| Hora | Plan | Código | Viaje | ¿Link de pago? | Detalle | Cotización | Código interno de Polko |\n" +
    "|---|---|---|---|---|---|---|---|\n";

interface Relevamiento {
    plan: string;
    codigo: string;
    viaje: string;
    link: "Sí" | "No";
    detalle: string;
    cotizacion: string;
    codigoInterno: string;
}

function celda(valor: string): string {
    return valor.replace(/\|/g, "/").replace(/\s+/g, " ").trim();
}

async function registrar(testInfo: TestInfo, fila: Relevamiento): Promise<void> {
    testInfo.annotations.push(
        { type: "¿Link de pago?", description: `${fila.link} · ${fila.detalle}` },
        { type: "Cotización", description: fila.cotizacion },
        { type: "Código interno de Polko", description: fila.codigoInterno },
    );
    await testInfo.attach("relevamiento.json", { body: JSON.stringify(fila, null, 2), contentType: "application/json" });
    try {
        writeFileSync(REPORTE, ENCABEZADO_REPORTE, { flag: "wx" });
    } catch {}
    const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    const valores = [hora, fila.plan, fila.codigo, fila.viaje, fila.link, fila.detalle, fila.cotizacion, fila.codigoInterno];
    appendFileSync(REPORTE, `| ${valores.map(celda).join(" | ")} |\n`);
}

/** Cotiza los viajes del plan en orden hasta que Universal se lo manda a Polko. */
async function buscarPlan(
    av: CotizarAsistenciaViajeroPage,
    testInfo: TestInfo,
    planUniversal: PlanUniversal,
): Promise<{ plan: PlanAsistencia; viaje: string } | { plan: null; probados: string[] }> {
    const { label, tile } = COMPANIAS_ASISTENCIA.Universal_Assistance;
    const probados: string[] = [];
    for (const [index, { destino, dias }] of planUniversal.viajes.entries()) {
        const fechas: FechasViaje = { salida: SALIDA, regreso: sumarDias(SALIDA, dias - 1), dias };
        const edades = edadesACotizar([PASAJERO], fechas.salida);
        const viaje = `${destino.label} · ${formatFechaAr(fechas.salida)} → ${formatFechaAr(fechas.regreso)} (${fechas.dias} días)`;
        const plan = await test.step(`Viaje ${index + 1}: cotizar ${viaje} y buscar "${planUniversal.nombre}"`, async () => {
            await av.goto();
            await av.seleccionarDestino(destino);
            await av.seleccionarFechas(fechas);
            await av.cargarEdades(edades);
            await av.cotizar();
            await av.esperarCompania(tile);
            await av.seleccionarCompania(tile, label);
            const estado = await av.estadoCompaniaConReintento();
            const planes = estado === "con-planes" ? await av.leerPlanes() : [];
            await testInfo.attach(`planes-viaje-${index + 1}.json`, {
                body: JSON.stringify({ viaje, estado, planes }, null, 2),
                contentType: "application/json",
            });
            const encontrado = planes.find((p) => p.codigo === planUniversal.codigo);
            if (!encontrado) {
                const recibidos = planes.map((p) => p.codigo).join(", ");
                probados.push(`${viaje}: ${estado}${recibidos ? ` (${recibidos})` : ""}`);
            }
            return encontrado ?? null;
        });
        if (plan) return { plan, viaje };
    }
    return { plan: null, probados };
}

/** Del "Emitir" de la tarjeta a "Generar link de pago", pagando con tarjeta si el plan ofrece elegir. */
async function contratarConLink(av: CotizarAsistenciaViajeroPage, plan: PlanAsistencia): Promise<void> {
    const { emision } = av;
    await test.step(`Emitir "${plan.nombre}"`, () => av.emitirPlan(plan.codigo));
    await test.step("Forma de pago: tarjeta (link de pago) si el plan ofrece elegir", async () => {
        await expect(emision.formaPagoHeading.or(emision.pasajerosHeading).first()).toBeVisible({ timeout: 60000 });
        if (await emision.formaPagoSnuggleSelect.isVisible()) {
            await av.elegirFormaPagoSnuggle("Tarjeta");
            await av.siguienteAPasajeros();
        }
    });
    await test.step(`Pasajero: ${PASAJERO.nombre} ${PASAJERO.apellido} (CUIT ${PASAJERO.cuit})`, () => av.completarPasajero(0, PASAJERO));
    await test.step("Resumen", () => av.irAlResumen());
}

/** Espera el desenlace del link y devuelve si quedó un link en pantalla, con el link o el motivo. */
async function esperarLink(av: CotizarAsistenciaViajeroPage): Promise<{ link: boolean; detalle: string }> {
    const { resultado } = av;
    const desenlace = resultado.snuggleLinkPago
        .or(resultado.snuggleLinkFallido)
        .or(resultado.snuggleLinkNoGenera)
        .or(resultado.snuggleLinkNoDisponible)
        .or(resultado.transferenciaMonto)
        .or(resultado.snuggleVouchers);
    await expect(desenlace.first()).toBeVisible({ timeout: ESPERA_LINK_MS }).catch(() => undefined);

    if (await resultado.snuggleLinkPago.isVisible()) {
        const link = (await resultado.snuggleLinkPago.getAttribute("title")) || (await resultado.snuggleLinkPago.innerText());
        return { link: true, detalle: link.trim() };
    }
    if (await resultado.snuggleLinkNoGenera.isVisible()) {
        return { link: false, detalle: "Universal no genera link de pago para este plan" };
    }
    if (await resultado.snuggleLinkFallido.isVisible()) {
        return { link: false, detalle: "Universal no devolvió el link de pago" };
    }
    if (await resultado.snuggleLinkNoDisponible.isVisible()) {
        return { link: false, detalle: "El link de pago todavía no está disponible" };
    }
    if (await resultado.transferenciaMonto.isVisible()) {
        return { link: false, detalle: "Quedó como transferencia pendiente" };
    }
    if ((await resultado.snuggleVouchers.count()) > 0) {
        return { link: false, detalle: "Emitida directamente, con vouchers y sin link" };
    }
    if (await resultado.snuggleLinkGenerando.isVisible()) {
        return { link: false, detalle: `Seguía generando el link después de ${ESPERA_LINK_MS / 1000} s` };
    }
    const estado = (await resultado.snuggleEstado.innerText().catch(() => "")).trim();
    return { link: false, detalle: `Sin link en pantalla${estado ? ` (estado: ${estado})` : ""}` };
}

test.describe("Asistencia al viajero - Relevamiento de link de pago de Universal", () => {
    test.describe.configure({ mode: "parallel" });

    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    for (const planUniversal of PLANES_UNIVERSAL) {
        test(`${planUniversal.nombre} (${planUniversal.codigo}): ¿genera link de pago?`, async ({ page }, testInfo) => {
            test.setTimeout(1800000);
            await documentarCaso({
                epic: "Asistencia al viajero",
                feature: "Relevamiento de link de pago de Universal",
                story: planUniversal.nombre,
                severidad: "normal",
                prioridad: "medium",
                descripcion:
                    `Cotiza hasta ${planUniversal.viajes.length} viajes con un pasajero de 0-75 hasta que Polko recibe ` +
                    `"${planUniversal.nombre}" (${planUniversal.codigo}), lo contrata con link de pago y espera hasta ` +
                    `${ESPERA_LINK_MS / 1000} s a que aparezca el link. Registra si lo generó y los códigos "Cotización" ` +
                    'y "Código interno de Polko".',
                precondiciones: PRECONDICIONES,
                parametros: { Plan: planUniversal.nombre, Código: planUniversal.codigo, Modalidad: planUniversal.modalidad },
                tags: ["asistencia-viajero", "snuggle", "universal", "relevamiento"],
            });
            await applyUserMock(page);
            const av = new CotizarAsistenciaViajeroPage(page);
            const fila: Relevamiento = {
                plan: planUniversal.nombre,
                codigo: planUniversal.codigo,
                viaje: "—",
                link: "No",
                detalle: SIN_CONTRATAR,
                cotizacion: "—",
                codigoInterno: "—",
            };

            let sinPlan: string | null = null;
            try {
                const busqueda = await buscarPlan(av, testInfo, planUniversal);
                if (!busqueda.plan) {
                    sinPlan =
                        `Polko no recibió "${planUniversal.nombre}" en ninguno de los ${planUniversal.viajes.length} viajes ` +
                        `cotizados: ${busqueda.probados.join(" · ")}`;
                    fila.detalle = `No aparece en la cotización de Polko (${planUniversal.viajes.length} viajes probados)`;
                    testInfo.annotations.push({ type: "Sin el plan en Polko", description: sinPlan });
                } else {
                    const { plan } = busqueda;
                    fila.viaje = busqueda.viaje;
                    await contratarConLink(av, plan);
                    const emision = await test.step("Generar link de pago", () => av.emitir());
                    const contratacion = await emision.json().catch(() => null);
                    await testInfo.attach("asistencia-snuggle-hire-request.json", {
                        body: JSON.stringify(emision.request().postDataJSON(), null, 2),
                        contentType: "application/json",
                    });
                    await testInfo.attach("asistencia-snuggle-hire-response.json", {
                        body: JSON.stringify(contratacion, null, 2),
                        contentType: "application/json",
                    });

                    await test.step('Leer "Cotización" y "Código interno de Polko"', async () => {
                        const { resultado } = av;
                        if (await resultado.snuggleResultado.isVisible()) {
                            fila.cotizacion =
                                ((await resultado.codigoOperacion("Cotización").textContent()) ?? "").trim() || fila.cotizacion;
                            fila.codigoInterno =
                                ((await resultado.codigoOperacion("Código interno de Polko").textContent()) ?? "").trim() ||
                                fila.codigoInterno;
                        }
                        const quoteCode = contratacion?.quoteCode ?? emision.request().postDataJSON()?.quoteCode;
                        if (fila.cotizacion === "—" && quoteCode) fila.cotizacion = String(quoteCode);
                        if (fila.codigoInterno === "—" && contratacion?.operationId) {
                            fila.codigoInterno = String(contratacion.operationId).replace(PREFIJO_INTEGRADOR, "");
                        }
                    });

                    if (!(await av.resultado.snuggleResultado.isVisible())) {
                        const detalle = (await av.resultado.errorDetalle.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
                        fila.detalle =
                            `La contratación falló (${emision.status()}): ` +
                            (detalle || (await emision.text().catch(() => "")).slice(0, 200));
                        throw new Error(fila.detalle);
                    }

                    await test.step(`Esperar el link de pago (hasta ${ESPERA_LINK_MS / 1000} s)`, async () => {
                        const { link, detalle } = await esperarLink(av);
                        fila.link = link ? "Sí" : "No";
                        fila.detalle = detalle;
                        await testInfo.attach("pantalla-final", {
                            body: await page.screenshot({ fullPage: true }),
                            contentType: "image/png",
                        });
                    });
                }
            } catch (error) {
                if (fila.detalle === SIN_CONTRATAR) {
                    const mensaje = String((error as Error)?.message ?? error).replace(ANSI, "");
                    fila.detalle = `${SIN_CONTRATAR}: ${mensaje.split("\n")[0].slice(0, 200)}`;
                }
                throw error;
            } finally {
                await registrar(testInfo, fila);
            }
            test.skip(sinPlan !== null, sinPlan ?? "");
        });
    }
});
