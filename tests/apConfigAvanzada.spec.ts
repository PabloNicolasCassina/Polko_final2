import { test, expect } from "@playwright/test";
import CotizarAPIAPage, {
    CONFIG_AVANZADA_DESCUENTOS_AP,
    CONFIG_AVANZADA_OPTIONS_AP,
    DEDUCIBLE_POSICIONES_AP,
    FACTURACION_BY_VIGENCIA_AP,
    FORMAS_PAGO_AP,
    PLAN_PERSONALIZADO_AP,
    PRODUCTOS_AP,
    coberturaMuerteParaAmf,
    integroSoportaConfig,
    type ConfigCaseAP,
    type DatosCotizacionAP,
    type DeduciblePosicionAP,
    type ProductoAP,
    type VigenciaAP,
} from "../pages/cotizarAPIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { CUIT_ASEGURADO, CUIT_TOMADOR_FISICA } from "../data/apRoles";
import { documentarCaso } from "../helpers/documentarCaso";
import {
    formatPairwiseRow,
    generatePairwise,
    pairwiseRowToParams,
    type PairwiseFactor,
    type PairwiseRow,
} from "../helpers/pairwise";

/**
 * Matrix pairwise de "Configuración avanzada" de AP (Sancor) + emisión punta a
 * punta de la fila "Personalizada". Mock obligatorio: `mocks/mockUserDataATM.json`.
 *
 * Ejes (mapeo en vivo 2026-09-29, `CONFIG_AVANZADA_*_AP`):
 *   rangoEdad (5) × coberturaMuerte (3) × asistenciaMedica (3) × deducible (min|max)
 *   × vigencia|facturación (+30 días: Mensual|Anual; Por día: solo Mensual)
 *   × descuento (0|30) × producto (OCASION DE TRABAJO|INTEGRO) × forma de pago.
 * Sancor no admite asistencia médica > muerte e invalidez: en esas filas se
 * sube la cobertura de muerte a la menor válida (`coberturaMuerteParaAmf`).
 * INTEGRO no admite rango < 16 ni AMF < $8.000.000: esas filas se emiten por
 * OCASION DE TRABAJO (se normaliza el producto en vez de descartar la fila,
 * para no perder los pares del resto de los ejes).
 * La fecha de nacimiento de los asegurados se ajusta al rango de edad cotizado
 * (`fechaNacimientoParaRango`).
 *
 * Auth por project (storageState) + mock de usuario por route:
 *   npx playwright test tests/apConfigAvanzada.spec.ts --project=chromium
 *   npx playwright test tests/apConfigAvanzada.spec.ts --project=chromiumPolkista
 *   npx playwright test tests/apConfigAvanzada.spec.ts --project=mobile
 */

const COTIZACION_BASE: Omit<DatosCotizacionAP, "vigencia"> = {
    cantPersonas: "1",
    actividad: "Servicios Comunales, Sociales y Personales",
    clasificacion: "Otros Servicios sin uso de herramientas",
    tarea: "Administrativo",
    c_postal: "5000",
};

/** "Por día": fin de vigencia a más de 1 mes desde hoy. */
const DIAS_VIGENCIA_POR_DIA = 35;

const TOMADOR = CUIT_TOMADOR_FISICA;
const ASEGURADOS = [CUIT_ASEGURADO];

async function applyUserMock(page: import("@playwright/test").Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

function buildFactors(): PairwiseFactor[] {
    return [
        { name: "rangoEdad", values: CONFIG_AVANZADA_OPTIONS_AP.rangoEdad },
        { name: "coberturaMuerte", values: CONFIG_AVANZADA_OPTIONS_AP.coberturaMuerte },
        { name: "asistenciaMedica", values: CONFIG_AVANZADA_OPTIONS_AP.asistenciaMedica },
        { name: "formaPago", values: [...FORMAS_PAGO_AP] },
        { name: "deducible", values: [...DEDUCIBLE_POSICIONES_AP] },
        { name: "vigencia_facturacion", values: vigenciaFacturacionPairs() },
        { name: "descuento", values: CONFIG_AVANZADA_DESCUENTOS_AP },
        { name: "producto", values: Object.values(PRODUCTOS_AP) },
    ];
}

/** Pares válidos vigencia|facturación ("Por día" solo Mensual). */
function vigenciaFacturacionPairs(): string[] {
    return (Object.keys(FACTURACION_BY_VIGENCIA_AP) as VigenciaAP[]).flatMap((vigencia) =>
        FACTURACION_BY_VIGENCIA_AP[vigencia].map((facturacion) => `${vigencia}|${facturacion}`),
    );
}

function splitVigenciaFacturacion(row: PairwiseRow): { vigencia: VigenciaAP; facturacion: string } {
    const [vigencia, facturacion] = String(row.vigencia_facturacion).split("|");
    return { vigencia: vigencia as VigenciaAP, facturacion };
}

/**
 * AMF > muerte e invalidez → se sube la cobertura de muerte a la menor válida.
 * INTEGRO inviable para la config → se emite por OCASION DE TRABAJO.
 */
function normalizeRow(row: PairwiseRow): PairwiseRow {
    const coberturaMuerte = coberturaMuerteParaAmf(String(row.coberturaMuerte), String(row.asistenciaMedica));
    const soporta = integroSoportaConfig({
        rangoEdad: String(row.rangoEdad),
        asistenciaMedica: String(row.asistenciaMedica),
    });
    const producto = row.producto === PRODUCTOS_AP.integro && !soporta ? PRODUCTOS_AP.ocasion : row.producto;
    return { ...row, coberturaMuerte, producto };
}

function configFromRow(row: PairwiseRow): ConfigCaseAP {
    return {
        rangoEdad: String(row.rangoEdad),
        coberturaMuerte: String(row.coberturaMuerte),
        asistenciaMedica: String(row.asistenciaMedica),
        deducible: row.deducible as DeduciblePosicionAP,
        subsidioFallecimiento: CONFIG_AVANZADA_OPTIONS_AP.subsidioFallecimiento[0],
        facturacion: splitVigenciaFacturacion(row).facturacion,
        descuento: Number(row.descuento),
    };
}

test.describe("AP - Config avanzada (pairwise + emitir Personalizada) @configAvanzada", () => {
    // Reintento: fallas intermitentes de Sancor pre (alta de matriz / emisión).
    test.describe.configure({ retries: 1 });

    test.afterEach(async ({}, testInfo) => {
        await attachBackendLogsOnFailure(testInfo);
    });

    const rows = generatePairwise(buildFactors()).map(normalizeRow);

    for (const [idx, row] of rows.entries()) {
        const label = formatPairwiseRow(row);
        const producto = row.producto as ProductoAP;

        test(`PW${idx + 1}: ${label} → emitir ${PLAN_PERSONALIZADO_AP}`, async ({ page }) => {
            test.setTimeout(300000);
            const config = configFromRow(row);
            const { vigencia } = splitVigenciaFacturacion(row);
            const formaPago = String(row.formaPago);

            await documentarCaso({
                epic: "Accidentes Personales",
                feature: "Configuración avanzada (pairwise)",
                story: producto,
                severidad: "normal",
                prioridad: "medium",
                descripcion:
                    `Cotiza Accidentes Personales (${vigencia}) con el cotizador de AP IA, aplica la combinación pairwise ` +
                    `PW${idx + 1} de configuración avanzada y emite en Sancor el plan "${PLAN_PERSONALIZADO_AP}" del producto ` +
                    `${producto} pagando con ${formaPago}. Espera que el plan muestre las coberturas elegidas ` +
                    `(MEI ${config.coberturaMuerte} - AMF ${config.asistenciaMedica}), tenga precio y que la emisión sea exitosa.`,
                precondiciones:
                    "Usuario logueado (storageState del project), datos de usuario mockeados con Sancor habilitada, " +
                    "frontend en localhost:3000 y backends levantados.",
                parametros: {
                    Compañía: "Sancor",
                    Producto: producto,
                    Plan: PLAN_PERSONALIZADO_AP,
                    ...pairwiseRowToParams(row),
                },
                tags: ["ap", "config-avanzada", "pairwise"],
            });

            await applyUserMock(page);
            const cotizarAP = new CotizarAPIAPage(page);

            await test.step("Ingresar al cotizador de AP IA", async () => {
                await cotizarAP.goto();
            });

            await test.step(`Cotizar AP con vigencia ${vigencia}`, async () => {
                await cotizarAP.cotizarAP({
                    ...COTIZACION_BASE,
                    vigencia,
                    ...(vigencia === "Por día" && { diasVigencia: DIAS_VIGENCIA_POR_DIA }),
                });
            });

            await test.step(`Aplicar configuración avanzada: ${label}`, async () => {
                await cotizarAP.aplicarConfigCase(config);
            });

            if (!integroSoportaConfig(config)) {
                await test.step(`Validar que ${PRODUCTOS_AP.integro} no ofrezca plan ${PLAN_PERSONALIZADO_AP}`, async () => {
                    await expect(cotizarAP.planRow(PRODUCTOS_AP.integro, PLAN_PERSONALIZADO_AP)).toHaveCount(0);
                });
            }

            await test.step(`Validar coberturas y precio de ${producto} / ${PLAN_PERSONALIZADO_AP}`, async () => {
                const personalizada = await cotizarAP.esperarPlan(producto, PLAN_PERSONALIZADO_AP);
                await expect(personalizada).toContainText(
                    `MEI ${config.coberturaMuerte} - AMF ${config.asistenciaMedica}`,
                );
                expect(await cotizarAP.planPrecio(producto, PLAN_PERSONALIZADO_AP)).toBeGreaterThan(0);
            });

            await test.step(`Emitir ${producto} / ${PLAN_PERSONALIZADO_AP} con ${formaPago}`, async () => {
                await cotizarAP.emitirPlan(producto, PLAN_PERSONALIZADO_AP, {
                    formaPago,
                    tomador: TOMADOR,
                    asegurados: ASEGURADOS,
                    rangoEdad: config.rangoEdad,
                });
            });

            await test.step("Validar emisión exitosa", async () => {
                await cotizarAP.assertEmisionExitosa();
            });
        });
    }
});
