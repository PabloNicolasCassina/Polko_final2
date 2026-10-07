import { test, expect } from "@playwright/test";
import CotizarMotoIAPage, { PLAN_CODES_MOTO } from "../pages/cotizarMotoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { reportarNumeroEmision } from "../helpers/reportePoliza";
import { MOTO_ROLES_CASES, COBERTURA_ROLES_MOTO_POR_COMPANIA } from "../data/motoRoles";

/**
 * Emisión motovehículo: roles de cliente (catálogo global).
 *
 * Por compañía: Asegurado + Tomador + Asegurado Adicional + Acreedor Prendario.
 * Compañías: Sancor, RUS, Rivadavia, ATM.
 *
 *   npx playwright test tests/motoRoles.spec.ts --project=chromium
 *   npx playwright test tests/motoRoles.spec.ts --project=chromiumPolkista
 *   npx playwright test tests/motoRoles.spec.ts --project=chromium --grep-invert "RUS"
 */

test.describe("Moto - Roles de cliente por compañía @regression", () => {
    test.afterEach(async ({}, testInfo) => {
        await attachBackendLogsOnFailure(testInfo);
    });

    test("matriz de cobertura: roles comprometidos por compañia estan en algun caso", () => {
        const cubiertos = new Map<string, Set<string>>();
        for (const caso of MOTO_ROLES_CASES) {
            const set = cubiertos.get(caso.compania) ?? new Set<string>();
            for (const r of caso.rolesCubiertos) set.add(r);
            cubiertos.set(caso.compania, set);
        }
        for (const [compania, esperados] of Object.entries(COBERTURA_ROLES_MOTO_POR_COMPANIA)) {
            const got = cubiertos.get(compania) ?? new Set();
            for (const rol of esperados) {
                expect(got.has(rol), `${compania} falta rol ${rol}`).toBe(true);
            }
        }
    });

    for (const caso of MOTO_ROLES_CASES) {
        test(`${caso.name} [${caso.rolesCubiertos.join(",")}]`, async ({ page }) => {
            test.setTimeout(240000);
            const cotizarMotoIA = new CotizarMotoIAPage(page);
            const codigo = PLAN_CODES_MOTO[caso.compania][caso.plan];
            expect(codigo, `plan "${caso.plan}" en ${caso.compania}`).toBeTruthy();

            await cotizarMotoIA.goto();
            await cotizarMotoIA.cotizarVehiculo(caso.vehiculo);

            await cotizarMotoIA.selectCompania(caso.compania);
            const plan = cotizarMotoIA.planCard(codigo);
            await expect(plan).toBeVisible();
            await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");

            await cotizarMotoIA.emitirPlan(codigo, {
                formaPago: caso.formaPago,
                dniCuit: caso.dniCuit,
                localidad: caso.localidad,
                mail: caso.mail ?? "cassinanico@gmail.com",
                telefono: caso.telefono ?? "3512334798",
                clientesAdicionales: caso.clientesAdicionales,
            });

            await expect(
                cotizarMotoIA.emisionExitosaHeading.or(cotizarMotoIA.emisionFinal.errorEmision),
            ).toBeVisible();
            await expect(cotizarMotoIA.emisionFinal.errorEmision).not.toBeVisible();
            await reportarNumeroEmision(cotizarMotoIA.numeroPolizaValue);
            await expect(cotizarMotoIA.anyDocumentoDescargarBtn.first()).toBeEnabled();
        });
    }
});
