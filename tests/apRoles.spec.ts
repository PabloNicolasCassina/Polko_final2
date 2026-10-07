import { test, expect } from "@playwright/test";
import CotizarAPIAPage, { PRODUCTOS_AP } from "../pages/cotizarAPIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import {
    AP_ROLES_CASES,
    COBERTURA_ROLES_AP,
    COTIZACION_ROLES_BASE,
    CUIT_TOMADOR_FISICA,
} from "../data/apRoles";

/**
 * Emisión Accidentes Personales: roles de cliente (Sancor).
 *
 * Tomador (física/jurídica), Beneficiario (herederos legales / tomador / otro
 * + beneficiario adicional), Asegurado (1 y varios), Beneficiario de
 * subrogación y los 3 terceros con cláusula. Cada caso emite OCASION DE
 * TRABAJO / Intermedio. Caso negativo: único asegurado = beneficiario.
 * Casos con `bugConocido` corren como `test.fail`.
 *
 *   npx playwright test tests/apRoles.spec.ts --project=chromium
 *   npx playwright test tests/apRoles.spec.ts --project=chromiumPolkista
 */

const PRODUCTO = PRODUCTOS_AP.ocasion;
const PLAN = "Intermedio";

async function applyUserMock(page: import("@playwright/test").Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

test.describe("AP - Roles de cliente @regression", () => {
    test.afterEach(async ({}, testInfo) => {
        await attachBackendLogsOnFailure(testInfo);
    });

    test("matriz de cobertura: todos los roles y variantes de beneficiario estan en algun caso", () => {
        const cubiertos = new Set(AP_ROLES_CASES.flatMap((caso) => caso.rolesCubiertos));
        for (const rol of COBERTURA_ROLES_AP) {
            expect(cubiertos.has(rol), `falta rol ${rol}`).toBe(true);
        }
    });

    for (const caso of AP_ROLES_CASES) {
        const extras = (caso.clientesAdicionales?.length ?? 0) + caso.asegurados.length - 1;
        const timeoutMs = extras >= 2 ? 360000 : 300000;

        test(`${caso.name} [${caso.rolesCubiertos.join(",")}]`, async ({ page }) => {
            test.setTimeout(timeoutMs);
            test.fail(Boolean(caso.bugConocido), caso.bugConocido);
            await applyUserMock(page);
            const cotizarAP = new CotizarAPIAPage(page);

            await cotizarAP.goto();
            await cotizarAP.cotizarAP({
                ...COTIZACION_ROLES_BASE,
                cantPersonas: String(caso.asegurados.length),
                situacionImpositiva: caso.situacionImpositiva,
            });

            await cotizarAP.esperarPlan(PRODUCTO, PLAN);
            expect(await cotizarAP.planPrecio(PRODUCTO, PLAN)).toBeGreaterThan(0);

            await cotizarAP.emitirPlan(PRODUCTO, PLAN, {
                formaPago: caso.formaPago,
                tomador: caso.tomador,
                asegurados: caso.asegurados,
                beneficiario: caso.beneficiario,
                beneficiarioAdicional: caso.beneficiarioAdicional,
                clientesAdicionales: caso.clientesAdicionales,
            });
            await cotizarAP.assertEmisionExitosa();
        });
    }

    test("Único asegurado = beneficiario (Tomador): la UI bloquea el avance", async ({ page }) => {
        test.setTimeout(240000);
        await applyUserMock(page);
        const cotizarAP = new CotizarAPIAPage(page);

        await cotizarAP.goto();
        await cotizarAP.cotizarAP(COTIZACION_ROLES_BASE);

        const opts = {
            tomador: CUIT_TOMADOR_FISICA,
            asegurados: [CUIT_TOMADOR_FISICA],
            beneficiario: { apply: "tomador" as const },
        };
        await cotizarAP.completarPasoPoliza(PRODUCTO, PLAN, opts);
        await cotizarAP.completarClientes(opts);

        await expect(cotizarAP.aseguradoPropioBeneficiarioFlash).toBeVisible();
        await cotizarAP.editarClienteBtn(2).click();
        await expect(cotizarAP.aseguradoPropioBeneficiarioFlash).toBeVisible();

        await cotizarAP.buttons.siguienteBtn.click();
        await expect(cotizarAP.aseguradoPropioBeneficiarioFlash).toBeVisible();
        await expect(cotizarAP.detallesPolizaHeading).not.toBeVisible();
    });
});
