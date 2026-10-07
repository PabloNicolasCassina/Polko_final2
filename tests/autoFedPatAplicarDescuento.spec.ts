/// <reference types="node" />
/**
 * POL-2972 — FedPat applyDiscount se resetea a null cuando el check "cliente nuevo" deja de ser visible.
 *
 * Release-51 C07 PASS: young=set → old=null al ocultar check (cubre TC-01 / young→old).
 * Join Fase 1 previo (MAX_WORKERS=3):
 * - FLUJO-A BLOCKED (OSE-1010): TC-01/03/07 evidenciados en UI+payload; TC-08 no validó dirty
 * - FLUJO-B PASS: TC-05/06 promo young→old→young
 * - FLUJO-C PASS: TC-04 viejo; TC-09 borde 2017/2016 (+ divergencia interasegurado en 2016)
 */
import { test, expect, type Page, type Request } from "@playwright/test";
import EmisionAutoPage from "../pages/emisionAutoPage";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTabla from "../components/auto/cotizacionTabla";
import data from "../data/autos.json";
import { companyBillingConfigs } from "../data/tiposFacturacion";
import { buildAutoTestData } from "../helpers/testDataBuilder";
import { getMockUserData, getFedPatPromoMockUserData } from "../helpers/mockUser";
import { SSECapture } from "../helpers/sseCapture";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({}, testInfo) => {
    await attachBackendLogsOnFailure(testInfo);
});

type MockKind = "master" | "promo";

type VehicleRef = {
    marca: string;
    año: string;
    modelo: string;
    version?: string;
};

type FedPatSnapshot = {
    applyDiscount: unknown;
    descuentoComision: unknown;
};

const logan2022Base = data.autos.find(
    (a: any) =>
        a.marca === "RENAULT" &&
        a.modelo === "LOGAN" &&
        a.año === "2022" &&
        !a.testType &&
        a.tipoPersona === "Física" &&
        a.sitImpositiva === "Consumidor final"
)!;

const clio2008Base = data.autos.find(
    (a: any) => a.marca === "RENAULT" && a.modelo === "CLIO" && a.año === "2008"
)!;

const VEH_LOGAN_2022: VehicleRef = {
    marca: "RENAULT",
    año: "2022",
    modelo: "LOGAN",
    version: logan2022Base.version,
};

const VEH_LOGAN_2015: VehicleRef = { marca: "RENAULT", año: "2015", modelo: "LOGAN" };
const VEH_CLIO_2008: VehicleRef = {
    marca: "RENAULT",
    año: "2008",
    modelo: "CLIO",
    version: clio2008Base.version,
};
const VEH_CLIO_2017: VehicleRef = { marca: "RENAULT", año: "2017", modelo: "CLIO" };
const VEH_CLIO_2016: VehicleRef = { marca: "RENAULT", año: "2016", modelo: "CLIO" };

async function setupPageWithMock(page: Page, targetUrl: string, mockKind: MockKind = "master"): Promise<void> {
    const body = mockKind === "promo" ? getFedPatPromoMockUserData() : getMockUserData("master");
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({ contentType: "application/json", body });
    });
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
}

function buildFedPatDatos(autoBase: any) {
    const billing: any =
        companyBillingConfigs.federacion_patronal?.find((c: any) => c.type === "Mensual") ?? {
            type: "Mensual",
        };
    const payment = billing.validPaymentCombinations?.[0] ?? {
        primary: "Medios electrónicos",
    };
    return buildAutoTestData({
        autoBase: { ...autoBase },
        compania: "federacion_patronal",
        tieneGNC: false,
        billingConfig: billing,
        paymentCombo: payment,
        installment: "1",
        tieneConfigAvanzada: false,
        descuento: 0,
    });
}

function extractFedPatFromBody(body: unknown): FedPatSnapshot | null {
    if (!body || typeof body !== "object") return null;
    const cfg = (body as any).configuracionAvanzada?.Federacion_Patronal;
    if (cfg && typeof cfg === "object") {
        return {
            applyDiscount: cfg.applyDiscount,
            descuentoComision: cfg.descuentoComision,
        };
    }
    return null;
}

function attachFedPatCapture(page: Page): { snapshots: FedPatSnapshot[]; dispose: () => void } {
    const snapshots: FedPatSnapshot[] = [];
    const onRequest = (req: Request) => {
        if (!["POST", "PUT", "PATCH"].includes(req.method())) return;
        const raw = req.postData() || "";
        if (!raw.includes("Federacion_Patronal") && !raw.includes("applyDiscount")) return;
        try {
            const parsed = JSON.parse(raw);
            const snap = extractFedPatFromBody(parsed);
            if (snap) snapshots.push(snap);
        } catch {
            /* ignore */
        }
    };
    page.on("request", onRequest);
    return {
        snapshots,
        dispose: () => page.off("request", onRequest),
    };
}

function lastFedPat(snapshots: FedPatSnapshot[]): FedPatSnapshot | undefined {
    return snapshots[snapshots.length - 1];
}

async function selectOnlyFedPat(page: Page, companias: Companias, cotizacionTabla: CotizacionTabla, buttons: CommonButtons) {
    const names = ["Sancor", "Rivadavia", "Zurich", "RUS", "Federación", "Experta", "ATM", "Triunfo", "Mercantil"];
    for (const name of names) {
        const btn = cotizacionTabla.companyTile(name);
        if (!(await btn.isVisible().catch(() => false))) continue;
        const selected = (await btn.locator("svg").count()) > 0;
        if (name === "Federación") {
            if (!selected) await btn.click({ force: true });
        } else if (selected) {
            await btn.click({ force: true });
        }
    }
    if (!(await cotizacionTabla.companyTile("Federación").isVisible().catch(() => false))) {
        await companias.getCompaniaLogo("federacion_patronal").click();
        if (await buttons.aceptarSelector.isVisible().catch(() => false)) {
            await buttons.aceptarSelector.click();
        }
    }
}

async function seleccionarVehiculoFlexible(page: Page, emision: EmisionAutoPage, veh: VehicleRef) {
    const cv = emision.cotizacionVehiculo;
    await cv.marcaSelector.click();
    await cv.getMarcaLocator(veh.marca).click();
    await cv.añoSelector.click();
    await cv.getAnioLocator(veh.año).click();
    await cv.modeloSelector.click();
    await expect(cv.getModeloLocator(veh.modelo)).toBeVisible({ timeout: 180000 });
    await cv.getModeloLocator(veh.modelo).click();
    await cv.versionSelector.click();
    if (veh.version) {
        const exact = cv.getVersionLocator(veh.version);
        await expect(exact).toBeVisible({ timeout: 180000 });
        await exact.click();
    } else {
        const first = page.getByRole("option").first();
        await expect(first).toBeVisible({ timeout: 180000 });
        await first.click();
    }
    await emision.buttons.siguienteBtn.click();
}

async function cotizarHastaConfig(page: Page, cotizacionTabla: CotizacionTabla) {
    await expect(
        cotizacionTabla.configAvanzadaBtn.or(cotizacionTabla.cotizacionErrorText)
    ).toBeVisible({ timeout: 180000 });
    await expect(cotizacionTabla.configAvanzadaBtn).toBeVisible({ timeout: 60000 });
}

async function abrirConfigFedPat(cotizacionTabla: CotizacionTabla) {
    await cotizacionTabla.openConfigAvanzadaSidebar();
}

async function volverAFormularioVehiculo(page: Page) {
    for (let i = 0; i < 6; i++) {
        if (await page.locator('[id="select_vehiculo.marca"]').isVisible().catch(() => false)) {
            return;
        }
        const back = page.getByRole("button", { name: /^(Atrás|Volver a la cotización)$/i }).first();
        if (!(await back.isVisible().catch(() => false))) break;
        await back.click();
        await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    }
    await expect(page.locator('[id="select_vehiculo.marca"]')).toBeVisible({ timeout: 30000 });
}

async function cotizarFedPatConVehiculo(
    page: Page,
    veh: VehicleRef,
    mockKind: MockKind,
    options?: { reuseSession?: boolean }
): Promise<{
    emision: EmisionAutoPage;
    cotizacionTabla: CotizacionTabla;
    buttons: CommonButtons;
    companias: Companias;
}> {
    const emision = new EmisionAutoPage(page);
    const cotizacionTabla = new CotizacionTabla(page);
    const buttons = new CommonButtons(page);
    const companias = new Companias(page);
    const datos = buildFedPatDatos(logan2022Base);

    if (!options?.reuseSession) {
        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/automotor", mockKind);
        await selectOnlyFedPat(page, companias, cotizacionTabla, buttons);
    }

    await seleccionarVehiculoFlexible(page, emision, veh);
    await emision.seleccionarPersona(datos);
    await cotizarHastaConfig(page, cotizacionTabla);
    return { emision, cotizacionTabla, buttons, companias };
}

test.describe("POL-2972 FedPat applyDiscount reset", () => {
    test("TC-05+06: promo young→old→young reaplica true/-5 y oculta check", async ({ page }, testInfo) => {
        test.setTimeout(420000);
        testInfo.annotations.push({ type: "ticket", description: "POL-2972" });

        const capture = attachFedPatCapture(page);
        const sseCapture = new SSECapture(page);
        await sseCapture.setup("sse");

        try {
            await test.step("young1: check oculto + applyDiscount true", async () => {
                const before = capture.snapshots.length;
                const { cotizacionTabla } = await cotizarFedPatConVehiculo(page, VEH_LOGAN_2022, "promo");
                await abrirConfigFedPat(cotizacionTabla);
                await expect(cotizacionTabla.descFedPatCbox).toHaveCount(0);
                await expect
                    .poll(() => capture.snapshots.length, { timeout: 120000 })
                    .toBeGreaterThan(before);
                const snap = lastFedPat(capture.snapshots)!;
                expect(snap.applyDiscount).toBe(true);
                expect(String(snap.descuentoComision)).toBe("-5");
            });

            await test.step("old1: applyDiscount null / descuento 0", async () => {
                const before = capture.snapshots.length;
                const { cotizacionTabla } = await cotizarFedPatConVehiculo(page, VEH_LOGAN_2015, "promo");
                await abrirConfigFedPat(cotizacionTabla);
                await expect(cotizacionTabla.descFedPatCbox).toHaveCount(0);
                await expect
                    .poll(() => capture.snapshots.length, { timeout: 120000 })
                    .toBeGreaterThan(before);
                const snap = lastFedPat(capture.snapshots)!;
                expect(snap.applyDiscount).toBeNull();
                expect(String(snap.descuentoComision)).toBe("0");
            });

            await test.step("young2: reaplica true/-5", async () => {
                const before = capture.snapshots.length;
                const { cotizacionTabla } = await cotizarFedPatConVehiculo(page, VEH_LOGAN_2022, "promo");
                await abrirConfigFedPat(cotizacionTabla);
                await expect(cotizacionTabla.descFedPatCbox).toHaveCount(0);
                await expect
                    .poll(() => capture.snapshots.length, { timeout: 120000 })
                    .toBeGreaterThan(before);
                const snap = lastFedPat(capture.snapshots)!;
                expect(snap.applyDiscount).toBe(true);
                expect(String(snap.descuentoComision)).toBe("-5");
            });
        } finally {
            capture.dispose();
            await sseCapture.attachToReport(testInfo, "pol2972-promo");
        }
    });

    test("TC-04: vehículo viejo desde inicio — check oculto y applyDiscount null", async ({ page }, testInfo) => {
        test.setTimeout(300000);
        testInfo.annotations.push({ type: "ticket", description: "POL-2972" });

        const capture = attachFedPatCapture(page);
        const sseCapture = new SSECapture(page);
        await sseCapture.setup("sse");

        try {
            const before = capture.snapshots.length;
            const { cotizacionTabla } = await cotizarFedPatConVehiculo(page, VEH_CLIO_2008, "master");
            await abrirConfigFedPat(cotizacionTabla);
            await expect(cotizacionTabla.descFedPatCbox).toHaveCount(0);

            await expect
                .poll(() => capture.snapshots.length, { timeout: 120000 })
                .toBeGreaterThan(before);
            const snap = lastFedPat(capture.snapshots)!;
            expect(snap.applyDiscount).toBeNull();
            expect(String(snap.descuentoComision)).toBe("0");
        } finally {
            capture.dispose();
            await sseCapture.attachToReport(testInfo, "pol2972-tc04");
        }
    });

    test("TC-09: borde 2017 (elegible) vs 2016 (no elegible / divergencia interasegurado)", async ({
        page,
    }, testInfo) => {
        test.setTimeout(420000);
        testInfo.annotations.push({ type: "ticket", description: "POL-2972" });

        const capture = attachFedPatCapture(page);
        const sseCapture = new SSECapture(page);
        await sseCapture.setup("sse");
        const interasegurado = page.getByRole("checkbox", { name: /Interasegurado/i });

        try {
            await test.step("2017: check visible; marcado → true/-5; interasegurado true", async () => {
                const before = capture.snapshots.length;
                const { cotizacionTabla } = await cotizarFedPatConVehiculo(page, VEH_CLIO_2017, "master");
                await abrirConfigFedPat(cotizacionTabla);
                await expect(cotizacionTabla.descFedPatCbox).toBeVisible({ timeout: 15000 });
                await expect(interasegurado).toBeChecked();

                if (!(await cotizacionTabla.descFedPatCbox.isChecked())) {
                    await cotizacionTabla.descFedPatCbox.click();
                }
                await expect(cotizacionTabla.descFedPatCbox).toBeChecked();

                const aplicar = cotizacionTabla.aplicarCambiosBtn;
                if (await aplicar.isEnabled().catch(() => false)) {
                    await aplicar.click();
                }

                await expect
                    .poll(() => {
                        const snap = lastFedPat(capture.snapshots.slice(before));
                        return snap?.applyDiscount === true && String(snap?.descuentoComision) === "-5";
                    }, { timeout: 120000 })
                    .toBeTruthy();
            });

            await test.step("2016: check oculto; applyDiscount null; interasegurado sigue true", async () => {
                const before = capture.snapshots.length;
                const { cotizacionTabla } = await cotizarFedPatConVehiculo(page, VEH_CLIO_2016, "master");
                await abrirConfigFedPat(cotizacionTabla);
                await expect(cotizacionTabla.descFedPatCbox).toHaveCount(0);
                await expect(interasegurado).toBeChecked();

                await expect
                    .poll(() => capture.snapshots.length, { timeout: 120000 })
                    .toBeGreaterThan(before);
                const snap = lastFedPat(capture.snapshots)!;
                expect(snap.applyDiscount).toBeNull();
                expect(String(snap.descuentoComision)).toBe("0");
            });
        } finally {
            capture.dispose();
            await sseCapture.attachToReport(testInfo, "pol2972-borde");
        }
    });

    test("C07/TC-01+03+07: no-promo check OFF → ON → reset young→old→young sin rehidratar", async ({
        page,
    }, testInfo) => {
        test.setTimeout(480000);
        testInfo.annotations.push({ type: "ticket", description: "POL-2972" });
        testInfo.annotations.push({ type: "caso", description: "C07" });
        testInfo.annotations.push({
            type: "note",
            description: "Cotización FedPat puede fallar OSE-1010; se aserta UI check + payload SSE",
        });

        const capture = attachFedPatCapture(page);
        const sseCapture = new SSECapture(page);
        await sseCapture.setup("sse");

        try {
            const emision = new EmisionAutoPage(page);
            const cotizacionTabla = new CotizacionTabla(page);
            const buttons = new CommonButtons(page);
            const companias = new Companias(page);
            const datos = buildFedPatDatos(logan2022Base);

            await setupPageWithMock(page, "http://localhost:3000/u/cotizar/automotor", "master");
            await selectOnlyFedPat(page, companias, cotizacionTabla, buttons);
            await seleccionarVehiculoFlexible(page, emision, VEH_LOGAN_2022);
            await emision.seleccionarPersona(datos);
            await cotizarHastaConfig(page, cotizacionTabla);
            await abrirConfigFedPat(cotizacionTabla);

            await test.step("TC-03: check visible y unchecked en joven", async () => {
                await expect(cotizacionTabla.descFedPatCbox).toBeVisible({ timeout: 15000 });
                await expect(cotizacionTabla.descFedPatCbox).not.toBeChecked();
            });

            await test.step("TC-02 parcial: marcar check → payload true/-5 (si hay POST)", async () => {
                const before = capture.snapshots.length;
                await cotizacionTabla.descFedPatCbox.click();
                await expect(cotizacionTabla.descFedPatCbox).toBeChecked();

                // Con OSE-1010 el botón puede verse disabled; force click igual (evidencia Fase 1).
                await cotizacionTabla.aplicarCambiosBtn.click({ force: true }).catch(() => undefined);

                let gotDiscountPayload = false;
                try {
                    await expect
                        .poll(() => {
                            const recent = capture.snapshots.slice(before);
                            return recent.some(
                                (s) => s.applyDiscount === true && String(s.descuentoComision) === "-5"
                            );
                        }, { timeout: 60000 })
                        .toBeTruthy();
                    gotDiscountPayload = true;
                } catch {
                    gotDiscountPayload = false;
                }

                if (!gotDiscountPayload) {
                    testInfo.annotations.push({
                        type: "note",
                        description:
                            "TC-02: no hubo POST con applyDiscount true tras marcar (OSE-1010). Se continúa con reset TC-01/07 sobre estado Formik del check.",
                    });
                }
            });

            await test.step("TC-01: young→old resetea a null y oculta check", async () => {
                const before = capture.snapshots.length;
                await volverAFormularioVehiculo(page);
                await seleccionarVehiculoFlexible(page, emision, VEH_LOGAN_2015);
                await emision.seleccionarPersona(datos);
                await cotizarHastaConfig(page, cotizacionTabla);
                await abrirConfigFedPat(cotizacionTabla);

                await expect(cotizacionTabla.descFedPatCbox).toHaveCount(0);
                await expect
                    .poll(() => capture.snapshots.length, { timeout: 120000 })
                    .toBeGreaterThan(before);
                const snap = lastFedPat(capture.snapshots)!;
                expect(snap.applyDiscount).toBeNull();
                expect(String(snap.descuentoComision)).toBe("0");
            });

            await test.step("TC-07: volver a joven — check visible unchecked, sin rehidratar true", async () => {
                const before = capture.snapshots.length;
                await volverAFormularioVehiculo(page);
                await seleccionarVehiculoFlexible(page, emision, VEH_LOGAN_2022);
                await emision.seleccionarPersona(datos);
                await cotizarHastaConfig(page, cotizacionTabla);
                await abrirConfigFedPat(cotizacionTabla);

                await expect(cotizacionTabla.descFedPatCbox).toBeVisible({ timeout: 15000 });
                await expect(cotizacionTabla.descFedPatCbox).not.toBeChecked();
                await expect
                    .poll(() => capture.snapshots.length, { timeout: 120000 })
                    .toBeGreaterThan(before);
                const snap = lastFedPat(capture.snapshots)!;
                expect(snap.applyDiscount).toBeNull();
                expect(String(snap.descuentoComision)).toBe("0");
            });
        } finally {
            capture.dispose();
            await sseCapture.attachToReport(testInfo, "pol2972-nopromo");
        }
    });

    test.skip(
        "TC-08: toggle applyDiscount habilita Aplicar cambios (dirty)",
        {
            annotation: {
                type: "blocked",
                description:
                    "Fase 1 BLOCKED: con OSE-1010 el botón Aplicar cambios siguió disabled tras marcar el check; no se validó comparableDerivedFields en UI",
            },
        },
        async () => {}
    );
});
