import { test, expect } from "@playwright/test";
import CotizarAutoIAPage, { PLAN_CODES_AUTO } from "../pages/cotizarAutoIAPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { AUTO_ROLES_CASES, COBERTURA_ROLES_POR_COMPANIA } from "../data/autoRoles";

/**
 * Emisión automotor: roles de cliente por compañía.
 *
 * Sancor/RUS: Asegurado + Asegurado Adicional + Acreedor Prendario.
 * Resto: todos sus roles. Titular de sociedad (25) en PJ Rivadavia/ATM.
 * Experta: skip (no cotiza; `roles` en config son IVA).
 *
 *   npx playwright test tests/autoRoles.spec.ts --project=chromium
 *   npx playwright test tests/autoRoles.spec.ts --project=chromiumPolkista
 */

async function applyUserMock(page: import("@playwright/test").Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

test.describe("Auto - Roles de cliente por compañía @regression", () => {
    test.afterEach(async ({}, testInfo) => {
        await attachBackendLogsOnFailure(testInfo);
    });

    test("matriz de cobertura: roles comprometidos por compañia estan en algun caso", () => {
        const cubiertos = new Map<string, Set<string>>();
        for (const caso of AUTO_ROLES_CASES) {
            if (caso.skip) continue;
            const set = cubiertos.get(caso.compania) ?? new Set<string>();
            for (const r of caso.rolesCubiertos) set.add(r);
            cubiertos.set(caso.compania, set);
        }
        for (const [compania, esperados] of Object.entries(COBERTURA_ROLES_POR_COMPANIA)) {
            if (compania === "Experta") continue;
            const got = cubiertos.get(compania) ?? new Set();
            for (const rol of esperados) {
                expect(got.has(rol), `${compania} falta rol ${rol}`).toBe(true);
            }
        }
    });

    for (const caso of AUTO_ROLES_CASES) {
        const extras = caso.clientesAdicionales?.length ?? 0;
        const timeoutMs = extras >= 2 ? 240000 : 180000;

        test(`${caso.name} [${caso.rolesCubiertos.join(",")}]`, async ({ page }) => {
            test.setTimeout(timeoutMs);
            if (caso.skip) {
                test.skip(true, caso.skipReason ?? "skip");
                return;
            }

            await applyUserMock(page);
            const cotizarAutoIA = new CotizarAutoIAPage(page);
            const codigo = PLAN_CODES_AUTO[caso.compania][caso.plan];
            expect(codigo, `plan "${caso.plan}" en ${caso.compania}`).toBeTruthy();

            await cotizarAutoIA.goto();
            await cotizarAutoIA.cotizarVehiculo(caso.vehiculo);

            await cotizarAutoIA.selectCompania(caso.compania);
            const plan = cotizarAutoIA.planCard(codigo);
            await expect(plan).toBeVisible();
            await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");

            await cotizarAutoIA.emitirPlan(codigo, {
                formaPago: caso.formaPago,
                skipInspeccion: caso.skipInspeccion === true,
                dniCuit: caso.dniCuit,
                localidad: caso.localidad,
                mail: caso.mail ?? "cassinanico@gmail.com",
                telefono: caso.telefono ?? "3512334798",
                clientesAdicionales: caso.clientesAdicionales,
                completarRolTab: caso.completarRolTab,
            });

            await expect(
                cotizarAutoIA.emisionExitosaHeading.or(cotizarAutoIA.emisionFinal.errorEmision),
            ).toBeVisible();
            await expect(cotizarAutoIA.emisionFinal.errorEmision).not.toBeVisible();
            await cotizarAutoIA.assertNumeroEmision();
            await expect(cotizarAutoIA.anyDocumentoDescargarBtn.first()).toBeEnabled();
        });
    }
});
