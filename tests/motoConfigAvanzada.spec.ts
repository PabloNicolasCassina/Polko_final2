import { test, expect } from "@playwright/test";
import CotizarMotoIAPage, {
    CONFIG_AVANZADA_FIELDS_MOTO,
    CONFIG_AVANZADA_CHECKBOX_FIELDS_MOTO,
    CONFIG_AVANZADA_OPTIONS_BY_COMPANY_MOTO,
    CONFIG_AVANZADA_DISABLED_FIELDS_MOTO,
    CONFIG_AVANZADA_CUOTAS_BY_FACTURACION_MOTO,
    CONFIG_AVANZADA_AJUSTE_BY_FACTURACION_MOTO,
    CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_MOTO,
    CONFIG_AVANZADA_DESCUENTOS_MOTO,
    PLAN_CODES_MOTO,
} from "../pages/cotizarMotoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { reportarNumeroEmision } from "../helpers/reportePoliza";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import {
    formatPairwiseRow,
    generatePairwise,
    pairwiseRowToParams,
    type PairwiseFactor,
    type PairwiseRow,
} from "../helpers/pairwise";
import motosData from "../data/motos.json";

/**
 * Matrix pairwise de "Configuración avanzada" de moto + emisión punta a punta.
 * Mock obligatorio: `mocks/mockUserDataATM.json` vía `mockUserDataString`.
 *
 * Ejes/valores: mapeo en vivo 2026-09-15/22 vía `CONFIG_AVANZADA_*`.
 * Rivadavia: facturación×cuotas + ajuste (Semestral sin 10%, filtrado) + grua + descuento 0|15.
 * ATM: pago×facturación×cuotas + ajuste + descuento 0|30.
 * RUS: ajuste + descuento 0|15.
 * Triunfo: usoVehiculo + pago×facturación×cuotas + descuento 0|30 (sin ajusteAutomatico).
 * Vehículo: las 4 motos de `data/motos.json` como factor pairwise (no cartesiano).
 *
 * Auth por project (storageState) + mock de usuario por route:
 *   npx playwright test tests/motoConfigAvanzada.spec.ts --project=chromium
 *   npx playwright test tests/motoConfigAvanzada.spec.ts --project=chromiumPolkista
 *   npx playwright test tests/motoConfigAvanzada.spec.ts --project=mobile
 */

type MotoFixture = {
    marca: string;
    año: string;
    version: string;
    c_postal: string;
    esCeroKm?: boolean;
    tipoPersona?: string;
    sitImpositiva?: string;
};

/** Clave corta para el eje pairwise + título del test. */
function motoKey(moto: MotoFixture): string {
    return `${moto.marca} ${moto.año}`;
}

const MOTOS: MotoFixture[] = motosData.motos;
const MOTO_BY_KEY: Record<string, MotoFixture> = Object.fromEntries(
    MOTOS.map((m) => [motoKey(m), m]),
);
const MOTO_KEYS = Object.keys(MOTO_BY_KEY);

/** Mismo plan representativo que motoHappyPath (gama media). */
const PLAN_POR_COMPANIA: Record<string, string> = {
    Sancor: "Moto Premium",
    RUS: "RCM c/grúa",
    Rivadavia: "Base Plus",
    ATM: "Robo Premium",
    Triunfo: "C8",
};

async function applyUserMock(page: import("@playwright/test").Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

/** Pares válidos facturación|cuotas (Rivadavia). */
function facturacionCuotasPairs(compania: string): string[] {
    if (CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_MOTO[compania]) return [];
    const byFact = CONFIG_AVANZADA_CUOTAS_BY_FACTURACION_MOTO[compania];
    if (!byFact) return [];
    return Object.entries(byFact).flatMap(([fact, cuotas]) => cuotas.map((c) => `${fact}|${c}`));
}

/** Triples válidos pago|facturación|cuotas (ATM / Triunfo). */
function pagoFacturacionCuotasPairs(compania: string): string[] {
    const byPago = CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_MOTO[compania];
    if (!byPago) return [];
    return Object.entries(byPago).flatMap(([pago, byFact]) =>
        Object.entries(byFact).flatMap(([fact, cuotas]) =>
            cuotas.map((c) => `${pago}|${fact}|${c}`),
        ),
    );
}

/**
 * Arma factores pairwise: vehículo + checkboxes editables + comboboxes con ≥2 opciones
 * + barra "Descuento extra" (RUS / Rivadavia / ATM / Triunfo).
 * Dependientes: `facturacion_cuotas` (Rivadavia) o `pago_facturacion_cuotas` (ATM / Triunfo).
 */
function factorsForCompany(compania: string): PairwiseFactor[] {
    const fields = CONFIG_AVANZADA_FIELDS_MOTO[compania] ?? [];
    const checkboxes = new Set(CONFIG_AVANZADA_CHECKBOX_FIELDS_MOTO[compania] ?? []);
    const disabled = new Set(CONFIG_AVANZADA_DISABLED_FIELDS_MOTO[compania] ?? []);
    const companyOptions = CONFIG_AVANZADA_OPTIONS_BY_COMPANY_MOTO[compania] ?? {};
    const pfcPairs = pagoFacturacionCuotasPairs(compania);
    const fcPairs = facturacionCuotasPairs(compania);
    const factors: PairwiseFactor[] = [
        { name: "vehiculo", values: MOTO_KEYS },
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

    const descuentos = CONFIG_AVANZADA_DESCUENTOS_MOTO[compania];
    if (descuentos && descuentos.length >= 2) {
        factors.push({ name: "descuento", values: descuentos });
    }

    return factors;
}

/** Descarta filas inviables (ej. Rivadavia Semestral + Aplicar 10%). */
function isConfigRowValid(compania: string, row: PairwiseRow): boolean {
    const byAjuste = CONFIG_AVANZADA_AJUSTE_BY_FACTURACION_MOTO[compania];
    if (!byAjuste) return true;
    const packed = row.facturacion_cuotas;
    const ajuste = row.ajusteAutomatico;
    if (typeof packed !== "string" || typeof ajuste !== "string") return true;
    const fact = packed.split("|")[0];
    const ok = byAjuste[fact];
    if (!ok) return true;
    return ok.includes(ajuste);
}

/** Expande packed dependants → campos reales (orden de apply en page). Quita `vehiculo`. */
function expandConfigRow(row: PairwiseRow): PairwiseRow {
    const out: PairwiseRow = { ...row };
    delete out.vehiculo;
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

function motoFromRow(row: PairwiseRow): MotoFixture {
    const key = row.vehiculo;
    if (typeof key !== "string" || !MOTO_BY_KEY[key]) {
        throw new Error(`Fila pairwise sin vehículo válido: ${String(key)}`);
    }
    return MOTO_BY_KEY[key];
}

/** Forma de pago a pedir en emisión: la del combo si vino en la fila; si no, Efectivo (best-effort). */
function formaPagoEmision(row: PairwiseRow): string {
    const fromConfig = row.formaDePago;
    if (typeof fromConfig === "string" && fromConfig.length > 0) {
        // En emisión, "Medios electrónicos" no es opción directa (Triunfo config avanzada).
        if (/medios electr[oó]nicos/i.test(fromConfig)) return "Efectivo";
        return fromConfig;
    }
    return "Efectivo";
}

test.describe("Moto - Config avanzada (pairwise + emitir) @configAvanzada", () => {
    // Reintento: fallas intermitentes de aseguradora (ej. Rivadavia adjuntar foto 503).
    test.describe.configure({ retries: 1 });

    test.afterEach(async ({}, testInfo) => {
        await attachBackendLogsOnFailure(testInfo);
    });

    for (const [compania, nombrePlan] of Object.entries(PLAN_POR_COMPANIA)) {
        const codigo = PLAN_CODES_MOTO[compania][nombrePlan];
        const factors = factorsForCompany(compania);
        const rows = generatePairwise(factors).filter((row) => isConfigRowValid(compania, row));

        test.describe(compania, () => {
            for (const [idx, row] of rows.entries()) {
                const label = formatPairwiseRow(row);

                test(`PW${idx + 1}: ${label} → emitir ${nombrePlan} (${codigo})`, async ({ page }) => {
                    // Triunfo cotiza lento; cotizar + aplicar + emitir necesita holgura.
                    test.setTimeout(240000);
                    const moto = motoFromRow(row);
                    const configValues = expandConfigRow(row);
                    const formaPago = formaPagoEmision(configValues);

                    await documentarCaso({
                        epic: "Moto",
                        feature: "Configuración avanzada (pairwise)",
                        story: compania,
                        severidad: "normal",
                        prioridad: "medium",
                        descripcion:
                            `Cotiza una ${moto.marca} ${moto.version} ${moto.año} con el cotizador de Moto IA, ` +
                            `selecciona ${compania}, aplica la combinación pairwise PW${idx + 1} de configuración avanzada ` +
                            `y emite el plan "${nombrePlan}" (${codigo}, o el primero disponible si la configuración lo oculta) ` +
                            `pagando con ${formaPago}. Espera que el plan tenga precio con la configuración aplicada y que la ` +
                            "emisión sea exitosa con número de póliza y documentos descargables.",
                        precondiciones:
                            "Usuario logueado (storageState del project), datos de usuario mockeados con compañías habilitadas, " +
                            "frontend en localhost:3000 y backends levantados.",
                        parametros: {
                            Compañía: compania,
                            Vehículo: `${moto.marca} ${moto.version} ${moto.año}`,
                            Plan: `${nombrePlan} (${codigo})`,
                            "Forma de pago emisión": formaPago,
                            ...pairwiseRowToParams(configValues),
                        },
                        tags: ["moto", "config-avanzada", "pairwise"],
                    });

                    await applyUserMock(page);
                    const cotizarMotoIA = new CotizarMotoIAPage(page);

                    await test.step("Ingresar al cotizador de Moto IA", async () => {
                        await cotizarMotoIA.goto();
                    });

                    await test.step(`Cotizar ${moto.marca} ${moto.version} ${moto.año} y seleccionar ${compania}`, async () => {
                        await cotizarMotoIA.cotizarVehiculo(moto);
                        await cotizarMotoIA.selectCompania(compania);
                    });

                    if (Object.keys(configValues).length > 0) {
                        await test.step(`Aplicar configuración avanzada: ${formatPairwiseRow(configValues)}`, async () => {
                            await cotizarMotoIA.aplicarConfigCase(compania, configValues);
                        });
                    }

                    const codigoEmitir = await test.step(`Validar que el plan ${codigo} tenga precio`, async () => {
                        const codigoResuelto = await cotizarMotoIA.resolvePlanCodeOrFirst(codigo);
                        const plan = cotizarMotoIA.planCard(codigoResuelto);
                        await expect(plan).toBeVisible();
                        await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");
                        return codigoResuelto;
                    });

                    await test.step(`Emitir el plan ${codigoEmitir} con ${formaPago}`, async () => {
                        await cotizarMotoIA.emitirPlan(codigoEmitir, { formaPago });
                    });

                    await test.step("Validar emisión exitosa, número de póliza y documentos", async () => {
                        await expect(
                            cotizarMotoIA.emisionExitosaHeading.or(cotizarMotoIA.emisionFinal.errorEmision)
                        ).toBeVisible();
                        await expect(cotizarMotoIA.emisionFinal.errorEmision).not.toBeVisible();
                        await reportarNumeroEmision(cotizarMotoIA.numeroPolizaValue);
                        await expect(cotizarMotoIA.anyDocumentoDescargarBtn.first()).toBeEnabled();
                    });
                });
            }
        });
    }
});
