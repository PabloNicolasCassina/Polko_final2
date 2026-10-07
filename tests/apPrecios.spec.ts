import { test, expect, type Page } from "@playwright/test";
import CotizarAPIAPage, {
    PLAN_PERSONALIZADO_AP,
    PRODUCTOS_AP,
    type ConfigCaseAP,
    type DatosCotizacionAP,
} from "../pages/cotizarAPIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { CUIT_ASEGURADO, CUIT_TOMADOR_FISICA } from "../data/apRoles";

/**
 * AP: impacto de descuento y vigencia en la prima + lo que viaja al backend.
 *
 * Descuento (barra "Descuento extra", solo aplica con cobertura Personalizada:
 * sin config avanzada completa "APLICAR CAMBIOS" queda deshabilitado):
 *   - La prima Personalizada con 30% es menor que con 0% (ambos productos).
 *   - `configuracionAvanzada.Sancor.descuento` viaja en la cotización y
 *     `parametrosAdicionales.descuento` en el alta de matriz.
 *   - Alta de certificados: `comision` = comisión AP del usuario si la
 *     vigencia supera 30 días (0 si no), `rangoEdad` 1–5 y `product`.
 *
 * Vigencia "Por día": la prima del plan Intermedio crece con los días de
 * cobertura y `vigenciaHasta` viaja como hoy + N.
 *
 *   npx playwright test tests/apPrecios.spec.ts --project=chromium
 */

const BASE: DatosCotizacionAP = {
    vigencia: "+30 días",
    cantPersonas: "1",
    actividad: "Servicios Comunales, Sociales y Personales",
    clasificacion: "Otros Servicios sin uso de herramientas",
    tarea: "Administrativo",
    c_postal: "5000",
};

const CONFIG: ConfigCaseAP = {
    coberturaMuerte: "$55.000.000",
    asistenciaMedica: "$8.000.000",
    subsidioFallecimiento: "$2.071.300",
};

const TOMADOR = CUIT_TOMADOR_FISICA;
const ASEGURADOS = [CUIT_ASEGURADO];
/** `aseguradoras.Sancor.1.comisiones.ACCIDENTES_PERSONALES.general` de mocks/mockUserDataATM.json. */
const COMISION_AP_USUARIO = 500;
const DIAS_POR_DIA = [5, 25, 60];

type CapturedRequest = { url: string; body: any };

async function setup(page: Page): Promise<CapturedRequest[]> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({ contentType: "application/json", body: mockUserDataString });
    });
    const requests: CapturedRequest[] = [];
    page.on("request", (request) => {
        if (request.method() !== "POST" || !request.url().includes("/accidentes-personales/")) return;
        let body: any = null;
        try {
            body = request.postDataJSON();
        } catch {}
        requests.push({ url: request.url(), body });
    });
    return requests;
}

function lastRequest(requests: CapturedRequest[], pattern: RegExp): any {
    return requests.filter((r) => pattern.test(r.url)).at(-1)?.body;
}

function ddmmyyyy(fecha: Date): string {
    return [fecha.getDate(), fecha.getMonth() + 1].map((n) => String(n).padStart(2, "0")).join("/") + `/${fecha.getFullYear()}`;
}

/** Cotización nueva (goto) + Personalizada con el descuento dado; devuelve la prima por producto. */
async function preciosPersonalizada(cotizarAP: CotizarAPIAPage, descuento: number): Promise<Record<"ocasion" | "integro", number>> {
    await cotizarAP.goto();
    await cotizarAP.cotizarAP(BASE);
    await cotizarAP.esperarPlan(PRODUCTOS_AP.ocasion, "Intermedio");
    await cotizarAP.aplicarConfigCase({ ...CONFIG, descuento });
    await cotizarAP.esperarPlan(PRODUCTOS_AP.integro, PLAN_PERSONALIZADO_AP);
    return {
        ocasion: await cotizarAP.planPrecio(PRODUCTOS_AP.ocasion, PLAN_PERSONALIZADO_AP),
        integro: await cotizarAP.planPrecio(PRODUCTOS_AP.integro, PLAN_PERSONALIZADO_AP),
    };
}

test.describe("AP - Precios: descuento y vigencia @regression", () => {
    test.describe.configure({ retries: 1 });

    test.afterEach(async ({}, testInfo) => {
        await attachBackendLogsOnFailure(testInfo);
    });

    test("Descuento 30% baja la prima Personalizada y viaja en cotización y alta de matriz", async ({ page }) => {
        test.setTimeout(420000);
        const requests = await setup(page);
        const cotizarAP = new CotizarAPIAPage(page);

        const precioSin = await preciosPersonalizada(cotizarAP, 0);
        const precioCon = await preciosPersonalizada(cotizarAP, 30);
        await test.info().attach("precios-descuento", {
            body: JSON.stringify({ sinDescuento: precioSin, con30: precioCon }, null, 2),
            contentType: "application/json",
        });

        expect(lastRequest(requests, /\/cotizar$/)?.configuracionAvanzada?.Sancor?.descuento).toBe(30);
        expect(precioSin.ocasion).toBeGreaterThan(0);
        expect(precioSin.integro).toBeGreaterThan(0);
        expect.soft(precioCon.ocasion, "OCASION: prima con 30% < sin descuento").toBeLessThan(precioSin.ocasion);
        expect.soft(precioCon.integro, "INTEGRO: prima con 30% < sin descuento").toBeLessThan(precioSin.integro);

        const opts = { tomador: TOMADOR, asegurados: ASEGURADOS };
        await cotizarAP.completarPasoPoliza(PRODUCTOS_AP.ocasion, PLAN_PERSONALIZADO_AP, opts);
        await cotizarAP.completarClientes(opts);
        const matriz = lastRequest(requests, /alta-matriz/);
        expect(matriz?.product).toBe(PRODUCTOS_AP.ocasion);
        expect(matriz?.parametrosAdicionales?.descuento).toBe(30);
    });

    test("Alta de certificados: comisión, rangoEdad y product de la cobertura emitida", async ({ page }) => {
        test.setTimeout(420000);
        test.fail(true, "fechaNacimientoByRolValidation usa el mapa viejo de 3 rangos: bloquea la emisión con rangoEdad 3–5");
        const requests = await setup(page);
        const cotizarAP = new CotizarAPIAPage(page);
        await cotizarAP.goto();
        await cotizarAP.cotizarAP(BASE);
        await cotizarAP.esperarPlan(PRODUCTOS_AP.ocasion, "Intermedio");
        await cotizarAP.aplicarConfigCase({ ...CONFIG, descuento: 30 });

        await cotizarAP.emitirPlan(PRODUCTOS_AP.ocasion, PLAN_PERSONALIZADO_AP, { tomador: TOMADOR, asegurados: ASEGURADOS });
        const certificados = lastRequest(requests, /alta-certificados/);
        expect(certificados, "No se pidió alta de certificados").toBeTruthy();
        expect(certificados.product).toBe(PRODUCTOS_AP.ocasion);
        expect(certificados.parametrosAdicionales?.comision).toBe(COMISION_AP_USUARIO);
        expect(certificados.parametrosAdicionales?.rangoEdad).toBe(3);
        await cotizarAP.assertEmisionExitosa();
    });

    for (const producto of Object.values(PRODUCTOS_AP)) {
        test(`${producto}: la prima "Por día" crece con los días de vigencia`, async ({ page }) => {
            test.setTimeout(420000);
            test.fail(producto === PRODUCTOS_AP.integro, "INTEGRO no prorratea 'Por día': 5 y 25 días cotizan igual y 60 días da menos");
            const requests = await setup(page);
            const cotizarAP = new CotizarAPIAPage(page);
            const precios: Record<number, number> = {};

            for (const dias of DIAS_POR_DIA) {
                await cotizarAP.goto();
                await cotizarAP.cotizarAP({ ...BASE, vigencia: "Por día", diasVigencia: dias });
                await cotizarAP.esperarPlan(producto, "Intermedio");

                const fin = new Date();
                fin.setDate(fin.getDate() + dias);
                expect(lastRequest(requests, /\/cotizar$/)?.vigenciaHasta).toBe(ddmmyyyy(fin));
                precios[dias] = await cotizarAP.planPrecio(producto, "Intermedio");
                expect(precios[dias]).toBeGreaterThan(0);
            }

            await test.info().attach(`precios-por-dia-${producto}`, {
                body: JSON.stringify(precios, null, 2),
                contentType: "application/json",
            });
            for (let i = 1; i < DIAS_POR_DIA.length; i++) {
                const [antes, despues] = [DIAS_POR_DIA[i - 1], DIAS_POR_DIA[i]];
                expect
                    .soft(precios[despues], `${despues} días ($${precios[despues]}) > ${antes} días ($${precios[antes]})`)
                    .toBeGreaterThan(precios[antes]);
            }
        });
    }
});
