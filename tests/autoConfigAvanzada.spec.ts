import { test, expect } from "@playwright/test";
import CotizarAutoIAPage, {
    CONFIG_AVANZADA_FIELDS_AUTO,
    CONFIG_AVANZADA_CHECKBOX_FIELDS_AUTO,
    CONFIG_AVANZADA_OPTIONS_BY_COMPANY_AUTO,
    CONFIG_AVANZADA_DISABLED_FIELDS_AUTO,
    CONFIG_AVANZADA_CUOTAS_BY_FACTURACION_AUTO,
    CONFIG_AVANZADA_AJUSTE_BY_FACTURACION_AUTO,
    CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_AUTO,
    CONFIG_AVANZADA_DESCUENTOS_AUTO,
    FORMAS_PAGO_EMISION_AUTO,
    PLAN_CODES_AUTO,
    SANCOR_DESCUENTO_SIN_EXTRA,
} from "../pages/cotizarAutoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import {
    formatPairwiseRow,
    generatePairwise,
    pairwiseRowToParams,
    type PairwiseFactor,
    type PairwiseRow,
} from "../helpers/pairwise";
import autosData from "../data/autos.json";

/**
 * Matrix pairwise de "Configuración avanzada" de auto + emisión.
 * Mock: `mocks/mockUserDataATM.json` (Fed + Mercantil).
 * Vehículo: autos genéricos de `data/autos.json` (sin `testType`, Física + CF) como factor pairwise.
 * Forma de pago: si la compañía no la expone en config avanzada (Sancor, Rivadavia, RUS,
 * Federación), entra como factor `formaPagoEmision` del paso Póliza (estricto, sin fallback).
 *
 * Dependencias filtradas (no confiar en opciones stale del listbox):
 *   ATM Efectivo → solo Bimestral|Trimestral (no Mensual)
 *   Triunfo Efectivo → solo Trimestral (no Mensual)
 *   Rivadavia ajuste × facturación
 *   Sancor descuento > 15 → requiere applyExtraDiscount
 *   RUS "No aplicar" → solo emite RC C/Grua (RC-G); resto usa Sigma Cero
 *
 * Auth:
 *   npx playwright test tests/autoConfigAvanzada.spec.ts --project=chromium
 *   npx playwright test tests/autoConfigAvanzada.spec.ts --project=chromiumPolkista
 *   npx playwright test tests/autoConfigAvanzada.spec.ts --project=mobile
 */

type AutoFixture = {
    marca: string;
    año: string;
    modelo: string;
    version: string;
    c_postal: string;
    ceroKm?: boolean;
    tipoPersona?: string;
    sitImpositiva?: string;
    testType?: string;
};

/** Clave corta para el eje pairwise + título del test. */
function autoKey(auto: AutoFixture): string {
    return `${auto.marca} ${auto.modelo} ${auto.año}`;
}

const AUTOS: AutoFixture[] = (autosData.autos as AutoFixture[]).filter(
    (a) => !a.testType && a.tipoPersona === "Física" && a.sitImpositiva === "Consumidor final",
);
const AUTO_BY_KEY: Record<string, AutoFixture> = Object.fromEntries(
    AUTOS.map((a) => [autoKey(a), a]),
);
const AUTO_KEYS = Object.keys(AUTO_BY_KEY);

function autoFromRow(row: PairwiseRow): AutoFixture {
    const key = row.vehiculo;
    if (typeof key !== "string" || !AUTO_BY_KEY[key]) {
        throw new Error(`Fila pairwise sin vehículo válido: ${String(key)}`);
    }
    return AUTO_BY_KEY[key];
}

/** Mismo plan representativo que autoHappyPath (gama media). */
const PLAN_POR_COMPANIA: Record<string, string> = {
    Sancor: "Auto Premium Max (c/Asistencia)",
    Rivadavia: "Mega Plan",
    Zurich: "Terceros Completo Premium Granizo",
    RUS: "Sigma Cero",
    Federación: "Terceros Completo Premium",
    ATM: "C Premium (C2)",
    Triunfo: "C8",
    Mercantil: "B1",
};

/** RUS: con ajuste "No aplicar" la UI solo deja emitir la primera cobertura (RC-G). */
const RUS_PLAN_SIN_AJUSTE = "RC C/Grua (RC)";

function planParaFila(compania: string, row: PairwiseRow): string {
    if (compania === "RUS") {
        const ajuste = row.ajusteAutomatico;
        if (typeof ajuste === "string" && /^no aplicar$/i.test(ajuste.trim())) {
            return RUS_PLAN_SIN_AJUSTE;
        }
    }
    return PLAN_POR_COMPANIA[compania];
}

const SKIP_INSPECCION: Record<string, boolean> = {
    Zurich: true,
};

async function applyUserMock(page: import("@playwright/test").Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

/** Pares válidos facturación|cuotas (Rivadavia / Mercantil). */
function facturacionCuotasPairs(compania: string): string[] {
    if (CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_AUTO[compania]) return [];
    const byFact = CONFIG_AVANZADA_CUOTAS_BY_FACTURACION_AUTO[compania];
    if (!byFact) return [];
    return Object.entries(byFact).flatMap(([fact, cuotas]) => cuotas.map((c) => `${fact}|${c}`));
}

/** Triples válidos pago|facturación|cuotas (ATM / Triunfo). */
function pagoFacturacionCuotasPairs(compania: string): string[] {
    const byPago = CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_AUTO[compania];
    if (!byPago) return [];
    return Object.entries(byPago).flatMap(([pago, byFact]) =>
        Object.entries(byFact).flatMap(([fact, cuotas]) =>
            cuotas.map((c) => `${pago}|${fact}|${c}`),
        ),
    );
}

function factorsForCompany(compania: string): PairwiseFactor[] {
    const fields = CONFIG_AVANZADA_FIELDS_AUTO[compania] ?? [];
    const checkboxes = new Set(CONFIG_AVANZADA_CHECKBOX_FIELDS_AUTO[compania] ?? []);
    const disabled = new Set(CONFIG_AVANZADA_DISABLED_FIELDS_AUTO[compania] ?? []);
    const companyOptions = CONFIG_AVANZADA_OPTIONS_BY_COMPANY_AUTO[compania] ?? {};
    const pfcPairs = pagoFacturacionCuotasPairs(compania);
    const fcPairs = facturacionCuotasPairs(compania);
    const factors: PairwiseFactor[] = [
        { name: "vehiculo", values: AUTO_KEYS },
    ];

    for (const field of fields) {
        if (disabled.has(field)) continue;

        if (
            pfcPairs.length > 0 &&
            (field === "formaDePago" || field === "facturacion" || field === "cuotas")
        ) {
            continue;
        }
        if (fcPairs.length > 0 && (field === "facturacion" || field === "cuotas")) continue;

        if (checkboxes.has(field)) {
            factors.push({ name: field, values: [true, false] });
            continue;
        }

        const opciones = companyOptions[field];
        if (opciones && opciones.length >= 2) {
            factors.push({ name: field, values: opciones });
        }
    }

    if (pfcPairs.length >= 2) {
        factors.push({ name: "pago_facturacion_cuotas", values: pfcPairs });
    } else if (fcPairs.length >= 2) {
        factors.push({ name: "facturacion_cuotas", values: fcPairs });
    }

    const descuentos = CONFIG_AVANZADA_DESCUENTOS_AUTO[compania];
    if (descuentos && descuentos.length >= 2) {
        factors.push({ name: "descuento", values: descuentos });
    }

    const formasPagoEmision = FORMAS_PAGO_EMISION_AUTO[compania];
    if (!fields.includes("formaDePago") && formasPagoEmision && formasPagoEmision.length >= 2) {
        factors.push({ name: "formaPagoEmision", values: formasPagoEmision });
    }

    return factors;
}

/**
 * Descarta filas inviables:
 * - Rivadavia: ajuste × facturación
 * - Sancor: descuento > tope pauta sin applyExtraDiscount; 15% con check extra
 *   (marks con check = 0/35, sin check = 0/15/35)
 */
function isConfigRowValid(compania: string, row: PairwiseRow): boolean {
    const byAjuste = CONFIG_AVANZADA_AJUSTE_BY_FACTURACION_AUTO[compania];
    if (byAjuste) {
        const packed = row.facturacion_cuotas;
        const ajuste = row.ajusteAutomatico;
        if (typeof packed === "string" && typeof ajuste === "string") {
            const fact = packed.split("|")[0];
            const ok = byAjuste[fact];
            if (ok && !ok.includes(ajuste)) return false;
        }
    }

    if (compania === "Sancor") {
        const desc = row.descuento;
        const extra = row.applyExtraDiscount;
        if (typeof desc === "number") {
            if (desc > SANCOR_DESCUENTO_SIN_EXTRA && extra !== true) return false;
            if (desc === SANCOR_DESCUENTO_SIN_EXTRA && extra === true) return false;
        }
    }

    return true;
}

/** Expande packed dependants → campos reales. Quita `vehiculo` y `formaPagoEmision` (no son config avanzada). */
function expandConfigRow(row: PairwiseRow): PairwiseRow {
    const out: PairwiseRow = { ...row };
    delete out.vehiculo;
    delete out.formaPagoEmision;
    const packedPago = out.pago_facturacion_cuotas;
    if (typeof packedPago === "string" && packedPago.split("|").length === 3) {
        const [formaDePago, facturacion, cuotas] = packedPago.split("|");
        out.formaDePago = formaDePago;
        out.facturacion = facturacion;
        out.cuotas = cuotas;
        delete out.pago_facturacion_cuotas;
        return out;
    }
    const packed = out.facturacion_cuotas;
    if (typeof packed === "string" && packed.includes("|")) {
        const [facturacion, cuotas] = packed.split("|");
        out.facturacion = facturacion;
        out.cuotas = cuotas;
        delete out.facturacion_cuotas;
    }
    return out;
}

function formaPagoEmision(row: PairwiseRow, configValues: PairwiseRow): string {
    if (typeof row.formaPagoEmision === "string") return row.formaPagoEmision;
    const fromConfig = configValues.formaDePago;
    if (typeof fromConfig === "string" && fromConfig.length > 0) {
        // En emisión, "Medios electrónicos" no es opción directa: best-effort Efectivo.
        if (/medios electr[oó]nicos/i.test(fromConfig)) return "Efectivo";
        return fromConfig;
    }
    return "Efectivo";
}

test.describe("Auto - Config avanzada (pairwise + emitir) @configAvanzada", () => {
    test.describe.configure({ retries: 1 });

    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    for (const compania of Object.keys(PLAN_POR_COMPANIA)) {
        const factors = factorsForCompany(compania);
        const rows = generatePairwise(factors).filter((row) => isConfigRowValid(compania, row));

        test.describe(compania, () => {
            for (const [idx, row] of rows.entries()) {
                const label = formatPairwiseRow(row);
                const nombrePlan = planParaFila(compania, row);
                const codigo = PLAN_CODES_AUTO[compania][nombrePlan];

                test(`PW${idx + 1}: ${label} → emitir ${nombrePlan} (${codigo})`, async ({
                    page,
                }) => {
                    test.setTimeout(360000);
                    const auto = autoFromRow(row);
                    const configValues = expandConfigRow(row);
                    const formaPago = formaPagoEmision(row, configValues);
                    const formaPagoEstricta = typeof row.formaPagoEmision === "string";

                    await documentarCaso({
                        epic: "Auto",
                        feature: "Configuración avanzada (pairwise)",
                        story: compania,
                        severidad: "normal",
                        prioridad: "medium",
                        descripcion:
                            `Cotiza un ${auto.marca} ${auto.version} ${auto.año} con el cotizador de Auto IA, ` +
                            `selecciona ${compania}, aplica la combinación pairwise PW${idx + 1} de configuración avanzada ` +
                            `(${label}) y emite el plan "${nombrePlan}" (${codigo}, o el primero disponible si el vehículo ` +
                            `o la configuración lo ocultan) pagando con ${formaPago}. ` +
                            "Espera que el plan tenga precio con la configuración aplicada y que la emisión sea exitosa " +
                            "con número de emisión y documentos descargables.",
                        precondiciones:
                            "Usuario logueado (storageState del project), datos de usuario mockeados con compañías habilitadas, " +
                            "frontend en localhost:3000 y backends levantados.",
                        parametros: {
                            Compañía: compania,
                            Vehículo: `${auto.marca} ${auto.version} ${auto.año}`,
                            Plan: `${nombrePlan} (${codigo})`,
                            "Forma de pago emisión": formaPago,
                            ...pairwiseRowToParams(configValues),
                        },
                        tags: ["auto", "config-avanzada", "pairwise"],
                    });

                    await applyUserMock(page);
                    const cotizarAutoIA = new CotizarAutoIAPage(page);

                    await test.step("Ingresar al cotizador de Auto IA", async () => {
                        await cotizarAutoIA.goto();
                    });

                    await test.step(`Cotizar ${auto.marca} ${auto.modelo} ${auto.año} y seleccionar ${compania}`, async () => {
                        await cotizarAutoIA.cotizarVehiculo(auto);
                        await cotizarAutoIA.selectCompania(compania);
                    });

                    if (Object.keys(configValues).length > 0) {
                        await test.step(`Aplicar configuración avanzada: ${formatPairwiseRow(configValues)}`, async () => {
                            await cotizarAutoIA.aplicarConfigCase(compania, configValues);
                        });
                    }

                    const codigoEmitir = await test.step(`Validar que el plan ${codigo} tenga precio`, async () => {
                        const codigoResuelto = await cotizarAutoIA.resolvePlanCodeOrFirst(codigo);
                        const plan = cotizarAutoIA.planCard(codigoResuelto);
                        await expect(plan).toBeVisible();
                        await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");
                        return codigoResuelto;
                    });

                    await test.step(`Emitir el plan ${codigoEmitir} con ${formaPago}`, async () => {
                        await cotizarAutoIA.emitirPlan(codigoEmitir, {
                            formaPago,
                            formaPagoEstricta,
                            skipInspeccion: SKIP_INSPECCION[compania] === true,
                        });
                    });

                    await test.step("Validar emisión exitosa, número de emisión y documentos", async () => {
                        await expect(
                            cotizarAutoIA.emisionExitosaHeading.or(
                                cotizarAutoIA.emisionFinal.errorEmision,
                            ),
                        ).toBeVisible();
                        await expect(cotizarAutoIA.emisionFinal.errorEmision).not.toBeVisible();
                        await cotizarAutoIA.assertNumeroEmision();
                        await expect(cotizarAutoIA.anyDocumentoDescargarBtn.first()).toBeEnabled();
                    });
                });
            }
        });
    }
});
