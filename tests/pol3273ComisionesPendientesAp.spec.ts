/// <reference types="node" />
import { test, expect, type Page, type Request } from "@playwright/test";
import path from "path";
import AdminComisionesPendientesPage from "../pages/adminComisionesPendientesPage";
import BilleteraPage from "../pages/billeteraPage";
import CotizarAPIAPage, { PRODUCTOS_AP } from "../pages/cotizarAPIAPage";
import { COTIZACION_ROLES_BASE, CUIT_ASEGURADO, CUIT_TOMADOR_FISICA } from "../data/apRoles";
import { adminDisponible, conAdminSession, type AdminSession } from "../helpers/adminApp";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import {
    comisionPendienteMock,
    esAprobarComision,
    esLiquidablePorFecha,
    esListadoComisiones,
    fechaHaceDias,
    formatMoney,
    idAuthDeStorageState,
    idsEmisiones,
    mockComisionesPendientes,
    totalComisiones,
    DIAS_LIQUIDEZ_BILLETERA,
    EMPTY_VALUE,
    MSG_404_BACK,
    type ComisionPendienteAP,
    type InfoComisionesBilletera,
} from "../helpers/comisionesPendientes";

/**
 * POL-3273 — Admin: tablero de comisiones pendientes AP (billetera). Back: POL-3256.
 *
 * AP en Success pagadas con CBU / EF / TD nacen con `comision_available: false`; operaciones las
 * aprueba en admin (`PATCH /comisiones-pendientes/:id`) y recién ahí la billetera puede liquidarlas.
 * Las de TC se habilitan solas al pasar a Success y no aparecen en el tablero.
 *
 * Billetera (`general_api` infoAllComisiones): una emisión pasa a "Incentivos Disponibles" solo si
 * `comision_available` es true Y su vigencia arrancó hace ≥ 15 días. Una AP recién emitida y aprobada
 * sigue en "Pendientes" hasta cumplir los 15 días.
 *
 * Requisitos: frontend_general en :3000, backends en :8080/:8082, `npm run auth:admin` (build de admin
 * de la rama del ticket + .auth/userAdmin.json) y `.auth/userPre.json`. El polkista de la billetera es el
 * usuario de userPre: solo se aprueban comisiones de ese usuario.
 *
 *   npx playwright test tests/pol3273ComisionesPendientesAp.spec.ts --project=chromium
 *   npx playwright test tests/pol3273ComisionesPendientesAp.spec.ts --project=chromium -g "@readonly"
 *
 * `@readonly` = no modifica datos (lectura real o mocks). `@e2e` emite AP reales y aprueba comisiones en pre.
 */
test.describe.configure({ mode: "parallel" });

const ADMIN = adminDisponible();
const ID_AUTH_POLKISTA = idAuthDeStorageState(path.join(__dirname, "..", ".auth", "userPre.json"));
const CBU_PRUEBA = "0113941911100007976873";
const MEDIOS_HABILITABLES = ["CBU", "EF", "TD"];
const MSG_404_MOCK = "No se encontró una emisión AP en Success con comisión pendiente para _id: mock.";

test.afterEach(async ({ page }, testInfo) => {
    await attachBackendLogsOnFailure(testInfo, page);
});

async function abrirTablero(admin: AdminSession, page: Page = admin.page): Promise<AdminComisionesPendientesPage> {
    const tablero = new AdminComisionesPendientesPage(page);
    await tablero.goto();
    return tablero;
}

async function marcarSinRecarga(page: Page): Promise<void> {
    await page.evaluate(() => {
        (window as any).__pol3273SinRecarga = true;
    });
}

async function sigueSinRecargar(page: Page): Promise<boolean> {
    return page.evaluate(() => (window as any).__pol3273SinRecarga === true);
}

function contarRequests(page: Page, predicate: (r: Request) => boolean): { total: () => number } {
    let total = 0;
    page.on("request", (r) => {
        if (predicate(r)) total += 1;
    });
    return { total: () => total };
}

/** Las tarjetas "Incentivos Pendientes" / "Disponibles" muestran la suma de lo que devolvió el back. */
async function assertTarjetasBilletera(billetera: BilleteraPage, info: InfoComisionesBilletera): Promise<{ pendiente: number; disponible: number }> {
    const pendiente = totalComisiones(info.pendientes.emisiones) + totalComisiones(info.pendientes.otros_incentivos);
    const disponible = totalComisiones(info.liquidas.emisiones) + totalComisiones(info.liquidas.otros_incentivos);
    await expect
        .poll(() => billetera.saldoSection.getSaldoPendiente(), { message: "Tarjeta Incentivos Pendientes" })
        .toBeCloseTo(pendiente, 0);
    await expect
        .poll(() => billetera.saldoSection.getSaldoDisponible(), { message: "Tarjeta Incentivos Disponibles" })
        .toBeCloseTo(disponible, 0);
    return { pendiente, disponible };
}

interface EmisionApCreada {
    idEmision: string;
    numeroPoliza: string;
    comisionEnviada: number;
}

/** Emite AP OCASION DE TRABAJO / Intermedio "+30 días" con el usuario de userPre y devuelve el `_id` de la emisión. */
async function emitirApConPolkista(page: Page, formaPago: "Efectivo" | "Débito por CBU" | "Tarjeta de crédito"): Promise<EmisionApCreada> {
    await page.route("**/newGetDatosUsuario*", (route) => route.fulfill({ contentType: "application/json", body: mockUserDataString }));
    const altaCertificados = page.waitForRequest(
        (r) => r.method() === "POST" && r.url().includes("/accidentes-personales/") && r.url().includes("alta-certificados"),
        { timeout: 600000 },
    );
    altaCertificados.catch(() => {});

    const cotizarAP = new CotizarAPIAPage(page);
    await cotizarAP.goto();
    await cotizarAP.cotizarAP(COTIZACION_ROLES_BASE);
    await cotizarAP.esperarPlan(PRODUCTOS_AP.ocasion, "Intermedio");
    await cotizarAP.emitirPlan(PRODUCTOS_AP.ocasion, "Intermedio", {
        formaPago,
        cbu: CBU_PRUEBA,
        tomador: CUIT_TOMADOR_FISICA,
        asegurados: [CUIT_ASEGURADO],
    });
    const numeroPoliza = await cotizarAP.assertEmisionExitosa();
    const body = (await altaCertificados).postDataJSON();
    expect(body?.issueIdPolko, "alta-certificados sin issueIdPolko").toBeTruthy();
    const emision = {
        idEmision: String(body.issueIdPolko),
        numeroPoliza,
        comisionEnviada: Number(body?.parametrosAdicionales?.comision ?? 0),
    };
    await test.info().attach(`emision-ap-${formaPago}`, { body: JSON.stringify(emision, null, 2), contentType: "application/json" });
    return emision;
}

// ---------------------------------------------------------------------------
// Tablero con datos reales (sin aprobar nada)
// ---------------------------------------------------------------------------

test.describe("POL-3273 Comisiones pendientes AP — tablero (datos reales) @readonly", { annotation: { type: "issue", description: "POL-3273" } }, () => {
    test.skip(!ADMIN.ok, `Admin no disponible: ${ADMIN.motivo} (correr npm run auth:admin)`);

    test("CT-01 — El menú lateral lleva al tablero", async () => {
        await conAdminSession(async (admin) => {
            const tablero = new AdminComisionesPendientesPage(admin.page);
            const emisiones = await tablero.irDesdeMenu();
            if (emisiones.length > 0) {
                const texto = emisiones.length === 1 ? "1 comisión pendiente" : `${emisiones.length} comisiones pendientes`;
                await expect(tablero.ui.contador).toHaveText(texto);
            }
        });
    });

    test("CT-03 — La tabla lista exactamente lo que devuelve el GET, en el mismo orden", async () => {
        await conAdminSession(async (admin) => {
            const tablero = await abrirTablero(admin);
            const emisiones = tablero.emisiones;
            test.skip(emisiones.length === 0, "No hay comisiones pendientes en pre para comparar");

            await expect(tablero.ui.encabezados).toHaveText([
                "Compañía / Producto", "Nº póliza", "Tomador", "Polkista", "Medio de pago", "Vigencia", "Prima", "Comisión", "",
            ]);
            const polizasUi = await tablero.ui.filas.locator("td:nth-child(2)").allInnerTexts();
            expect(polizasUi.map((p) => p.trim())).toEqual(emisiones.map((e) => e.numeroPoliza || EMPTY_VALUE));

            const fechas = emisiones.map((e) => e.created_at ?? "");
            const asc = fechas.every((f, i) => i === 0 || fechas[i - 1] <= f);
            const desc = fechas.every((f, i) => i === 0 || fechas[i - 1] >= f);
            test.info().annotations.push({
                type: "orden-back",
                description: asc ? "created_at ascendente (lo que pide el ticket)" : desc ? "created_at DESCENDENTE (el ticket pide ascendente)" : "sin orden por created_at",
            });
        });
    });

    test("CT-04 — Cada columna muestra el dato del GET con su formato", async () => {
        await conAdminSession(async (admin) => {
            const tablero = await abrirTablero(admin);
            test.skip(tablero.emisiones.length === 0, "No hay comisiones pendientes en pre para comparar");
            for (const [index, emision] of tablero.emisiones.slice(0, 10).entries()) {
                await test.step(`Fila ${index + 1}: póliza ${emision.numeroPoliza}`, async () => {
                    await tablero.assertFilaCoincide(tablero.ui.filas.nth(index), emision);
                });
            }
        });
    });

    test("CT-11 — Solo AP en Success, con comisión pendiente y pagadas con CBU/EF/TD (nunca TC)", async () => {
        await conAdminSession(async (admin) => {
            const tablero = await abrirTablero(admin);
            for (const emision of tablero.emisiones) {
                expect.soft(emision.estado, `${emision._id}: estado`).toBe("Success");
                expect.soft(emision.comision_available, `${emision._id}: comision_available`).toBe(false);
                expect.soft(MEDIOS_HABILITABLES, `${emision._id}: medio de pago ${emision.infodePago?.formadePago}`).toContain(
                    emision.infodePago?.formadePago,
                );
            }
            await expect(tablero.ui.tabla.getByRole("cell", { name: "Tarjeta de crédito", exact: true })).toHaveCount(0);
        });
    });

    test("CT-06 — Copiar idAuth deja el idAuth exacto en el portapapeles", async () => {
        await conAdminSession(async (admin) => {
            await admin.context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:3000" });
            const tablero = await abrirTablero(admin);
            const index = tablero.emisiones.findIndex((e) => !!e.idAuth);
            test.skip(index < 0, "Ninguna comisión pendiente tiene idAuth");

            const fila = tablero.ui.filas.nth(index);
            await tablero.ui.copiarIdAuthBtn(fila).click();
            await expect(admin.page.getByRole("tooltip", { name: "Copiado" })).toBeVisible();
            expect(await admin.page.evaluate(() => navigator.clipboard.readText())).toBe(tablero.emisiones[index].idAuth);
        });
    });

    test("CT-12 — Cancelar la confirmación no llama al PATCH y la fila queda", async () => {
        await conAdminSession(async (admin) => {
            const tablero = await abrirTablero(admin);
            test.skip(tablero.emisiones.length === 0, "No hay comisiones pendientes en pre");
            const patches = contarRequests(admin.page, esAprobarComision());
            const emision = tablero.emisiones[0];
            const fila = await tablero.fila(emision._id);

            await tablero.abrirConfirmacion(fila);
            await expect(tablero.ui.modal).toContainText(`póliza ${emision.numeroPoliza}`);
            await expect(tablero.ui.modal).toContainText(`La comisión de ${formatMoney(emision.comision)} pasa a la billetera del polkista.`);
            await expect(tablero.ui.modal).toContainText("Esta acción no se puede deshacer.");
            await tablero.ui.modalCancelarBtn.click();
            await expect(tablero.ui.modal).toBeHidden();

            await tablero.abrirConfirmacion(fila);
            await admin.page.keyboard.press("Escape");
            await expect(tablero.ui.modal).toBeHidden();

            await expect(tablero.ui.filas).toHaveCount(tablero.emisiones.length);
            expect(patches.total(), "Cancelar no debe disparar el PATCH").toBe(0);
        });
    });
});

// ---------------------------------------------------------------------------
// Estados y errores (GET/PATCH mockeados: no tocan datos)
// ---------------------------------------------------------------------------

test.describe("POL-3273 Comisiones pendientes AP — estados y errores (mock) @readonly", { annotation: { type: "issue", description: "POL-3273" } }, () => {
    test.skip(!ADMIN.ok, `Admin no disponible: ${ADMIN.motivo} (correr npm run auth:admin)`);

    test("CT-05 — Tomador, póliza, polkista o medio de pago en null se muestran como '—'", async () => {
        await conAdminSession(async (admin) => {
            const vacia = comisionPendienteMock({
                numeroPoliza: null,
                idAuth: null,
                client: { name: null, surname: null, dni: null, cuit: null },
                infodePago: null,
                premium: null,
                vigenciaDesde: null,
                vigenciaHasta: null,
            });
            const sinClient = comisionPendienteMock({ client: null });
            const soloCuit = comisionPendienteMock({ client: { name: null, surname: "ACME SA", dni: null, cuit: "30709938734" } });
            await mockComisionesPendientes(admin.page, { listado: [vacia, sinClient, soloCuit] });
            const tablero = await abrirTablero(admin);

            const filaVacia = tablero.ui.filas.nth(0);
            for (const index of [1, 2, 3, 4, 5, 6]) {
                await expect(tablero.ui.celda(filaVacia, index)).toHaveText(EMPTY_VALUE);
            }
            await expect(tablero.ui.aprobarBtn(filaVacia)).toHaveAccessibleName("Aprobar comisión de la emisión sin número de póliza");
            await expect(tablero.ui.celda(tablero.ui.filas.nth(1), 2)).toHaveText(EMPTY_VALUE);
            await expect(tablero.ui.celda(tablero.ui.filas.nth(2), 2)).toContainText("ACME SA");
            await expect(tablero.ui.celda(tablero.ui.filas.nth(2), 2)).toContainText("CUIT 30709938734");
            await expect(tablero.ui.tabla).not.toContainText(/null|undefined|NaN/);
        });
    });

    test("CT-15 — Un 404 muestra el error del back, recarga la lista y no rompe la pantalla", async () => {
        await conAdminSession(async (admin) => {
            const [yaHabilitada, otra] = [comisionPendienteMock(), comisionPendienteMock()];
            const mock = await mockComisionesPendientes(admin.page, {
                listado: [yaHabilitada, otra],
                aprobar: { status: 404, body: { error: MSG_404_MOCK } },
            });
            const tablero = await abrirTablero(admin);
            mock.setListado([otra]);

            const recarga = admin.page.waitForResponse(esListadoComisiones);
            await tablero.abrirConfirmacion(await tablero.fila(yaHabilitada._id));
            const patch = await tablero.confirmarAprobacion(yaHabilitada._id);
            expect(patch.status()).toBe(404);
            await recarga;

            await expect(tablero.ui.notificacionNoPendiente).toBeVisible();
            await expect(tablero.ui.notificacionNoPendiente).toContainText(MSG_404_MOCK);
            await expect(tablero.ui.filas).toHaveCount(1);
            await expect(tablero.ui.filaPorPoliza(otra.numeroPoliza!)).toBeVisible();
            await expect(tablero.ui.heading).toBeVisible();
            expect(mock.gets).toBe(2);
        });
    });

    test("CT-15b — Un 404 sin mensaje del back muestra el texto por defecto", async () => {
        await conAdminSession(async (admin) => {
            const emision = comisionPendienteMock();
            await mockComisionesPendientes(admin.page, { listado: [emision], aprobar: { status: 404, body: {} } });
            const tablero = await abrirTablero(admin);

            const patch = await tablero.aprobar(emision._id);
            expect(patch.status()).toBe(404);
            await expect(tablero.ui.notificacionNoPendiente).toContainText("La comisión ya fue habilitada o la emisión cambió de estado.");
            await expect(tablero.ui.notificacionNoPendiente).not.toContainText(/status code|Request failed/i);
        });
    });

    test("CT-16 — Mientras aprueba no se puede volver a disparar ni cerrar el modal", async () => {
        await conAdminSession(async (admin) => {
            const emision = comisionPendienteMock();
            const mock = await mockComisionesPendientes(admin.page, { listado: [emision], aprobar: { status: 200, delayMs: 3000 } });
            const tablero = await abrirTablero(admin);

            await tablero.abrirConfirmacion(await tablero.fila(emision._id));
            await tablero.ui.modalAprobarBtn.click();
            await tablero.ui.modalAprobarBtn.click({ force: true }).catch(() => {});
            await admin.page.keyboard.press("Escape");
            await expect(tablero.ui.modal).toBeVisible();
            await expect(tablero.ui.modalCancelarBtn).toBeDisabled();

            await expect(tablero.ui.modal).toBeHidden({ timeout: 15000 });
            await expect(tablero.ui.notificacionAprobada).toBeVisible();
            expect(mock.patches, "Debe salir un solo PATCH").toEqual([emision._id]);
        });
    });

    test("CT-17 — Aprobar la última fila muestra el estado vacío sin recargar", async () => {
        await conAdminSession(async (admin) => {
            const emision = comisionPendienteMock();
            const mock = await mockComisionesPendientes(admin.page, { listado: [emision] });
            const tablero = await abrirTablero(admin);
            await marcarSinRecarga(admin.page);

            const patch = await tablero.aprobar(emision._id);
            expect(patch.ok()).toBe(true);
            await expect(tablero.ui.vacio).toBeVisible();
            await expect(tablero.ui.tabla).toHaveCount(0);
            await expect(tablero.ui.contador).toHaveCount(0);
            expect(await sigueSinRecargar(admin.page), "La página se recargó").toBe(true);
            expect(mock.gets, "No debe volver a pedir el listado").toBe(1);
        });
    });

    test("CT-18 — Mientras carga muestra el loader y deshabilita Actualizar", async () => {
        await conAdminSession(async (admin) => {
            await mockComisionesPendientes(admin.page, { listado: [comisionPendienteMock()], listadoDelayMs: 4000 });
            const tablero = new AdminComisionesPendientesPage(admin.page);
            await admin.page.goto(tablero.ui.url);
            await expect(tablero.ui.cargando).toBeVisible();
            await expect(tablero.ui.actualizarBtn).toBeDisabled();
            await expect(tablero.ui.filas).toHaveCount(1, { timeout: 15000 });
            await expect(tablero.ui.actualizarBtn).toBeEnabled();
        });
    });

    test("CT-19 — Si el GET falla muestra el error y Reintentar recupera la lista", async () => {
        await conAdminSession(async (admin) => {
            const emision = comisionPendienteMock();
            const mock = await mockComisionesPendientes(admin.page, { listado: [emision], listadoStatus: 500 });
            const tablero = new AdminComisionesPendientesPage(admin.page);
            await admin.page.goto(tablero.ui.url);

            await expect(tablero.ui.errorListado).toBeVisible({ timeout: 30000 });
            await expect(tablero.ui.errorListado).toContainText("No se pudieron cargar las comisiones pendientes.");
            await expect(tablero.ui.tabla).toHaveCount(0);

            mock.setListadoStatus(200);
            await tablero.ui.reintentarBtn.click();
            await expect(tablero.ui.filas).toHaveCount(1);
            await expect(tablero.ui.errorListado).toHaveCount(0);
        });
    });

    test("CT-19b — Si el GET responde 401 muestra el mensaje del back (no el genérico)", async () => {
        await conAdminSession(async (admin) => {
            const mensaje = "The token provided is invalid or expired";
            await mockComisionesPendientes(admin.page, { listadoStatus: 401, listadoErrorBody: { error: mensaje } });
            const tablero = new AdminComisionesPendientesPage(admin.page);
            await admin.page.goto(tablero.ui.url);

            await expect(tablero.ui.errorListado).toBeVisible({ timeout: 30000 });
            await expect(tablero.ui.errorListado).toContainText(mensaje);
            await expect(tablero.ui.errorListado).not.toContainText("No se pudieron cargar las comisiones pendientes.");
            await expect(tablero.ui.reintentarBtn).toBeEnabled();
        });
    });

    test("CT-22 — Contador en singular y Actualizar trae las filas nuevas", async () => {
        await conAdminSession(async (admin) => {
            const [primera, nueva] = [comisionPendienteMock(), comisionPendienteMock()];
            const mock = await mockComisionesPendientes(admin.page, { listado: [primera] });
            const tablero = await abrirTablero(admin);
            await expect(tablero.ui.contador).toHaveText("1 comisión pendiente");

            mock.setListado([nueva, primera]);
            await tablero.actualizar();
            await expect(tablero.ui.contador).toHaveText("2 comisiones pendientes");
            await expect(tablero.ui.celda(tablero.ui.filas.nth(0), 1)).toHaveText(nueva.numeroPoliza!);
            await expect(tablero.ui.celda(tablero.ui.filas.nth(1), 1)).toHaveText(primera.numeroPoliza!);
            expect(mock.gets).toBe(2);
        });
    });

    test("CT-20 — Si el PATCH falla con 500 avisa en rojo y la fila queda", async () => {
        await conAdminSession(async (admin) => {
            const emision = comisionPendienteMock();
            const mock = await mockComisionesPendientes(admin.page, {
                listado: [emision],
                aprobar: { status: 500, body: { detail: "Internal Server Error" } },
            });
            const tablero = await abrirTablero(admin);

            const patch = await tablero.aprobar(emision._id);
            expect(patch.status()).toBe(500);
            await expect(tablero.ui.notificacionError).toBeVisible();
            await expect(tablero.ui.notificacionError).toContainText("Intentá de nuevo en unos minutos.");
            await expect(tablero.ui.filas).toHaveCount(1);
            expect(mock.gets).toBe(1);
        });
    });
});

// ---------------------------------------------------------------------------
// De punta a punta: emisión real → tablero → aprobación → billetera
// ---------------------------------------------------------------------------

test.describe("POL-3273 Comisiones pendientes AP — emisión → admin → billetera @e2e", { annotation: { type: "issue", description: "POL-3273" } }, () => {
    test.skip(!ADMIN.ok, `Admin no disponible: ${ADMIN.motivo} (correr npm run auth:admin)`);
    test.skip(({ browserName, isMobile }) => browserName !== "chromium" || !!isMobile, "Flujo e2e solo en desktop chromium con userPre");

    for (const formaPago of ["Efectivo", "Débito por CBU"] as const) {
        test(`CT-08/13/14/15 — AP pagada con ${formaPago}: aparece, se aprueba y la billetera la respeta`, async ({ page }) => {
            test.setTimeout(900000);
            const billetera = new BilleteraPage(page);

            const creada = await test.step("1- Emitir AP con el polkista de userPre", () => emitirApConPolkista(page, formaPago));

            const antes = await test.step("2- Billetera antes de aprobar: la comisión está pendiente", async () => {
                const info = await billetera.cargarComisiones();
                expect(idsEmisiones(info.pendientes.emisiones), "La AP recién emitida no está en Incentivos Pendientes").toContain(creada.idEmision);
                expect(idsEmisiones(info.liquidas.emisiones)).not.toContain(creada.idEmision);
                await assertTarjetasBilletera(billetera, info);
                return info;
            });

            await conAdminSession(async (admin) => {
                const tablero = await test.step("3- Admin: la emisión aparece con sus datos", async () => {
                    const t = await abrirTablero(admin);
                    const emision = t.emisiones.find((e) => e._id === creada.idEmision) as ComisionPendienteAP;
                    expect(emision, `La AP ${creada.idEmision} (${formaPago}) no está en el tablero`).toBeTruthy();
                    expect(emision.idAuth).toBe(ID_AUTH_POLKISTA);
                    expect(emision.comision_available).toBe(false);
                    expect(emision.infodePago?.formadePago).toBe(formaPago === "Efectivo" ? "EF" : "CBU");
                    const enBilletera = antes.pendientes.emisiones.find((e) => String(e.idEmision) === creada.idEmision)!;
                    expect(Number(emision.comision), "Comisión del tablero vs billetera").toBeCloseTo(Number(enBilletera.comision), 2);
                    await t.assertFilaCoincide(await t.fila(creada.idEmision), emision);
                    return t;
                });

                const otraPestania = await test.step("4- Segunda pestaña de admin con la lista ya cargada", async () =>
                    abrirTablero(admin, await admin.context.newPage()),
                );

                await test.step("5- Aprobar: PATCH con headers de admin, la fila se va sin recargar", async () => {
                    await marcarSinRecarga(admin.page);
                    const gets = contarRequests(admin.page, esListadoComisiones);
                    const fila = await tablero.fila(creada.idEmision);
                    await tablero.abrirConfirmacion(fila);
                    await expect(tablero.ui.modal).toContainText(`póliza ${tablero.emisiones[tablero.indiceDe(creada.idEmision)].numeroPoliza}`);
                    const patch = await tablero.confirmarAprobacion(creada.idEmision);

                    expect(patch.status()).toBe(200);
                    const headers = await patch.request().allHeaders();
                    expect(headers["authorization"]).toMatch(/^Bearer .+/);
                    expect(headers["x-client-type"]).toBe("admin");
                    await expect(tablero.ui.notificacionAprobada).toBeVisible();
                    await expect(tablero.ui.filas).toHaveCount(tablero.emisiones.length - 1);
                    expect(await sigueSinRecargar(admin.page), "La página se recargó").toBe(true);
                    expect(gets.total(), "Aprobar no debe volver a pedir el listado").toBe(0);
                });

                await test.step("6- La otra pestaña intenta aprobar la misma: 404 avisado y lista recargada", async () => {
                    const recarga = otraPestania.page.waitForResponse(esListadoComisiones);
                    await otraPestania.abrirConfirmacion(await otraPestania.fila(creada.idEmision));
                    const patch = await otraPestania.confirmarAprobacion(creada.idEmision);
                    expect(patch.status()).toBe(404);
                    await recarga;
                    await expect(otraPestania.ui.notificacionNoPendiente).toBeVisible();
                    await expect.soft(otraPestania.ui.notificacionNoPendiente, "Debería mostrar el error del back").toContainText(MSG_404_BACK);
                    await expect(otraPestania.ui.heading).toBeVisible();
                    await expect(otraPestania.ui.filas.filter({ hasText: creada.numeroPoliza })).toHaveCount(0);
                });

                await test.step("7- Actualizar: la emisión ya no vuelve", async () => {
                    const emisiones = await tablero.actualizar();
                    expect(emisiones.map((e) => e._id)).not.toContain(creada.idEmision);
                });
            });

            await test.step(`8- Billetera después de aprobar: sigue pendiente hasta cumplir ${DIAS_LIQUIDEZ_BILLETERA} días de vigencia`, async () => {
                const info = await billetera.cargarComisiones();
                const item = info.pendientes.emisiones.find((e) => String(e.idEmision) === creada.idEmision);
                expect(item, "La AP aprobada desapareció de la billetera").toBeTruthy();
                expect(esLiquidablePorFecha(item!.fecha), `Vigencia ${item!.fecha}: se esperaba recién emitida`).toBe(false);
                expect(idsEmisiones(info.liquidas.emisiones), "Se liquidó antes de los 15 días de vigencia").not.toContain(creada.idEmision);
                expect(item!.comision).toBe(antes.pendientes.emisiones.find((e) => String(e.idEmision) === creada.idEmision)!.comision);
                await assertTarjetasBilletera(billetera, info);
            });
        });
    }

    test("CT-09 — AP pagada con tarjeta de crédito no aparece en el tablero", async ({ page }) => {
        test.setTimeout(900000);
        const creada = await test.step("1- Emitir AP con TC", () => emitirApConPolkista(page, "Tarjeta de crédito"));
        await conAdminSession(async (admin) => {
            const tablero = await abrirTablero(admin);
            expect(tablero.emisiones.map((e) => e._id), "Una AP con TC en Success no debería quedar pendiente").not.toContain(creada.idEmision);
        });
        await test.step("2- En la billetera está en Success: no figura en el tablero porque se habilitó sola, no por quedar Pending", async () => {
            const info = await new BilleteraPage(page).cargarComisiones();
            const item = [...info.pendientes.emisiones, ...info.liquidas.emisiones].find((e) => String(e.idEmision) === creada.idEmision);
            expect(item, "La AP con TC no está en la billetera").toBeTruthy();
            expect(item!.estado, "Si no quedó en Success, que no esté en el tablero no prueba la habilitación automática").toBe("Success");
        });
    });

    test(`CT-14 — Aprobar una AP con vigencia de ${DIAS_LIQUIDEZ_BILLETERA}+ días la pasa a Incentivos Disponibles`, async ({ page }) => {
        test.setTimeout(300000);
        const billetera = new BilleteraPage(page);

        const candidata = await conAdminSession(async (admin) => {
            const tablero = await abrirTablero(admin);
            return tablero.emisiones.find((e) => e.idAuth === ID_AUTH_POLKISTA && esLiquidablePorFecha(e.vigenciaDesde));
        });
        test.skip(
            !candidata,
            `El polkista de userPre no tiene AP pendientes con vigencia ≤ ${fechaHaceDias(DIAS_LIQUIDEZ_BILLETERA)}: hace falta una emisión de hace 15+ días`,
        );

        const antes = await test.step("1- Billetera antes: la comisión está en Pendientes", async () => {
            const info = await billetera.cargarComisiones();
            expect(idsEmisiones(info.pendientes.emisiones)).toContain(candidata!._id);
            expect(idsEmisiones(info.liquidas.emisiones)).not.toContain(candidata!._id);
            return { info, tarjetas: await assertTarjetasBilletera(billetera, info) };
        });

        await test.step("2- Admin aprueba la comisión", async () => {
            await conAdminSession(async (admin) => {
                const tablero = await abrirTablero(admin);
                const patch = await tablero.aprobar(candidata!._id);
                expect(patch.status()).toBe(200);
                await expect(tablero.ui.notificacionAprobada).toBeVisible();
            });
        });

        await test.step("3- Billetera después: pasa a Incentivos Disponibles por el monto de la comisión", async () => {
            const info = await billetera.cargarComisiones();
            const item = info.liquidas.emisiones.find((e) => String(e.idEmision) === candidata!._id);
            expect(item, "La comisión aprobada no pasó a Incentivos Disponibles").toBeTruthy();
            expect(idsEmisiones(info.pendientes.emisiones)).not.toContain(candidata!._id);
            expect(item!.comision).toBeCloseTo(Number(candidata!.comision), 2);

            const tarjetas = await assertTarjetasBilletera(billetera, info);
            expect(tarjetas.disponible - antes.tarjetas.disponible, "Incentivos Disponibles debe subir en la comisión aprobada").toBeCloseTo(
                Number(candidata!.comision),
                0,
            );
        });
    });
});

// ---------------------------------------------------------------------------
// Regresión
// ---------------------------------------------------------------------------

test.describe("POL-3273 — regresión del tablero de emisiones pendientes @readonly", { annotation: { type: "issue", description: "POL-3273" } }, () => {
    test.skip(!ADMIN.ok, `Admin no disponible: ${ADMIN.motivo} (correr npm run auth:admin)`);

    test("CT-21 — Emisiones pendientes sigue cargando su listado", async () => {
        await conAdminSession(async (admin) => {
            const listado = admin.page.waitForResponse((r) => r.url().includes("/getTablaEmisiones/emisiones"), { timeout: 60000 });
            await admin.page.goto("/u/emision");
            const response = await listado;
            expect(response.ok(), `/getTablaEmisiones/emisiones respondió ${response.status()}`).toBe(true);
            await expect(admin.page.getByText("Algo salió mal", { exact: true })).toHaveCount(0);
            await expect(admin.page.getByRole("table").first()).toBeVisible({ timeout: 60000 });
        });
    });
});
