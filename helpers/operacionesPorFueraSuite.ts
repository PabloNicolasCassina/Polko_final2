import { test, expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import CotizarAutoIAPage, { PLAN_CODES_AUTO } from "../pages/cotizarAutoIAPage";
import MisSolicitudesPage from "../pages/misSolicitudesPage";
import MiCarteraPage, { TAB_EMITIDAS_POLKO } from "../pages/miCarteraPage";
import OperacionPorFuera from "../components/auto/operacionPorFuera";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import {
    NEWEMITIR_MOCK_ERROR,
    NEWEMITIR_MOCK_STATUS_CODE,
    OPF_APROBACION_TIMEOUT_MS,
    OPF_BACKEND_MOCK,
    OPF_COMPANY_OPTION,
    OPF_COMPLETAR,
    OPF_LABEL_A_COMPLETAR,
    OPF_FLOW_API_OUT_STANDARD,
    OPF_LABEL_APROBADA,
    OPF_STATUS_APROBADA,
    OPF_STATUS_PENDIENTE,
    OPF_STATUS_PENDIENTE_EMISION,
    OPF_FASE1_TIMEOUT_MS,
    OPF_POLL_INTERVAL_MS,
    OPF_STATUS_CANCELADA,
    OPF_STATUS_COTIZADA,
    borrarOpfPendiente,
    esperarFase1,
    extractOpfListItems,
    guardarOpfPendiente,
    isBlank,
    isOpfCreateResponse,
    isOpfListResponse,
    isOpfPatchResponse,
    leerOpfPendiente,
    mockNewemitirError,
    mockOpfCreateIfEnabled,
    redactCodigos,
} from "../helpers/opfMocks";
import {
    COMPANY_ENUM_POR_LABEL,
    FORMA_PAGO_POR_COMPANIA,
    PLAN_POR_COMPANIA,
    SKIP_INSPECCION,
} from "../data/autoEmisionPorCompania";

/**
 * POL-3076 — Operaciones por fuera (OPF) para todas las aseguradoras de automotor.
 *
 * Flujo `apiCatalog` (post-error): se cotiza y completa el asistente igual que
 * autoHappyPath, pero `/newemitir` se mockea con error de la aseguradora. Desde
 * EmissionFailure se solicita la emisión a Operaciones y se valida el payload del
 * POST `/emision/operaciones-por-fuera`, el popup de éxito y Mis Solicitudes.
 *
 * Flujo `catalogExtra` (fuera de pauta): "¿Necesitás una cobertura diferente? Ver más" →
 * "Solicitar" en la primera cobertura → cliente → inspección (si aplica) → "Solicitar
 * cotización". Sin `/newemitir`; la OPF va sin premio y nace en estado "Pendiente".
 *
 * El POST de OPF va contra microservice_products real (crea la operación y notifica
 * por Discord). Con `OPF_MOCK=1` se mockea y se saltea Mis Solicitudes:
 *   npx playwright test tests/autoOperacionesPorFuera.spec.ts --project=chromium
 *   OPF_MOCK=1 npx playwright test tests/autoOperacionesPorFuera.spec.ts --project=chromium
 *
 * Fase 2 fuera de pauta (`OPF_COMPLETAR=1`, backend real), todo en una corrida:
 *   OPF_COMPLETAR=1 npx playwright test tests/autoOperacionesPorFuera.spec.ts --project=chromium
 * La fase 1 deja el ID de cada compañía en `.opf-pendientes/` y por consola. Cada test de
 * completar espera su fase 1, refresca Mis Solicitudes cada `OPF_POLL_INTERVAL_SEG` (15) hasta
 * verla "A completar" (máx. `OPF_APROBACION_TIMEOUT_MIN`, 30) y descarga el PDF + solicita la
 * emisión (PATCH a Pendiente de emisión). Después espera que la emitan en admin (refrescando
 * Mis Solicitudes hasta "Aprobada"), valida el ID y "Ver póliza en Mi Cartera" → la póliza está
 * en Mi Cartera (por id de emisión y buscando la patente). Con `-g "completar solicitud"` retoma
 * las que hayan quedado de una corrida anterior (si ya se completó, salta directo a la emisión).
 */

const VEHICULO = {
    marca: "RENAULT",
    año: "2022",
    modelo: "LOGAN",
    version: "LOGAN II 1.6 16V INTENS L/19",
    c_postal: "5000",
};

/**
 * Auto viejo para el flujo fuera de pauta: con el LOGAN 2022, ATM, Triunfo y Mercantil
 * cotizan todo su catálogo y no queda nada en "Ver más"; con el CLIO 2008 sí.
 */
const VEHICULO_FUERA_DE_PAUTA = {
    marca: "RENAULT",
    año: "2008",
    modelo: "CLIO",
    version: "CLIO 2 F2 1.2 3 P. AUTHENTIQUE",
    c_postal: "5000",
};

const CUIT_DEFAULT = "27381618426";

/**
 * Cobertura cotizada fuera de pauta (`apiCatalogOutStandard`): con el CLIO 2008 Zurich devuelve D6 con
 * precio pero fuera de pauta. Usa su propio archivo en `.opf-pendientes/` para no pisar el de "Ver más".
 */
const ZURICH_OUT_STANDARD = {
    compania: "Zurich",
    pendienteKey: "Zurich_apiOutStandard",
    codigo: "D6",
    nombre: "Todo Riesgo Franquicia Variable 6%",
};

/** Catálogo de coberturas que alimenta "Ver más" (todas menos las que devolvió la cotización). */
const DETALLES_COBERTURAS_AUTOS_PATH = "/detallesCoberturas/autos";

/** Claves que arma el front por compañía (companyOmitBlankParametros / buildEmitParametrosAdicionales). */
const PARAMETROS_REQUERIDOS_FRONT: Record<string, string[]> = {
    Federacion_Patronal: ["tipoVehiculo", "applyDiscount"],
    ATM: ["nombreLocalidadATM"],
    Triunfo: ["nro_cotizacion", "codigo_productor"],
    Mercantil_Andina: ["medio_pago", "codigoLocalidadMercantilAndina"],
};

/** Claves que `saveEmision` exige al pasar a Emitida (contrato ops_por_fuera_fe_contracts.md, pitfall 1). */
const PARAMETROS_REQUERIDOS_SAVE_EMISION: Record<string, string[]> = {
    Sancor: ["codSancorLocalidad", "vigencia"],
    Zurich: ["codZurichLocalidad"],
    RUS: ["codigoRC"],
};

async function applyUserMock(page: Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

export interface OpcionesSuiteOperacionesPorFuera {
    /** Prefijo de los archivos de `.opf-pendientes/`: dos specs que registran la suite en la misma corrida no se pisan. */
    prefijoPendientes?: string;
    /** En false si el spec ya adjunta los logs del backend en un `afterEach` global. */
    adjuntarLogsBackend?: boolean;
}

/**
 * Registra los describes de OPF en el spec que la llama. La fase 2/3 queda al final a propósito
 * (ver comentario del describe "completar solicitud").
 */
export function registrarSuiteOperacionesPorFuera(opciones: OpcionesSuiteOperacionesPorFuera = {}): void {
    const { prefijoPendientes, adjuntarLogsBackend = true } = opciones;
    const clave = (key: string) => (prefijoPendientes ? `${prefijoPendientes}_${key}` : key);

    test.describe("Auto - Operaciones por fuera post-error de emisión @regression", () => {
        test.afterEach(async ({}, testInfo) => {
            if (adjuntarLogsBackend) await attachBackendLogsOnFailure(testInfo);
        });

        for (const [compania, nombrePlan] of Object.entries(PLAN_POR_COMPANIA)) {
            const codigo = PLAN_CODES_AUTO[compania][nombrePlan];
            const companyEnum = COMPANY_ENUM_POR_LABEL[compania];

            test(`${compania}: error al emitir "${nombrePlan}" (${codigo}) → solicitar emisión a Operaciones`, async ({
                page,
            }, testInfo) => {
                test.setTimeout(180000);
                const formaPago = FORMA_PAGO_POR_COMPANIA[compania] ?? "Efectivo";

                await documentarCaso({
                    epic: "Auto",
                    feature: "Operaciones por fuera",
                    story: "Post-error de emisión (apiCatalog)",
                    severidad: "critical",
                    prioridad: "high",
                    tickets: ["POL-3076", "POL-3083", "POL-3085"],
                    descripcion:
                        `Cotiza un ${VEHICULO.marca} ${VEHICULO.modelo} ${VEHICULO.año}, selecciona ${compania} y emite el plan ` +
                        `"${nombrePlan}" (${codigo}) con ${formaPago}. La emisión devuelve error de la aseguradora (mock) y ` +
                        "desde la pantalla de error se solicita la emisión a Operaciones. Espera el popup de éxito con ID de " +
                        "solicitud, payload OPF con la compañía y el flujo, y la solicitud en Mis Solicitudes ordenada por actualización.",
                    precondiciones:
                        "Usuario logueado (storageState del project), datos de usuario mockeados con compañías habilitadas, " +
                        "frontend en localhost:3000, general_api y microservice_products levantados. " +
                        `/newemitir mockeado con error ${NEWEMITIR_MOCK_STATUS_CODE}.` +
                        (OPF_BACKEND_MOCK ? " POST de OPF mockeado (OPF_MOCK=1)." : ""),
                    parametros: {
                        Compañía: compania,
                        Plan: `${nombrePlan} (${codigo})`,
                        "Forma de pago": formaPago,
                        "Backend OPF": OPF_BACKEND_MOCK ? "mock" : "real",
                    },
                    tags: ["auto", "operaciones-por-fuera", "negative-path", "regression"],
                });

                await applyUserMock(page);
                const newemitirCapture = await mockNewemitirError(page);
                await mockOpfCreateIfEnabled(page);

                const cotizarAutoIA = new CotizarAutoIAPage(page);
                const opf = new OperacionPorFuera(page);

                await test.step("Ingresar al cotizador de Auto IA", async () => {
                    await cotizarAutoIA.goto();
                });

                await test.step(`Cotizar ${VEHICULO.marca} ${VEHICULO.modelo} ${VEHICULO.año} (CP ${VEHICULO.c_postal})`, async () => {
                    await cotizarAutoIA.cotizarVehiculo(VEHICULO);
                });

                await test.step(`Seleccionar ${compania} y validar que el plan ${codigo} tenga precio`, async () => {
                    await cotizarAutoIA.selectCompania(compania);
                    const plan = cotizarAutoIA.planCard(codigo);
                    await expect(plan).toBeVisible();
                    await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");
                });

                await test.step(`Emitir el plan ${codigo} con ${formaPago} (la aseguradora responde error)`, async () => {
                    await cotizarAutoIA.emitirPlan(codigo, {
                        formaPago,
                        skipInspeccion: SKIP_INSPECCION[compania] === true,
                        dniCuit: CUIT_DEFAULT,
                    });
                    await expect(cotizarAutoIA.emisionFinal.errorEmision).toBeVisible();
                    expect(newemitirCapture.body, "el asistente no llegó a llamar a /newemitir").not.toBeNull();
                });

                await test.step("La pantalla de error ofrece solicitar la emisión a Operaciones", async () => {
                    await expect(opf.failureSectionText).toBeVisible();
                    await expect(opf.solicitarEmisionBtn).toBeEnabled();
                });

                const opfResponsePromise = page.waitForResponse(isOpfCreateResponse, { timeout: 60000 });

                await test.step("Confirmar la solicitud de emisión", async () => {
                    await opf.solicitarEmisionBtn.click();
                    await expect(opf.confirmTitle).toBeVisible();
                    await opf.confirmSolicitarBtn.click();
                });

                const opfResponse = await opfResponsePromise;
                const opfPayload = opfResponse.request().postDataJSON();
                const opfResult = await opfResponse.json().catch(() => null);

                await testInfo.attach("newemitir-request.json", {
                    body: JSON.stringify(redactCodigos(newemitirCapture.body), null, 2),
                    contentType: "application/json",
                });
                await testInfo.attach("opf-request.json", {
                    body: JSON.stringify(redactCodigos(opfPayload), null, 2),
                    contentType: "application/json",
                });
                await testInfo.attach("opf-response.json", {
                    body: JSON.stringify(opfResult, null, 2),
                    contentType: "application/json",
                });

                await test.step("Validar payload de la operación por fuera", async () => {
                    const request = opfPayload?.request ?? {};
                    expect(request.product).toBe("auto");
                    expect(request.company).toBe(companyEnum);
                    expect(request.opfFlow).toBe("apiCatalog");
                    expect(opfPayload?.error?.origen).toBe("compania");
                    expect(opfPayload?.error?.mensaje).toBe(NEWEMITIR_MOCK_ERROR);
                    expect(String(opfPayload?.error?.codigo)).toBe(String(NEWEMITIR_MOCK_STATUS_CODE));

                    const params = request.parametrosAdicionales ?? {};
                    const requeridos = [
                        ...(PARAMETROS_REQUERIDOS_FRONT[companyEnum] ?? []),
                        ...(PARAMETROS_REQUERIDOS_SAVE_EMISION[companyEnum] ?? []),
                    ];
                    const vacios = requeridos.filter((key) => isBlank(params[key]));
                    if (vacios.length > 0) {
                        testInfo.annotations.push({
                            type: "warning",
                            description: `parametrosAdicionales sin valor (pueden romper el pase a Emitida): ${vacios.join(", ")}`,
                        });
                    }

                    const emitParams = newemitirCapture.body?.parametrosAdicionales ?? {};
                    const faltantes = Object.keys(emitParams).filter(
                        (key) => !isBlank(emitParams[key]) && !(key in params),
                    );
                    if (faltantes.length > 0) {
                        testInfo.annotations.push({
                            type: "warning",
                            description: `Claves con valor en newemitir que no viajan en la OPF: ${faltantes.join(", ")}`,
                        });
                    }
                });

                await test.step("Validar respuesta y popup de éxito con ID de solicitud", async () => {
                    expect(opfResponse.ok(), `POST OPF respondió ${opfResponse.status()}`).toBe(true);
                    expect(opfResult?.id).toBeTruthy();
                    expect(opfResult?.status).toBe(OPF_STATUS_PENDIENTE_EMISION);
                    await expect(opf.confirmError).toBeHidden();
                    await expect(opf.successTitle).toBeVisible({ timeout: 30000 });
                    await expect(opf.successSolicitudId).toContainText(String(opfResult.id));
                });

                if (OPF_BACKEND_MOCK) return;
                await validarEnMisSolicitudes(page, opfResult.id);
            });
        }
    });

    test.describe("Auto - Operaciones por fuera con cobertura fuera de pauta @regression", () => {
        test.afterEach(async ({}, testInfo) => {
            if (adjuntarLogsBackend) await attachBackendLogsOnFailure(testInfo);
            if (OPF_BACKEND_MOCK) return;
            const compania = testInfo.title.split(":")[0];
            const companyEnum = COMPANY_ENUM_POR_LABEL[compania];
            if (companyEnum && leerOpfPendiente(clave(companyEnum))?.estado === "en_curso") {
                guardarOpfPendiente(clave(companyEnum), { estado: "fallida", compania });
            }
        });

        for (const compania of Object.keys(PLAN_POR_COMPANIA)) {
            const companyEnum = COMPANY_ENUM_POR_LABEL[compania];

            test(`${compania}: solicitar una cobertura fuera de pauta ("Ver más") a Operaciones`, async ({
                page,
            }, testInfo) => {
                test.setTimeout(180000);

                await documentarCaso({
                    epic: "Auto",
                    feature: "Operaciones por fuera",
                    story: "Cobertura fuera de pauta (catalogExtra)",
                    severidad: "critical",
                    prioridad: "high",
                    tickets: ["POL-3076", "POL-3083", "POL-3085"],
                    descripcion:
                        `Cotiza un ${VEHICULO_FUERA_DE_PAUTA.marca} ${VEHICULO_FUERA_DE_PAUTA.modelo} ${VEHICULO_FUERA_DE_PAUTA.año}, selecciona ${compania}, abre ` +
                        '"¿Necesitás una cobertura diferente? Ver más" y solicita la primera cobertura fuera de pauta. ' +
                        "Completa cliente e inspección (si la compañía la pide) y solicita la cotización a Operaciones. " +
                        "Espera la pantalla de éxito con ID, payload OPF catalogExtra sin premio y la solicitud en Mis Solicitudes.",
                    precondiciones:
                        "Usuario logueado (storageState del project), datos de usuario mockeados con compañías habilitadas, " +
                        "frontend en localhost:3000, general_api y microservice_products levantados." +
                        (OPF_BACKEND_MOCK ? " POST de OPF mockeado (OPF_MOCK=1)." : ""),
                    parametros: {
                        Compañía: compania,
                        "Backend OPF": OPF_BACKEND_MOCK ? "mock" : "real",
                    },
                    tags: ["auto", "operaciones-por-fuera", "fuera-de-pauta", "regression"],
                });

                if (!OPF_BACKEND_MOCK) guardarOpfPendiente(clave(companyEnum), { estado: "en_curso", compania });
                await applyUserMock(page);
                await mockOpfCreateIfEnabled(page, OPF_STATUS_PENDIENTE);
                let newemitirLlamado = false;
                page.on("request", (request) => {
                    if (new URL(request.url()).pathname === "/newemitir") newemitirLlamado = true;
                });

                const cotizarAutoIA = new CotizarAutoIAPage(page);
                const opf = new OperacionPorFuera(page);
                const catalogoPromise = page.waitForResponse(
                    (response) => new URL(response.url()).pathname.endsWith(DETALLES_COBERTURAS_AUTOS_PATH),
                    { timeout: 120000 },
                );

                await test.step("Ingresar al cotizador de Auto IA", async () => {
                    await cotizarAutoIA.goto();
                });
                const catalogoCompania: Record<string, any> = (await (await catalogoPromise).json())?.[companyEnum] ?? {};

                await test.step(`Cotizar ${VEHICULO_FUERA_DE_PAUTA.marca} ${VEHICULO_FUERA_DE_PAUTA.modelo} ${VEHICULO_FUERA_DE_PAUTA.año} (CP ${VEHICULO_FUERA_DE_PAUTA.c_postal})`, async () => {
                    await cotizarAutoIA.cotizarVehiculo(VEHICULO_FUERA_DE_PAUTA);
                });

                await test.step(`Seleccionar ${compania}`, async () => {
                    await cotizarAutoIA.selectCompania(compania);
                });

                const cobertura = await test.step('Abrir "Ver más" y elegir la primera cobertura fuera de pauta', async () => {
                    await expect(opf.extraVerMasBtn, `${compania} no ofrece coberturas fuera de pauta`).toBeVisible();
                    await opf.extraVerMasBtn.click();
                    await expect(opf.extraTitle).toBeVisible();
                    const row = opf.extraRows.first();
                    await expect(row).toBeVisible();
                    const emitirId = await opf.extraSolicitarBtn(row).getAttribute("id");
                    const id = (emitirId ?? "").replace(/^emitirButton_/, "");
                    const nombre = (await row.locator(".ctrowAuto__name").innerText()).trim();
                    return { row, id, nombre };
                });

                await test.step(`Solicitar "${cobertura.nombre}" y continuar desde el popup de cotización`, async () => {
                    await opf.extraSolicitarBtn(cobertura.row).click();
                    await expect(opf.entryPopupTitle).toBeVisible();
                    await opf.entryContinuarBtn.click();
                    await expect(opf.entryPopupTitle).toBeHidden();
                });

                await test.step("Completar el cliente", async () => {
                    await cotizarAutoIA.completarPasoCliente(CUIT_DEFAULT);
                });

                if (SKIP_INSPECCION[compania] !== true) {
                    await test.step("Completar la inspección", async () => {
                        await cotizarAutoIA.completarPasoInspeccion(opf.solicitarCotizacionBtn);
                    });
                }

                const opfResponsePromise = page.waitForResponse(isOpfCreateResponse, { timeout: 60000 });

                await test.step("Solicitar la cotización a Operaciones", async () => {
                    await expect(opf.solicitarCotizacionBtn).toBeEnabled({ timeout: 30000 });
                    await opf.solicitarCotizacionBtn.click();
                });

                const opfResponse = await opfResponsePromise;
                const opfPayload = opfResponse.request().postDataJSON();
                const opfResult = await opfResponse.json().catch(() => null);

                await testInfo.attach("opf-request.json", {
                    body: JSON.stringify(redactCodigos(opfPayload), null, 2),
                    contentType: "application/json",
                });
                await testInfo.attach("opf-response.json", {
                    body: JSON.stringify(opfResult, null, 2),
                    contentType: "application/json",
                });

                await test.step(`Validar payload de la operación por fuera (cobertura ${cobertura.id})`, async () => {
                    const request = opfPayload?.request ?? {};
                    expect(request.product).toBe("auto");
                    expect(request.company).toBe(companyEnum);
                    expect(request.opfFlow).toBe("catalogExtra");
                    expect(String(request.idCobertura)).toBe(idCatalogo(catalogoCompania, cobertura.id));
                    expect(request, "una cobertura fuera de pauta no lleva premio").not.toHaveProperty("premio");
                    expect(newemitirLlamado, "no debe intentar emitir contra la aseguradora").toBe(false);
                });

                await test.step("Validar respuesta y pantalla de éxito con ID de solicitud", async () => {
                    expect(opfResponse.ok(), `POST OPF respondió ${opfResponse.status()}`).toBe(true);
                    expect(opfResult?.id).toBeTruthy();
                    expect(opfResult?.status).toBe(OPF_STATUS_PENDIENTE);
                    await expect(opf.submitErrorTitle).toBeHidden();
                    await expect(opf.cotizacionSuccessTitle).toBeVisible({ timeout: 30000 });
                    await expect(opf.successIdValue).toHaveText(String(opfResult.id));
                });

                if (OPF_BACKEND_MOCK) return;
                await validarEnMisSolicitudes(page, opfResult.id);

                guardarOpfPendiente(clave(companyEnum), {
                    estado: "creada",
                    id: String(opfResult.id),
                    compania,
                    cobertura: cobertura.nombre,
                });
                console.log(`📝 ${compania}: solicitud ${opfResult.id} lista para aprobar en admin`);
                testInfo.annotations.push({ type: "OPF a aprobar en admin", description: `${compania} · ${opfResult.id}` });
            });
        }
    });

    /**
     * `apiCatalogOutStandard`: la fila cotizada trae la etiqueta "Fuera de pauta" y "Solicitar" en lugar de
     * "Emitir". Popup "Solicitud de emisión" → asistente completo → "Solicitar emisión". Nace en
     * "Pendiente de emisión" con premio (no pasa por Cotizada / "A completar").
     */
    test.describe("Auto - Operaciones por fuera con cobertura cotizada fuera de pauta @regression", () => {
        const { compania, pendienteKey, codigo, nombre } = ZURICH_OUT_STANDARD;
        const companyEnum = COMPANY_ENUM_POR_LABEL[compania];

        test.afterEach(async ({}, testInfo) => {
            if (adjuntarLogsBackend) await attachBackendLogsOnFailure(testInfo);
            if (!OPF_BACKEND_MOCK && leerOpfPendiente(clave(pendienteKey))?.estado === "en_curso") {
                guardarOpfPendiente(clave(pendienteKey), { estado: "fallida", compania });
            }
        });

        test(`${compania}: solicitar "${nombre}" (etiqueta "Fuera de pauta") a Operaciones`, async ({ page }, testInfo) => {
            test.setTimeout(180000);

            await documentarCaso({
                epic: "Auto",
                feature: "Operaciones por fuera",
                story: "Cobertura cotizada fuera de pauta (apiCatalogOutStandard)",
                severidad: "critical",
                prioridad: "high",
                tickets: ["POL-3076", "POL-3083", "POL-3085"],
                descripcion:
                    `Cotiza un ${VEHICULO_FUERA_DE_PAUTA.marca} ${VEHICULO_FUERA_DE_PAUTA.modelo} ${VEHICULO_FUERA_DE_PAUTA.año}, ` +
                    `selecciona ${compania} y verifica que "${nombre}" (${codigo}) tenga la etiqueta "Fuera de pauta" y el ` +
                    'botón "Solicitar". Solicita, continúa el popup "Solicitud de emisión", completa póliza, cliente y ' +
                    'detalle del vehículo y "Solicitar emisión": OPF apiCatalogOutStandard con premio en "Pendiente de emisión".',
                precondiciones:
                    "Usuario logueado (storageState del project), datos de usuario mockeados con compañías habilitadas, " +
                    "frontend en localhost:3000, general_api y microservice_products levantados." +
                    (OPF_BACKEND_MOCK ? " POST de OPF mockeado (OPF_MOCK=1)." : ""),
                parametros: {
                    Compañía: compania,
                    Cobertura: `${nombre} (${codigo})`,
                    "Backend OPF": OPF_BACKEND_MOCK ? "mock" : "real",
                },
                tags: ["auto", "operaciones-por-fuera", "fuera-de-pauta", "regression"],
            });

            if (!OPF_BACKEND_MOCK) guardarOpfPendiente(clave(pendienteKey), { estado: "en_curso", compania });
            await applyUserMock(page);
            await mockOpfCreateIfEnabled(page, OPF_STATUS_PENDIENTE_EMISION);
            let newemitirLlamado = false;
            page.on("request", (request) => {
                if (new URL(request.url()).pathname === "/newemitir") newemitirLlamado = true;
            });

            const cotizarAutoIA = new CotizarAutoIAPage(page);
            const opf = new OperacionPorFuera(page);
            const fila = cotizarAutoIA.ctrowTable.planCard(codigo);

            await test.step("Ingresar al cotizador de Auto IA", async () => {
                await cotizarAutoIA.goto();
            });

            await test.step(`Cotizar ${VEHICULO_FUERA_DE_PAUTA.marca} ${VEHICULO_FUERA_DE_PAUTA.modelo} ${VEHICULO_FUERA_DE_PAUTA.año} (CP ${VEHICULO_FUERA_DE_PAUTA.c_postal})`, async () => {
                await cotizarAutoIA.cotizarVehiculo(VEHICULO_FUERA_DE_PAUTA);
            });

            await test.step(`Seleccionar ${compania}`, async () => {
                await cotizarAutoIA.selectCompania(compania);
            });

            await test.step(`"${nombre}" tiene la etiqueta "Fuera de pauta" y el botón "Solicitar"`, async () => {
                await expect(fila, `${compania} no cotizó ${codigo}`).toBeVisible();
                await expect(fila.locator(".ctrowAuto__name")).toHaveText(nombre);
                await expect(opf.filaEtiquetaFueraDePauta(fila)).toBeVisible();
                await expect(opf.filaEmitirBtn(fila)).toHaveText("Solicitar");
            });

            await test.step('Solicitar y continuar desde el popup "Solicitud de emisión"', async () => {
                await opf.filaEmitirBtn(fila).click();
                await expect(opf.outStandardPopupTitle).toBeVisible();
                await opf.entryContinuarBtn.click();
                await expect(opf.outStandardPopupTitle).toBeHidden();
            });

            await test.step("Completar la póliza", async () => {
                await cotizarAutoIA.completarPasoPoliza(FORMA_PAGO_POR_COMPANIA[compania]);
            });

            await test.step("Completar el cliente", async () => {
                await cotizarAutoIA.completarPasoCliente(CUIT_DEFAULT);
            });

            await test.step("Completar el detalle del vehículo", async () => {
                await cotizarAutoIA.completarPasoDetalleVehiculo();
            });

            const opfResponsePromise = page.waitForResponse(isOpfCreateResponse, { timeout: 60000 });

            await test.step('"Solicitar emisión" a Operaciones', async () => {
                await expect(opf.completarSolicitarEmisionBtn).toBeEnabled({ timeout: 30000 });
                await opf.completarSolicitarEmisionBtn.click();
            });

            const opfResponse = await opfResponsePromise;
            const opfPayload = opfResponse.request().postDataJSON();
            const opfResult = await opfResponse.json().catch(() => null);

            await testInfo.attach("opf-request.json", {
                body: JSON.stringify(redactCodigos(opfPayload), null, 2),
                contentType: "application/json",
            });
            await testInfo.attach("opf-response.json", {
                body: JSON.stringify(opfResult, null, 2),
                contentType: "application/json",
            });

            await test.step("Validar payload de la operación por fuera (apiCatalogOutStandard con premio)", async () => {
                const request = opfPayload?.request ?? {};
                expect(request.product).toBe("auto");
                expect(request.company).toBe(companyEnum);
                expect(request.opfFlow).toBe(OPF_FLOW_API_OUT_STANDARD);
                expect(Number(request.premio), "una cobertura cotizada lleva premio").toBeGreaterThan(0);
                expect(newemitirLlamado, "no debe intentar emitir contra la aseguradora").toBe(false);
            });

            await test.step("Validar respuesta y pantalla de éxito con ID de solicitud", async () => {
                expect(opfResponse.ok(), `POST OPF respondió ${opfResponse.status()}`).toBe(true);
                expect(opfResult?.id).toBeTruthy();
                expect(opfResult?.status).toBe(OPF_STATUS_PENDIENTE_EMISION);
                await expect(opf.submitErrorTitle).toBeHidden();
                await expect(opf.successTitle).toBeVisible({ timeout: 30000 });
                await expect(opf.successIdValue).toHaveText(String(opfResult.id));
            });

            if (OPF_BACKEND_MOCK) return;
            await validarEnMisSolicitudes(page, opfResult.id);

            const patente = buscarValor(opfPayload, "patente");
            guardarOpfPendiente(clave(pendienteKey), {
                estado: "creada",
                id: String(opfResult.id),
                compania,
                cobertura: nombre,
                patente: patente ? String(patente) : undefined,
            });
            console.log(`📝 ${compania} (${codigo} fuera de pauta): solicitud ${opfResult.id} lista para emitir en admin`);
            testInfo.annotations.push({ type: "OPF a emitir en admin", description: `${compania} ${codigo} · ${opfResult.id}` });
        });
    });

    /**
     * Fase 2 `catalogExtra`. Va al final del archivo: con `fullyParallel` los workers toman los tests
     * en orden, así que cuando arranca ya se despachó toda la fase 1. Espera la fase 1 de su compañía
     * (`.opf-pendientes/`), refresca Mis Solicitudes hasta ver la solicitud "A completar" (aprobada en
     * admin) y desde el detalle descarga el PDF y solicita la emisión (póliza + detalle del vehículo).
     */
    test.describe("Auto - Operaciones por fuera: completar solicitud Cotizada @regression", () => {
        test.skip(!OPF_COMPLETAR || OPF_BACKEND_MOCK, "Requiere OPF_COMPLETAR=1 y backend real (sin OPF_MOCK)");

        test.afterEach(async ({}, testInfo) => {
            if (adjuntarLogsBackend) await attachBackendLogsOnFailure(testInfo);
        });

        for (const compania of Object.keys(PLAN_POR_COMPANIA)) {
            const companyEnum = COMPANY_ENUM_POR_LABEL[compania];

            test(`${compania}: descargar pdf, solicitar emisión y ver la póliza emitida en Mi Cartera`, async ({
                page,
            }, testInfo) => {
                test.setTimeout(OPF_FASE1_TIMEOUT_MS + 2 * OPF_APROBACION_TIMEOUT_MS + 600000);
                const pendiente = await test.step(`Esperar la fase 1 de ${compania}`, () => esperarFase1(clave(companyEnum)));
                test.skip(!pendiente?.id, `${compania}: la fase 1 no dejó solicitud para completar`);

                await documentarCaso({
                    epic: "Auto",
                    feature: "Operaciones por fuera",
                    story: "Completar solicitud Cotizada (catalogExtra)",
                    severidad: "critical",
                    prioridad: "high",
                    tickets: ["POL-3076", "POL-3083", "POL-3085"],
                    descripcion:
                        `Toma la solicitud fuera de pauta ${pendiente!.id} de ${compania} creada en la fase 1, espera que esté ` +
                        'Cotizada en admin, la abre desde Mis Solicitudes → Automotor → "A completar", descarga el PDF ' +
                        "y solicita la emisión completando póliza y detalle del vehículo. Después espera que la emitan en " +
                        'admin, la abre en "Aprobada" (mismo ID), va a Mi Cartera con "Ver póliza en Mi Cartera" y la ' +
                        "encuentra buscando por la patente.",
                    precondiciones:
                        "Fase 1 fuera de pauta corrida contra backend real; en admin se cotiza y luego se emite la solicitud. " +
                        "Frontend en localhost:3000, general_api, microservice_products, microservice_pdfs y " +
                        "microservice_statistics levantados.",
                    parametros: {
                        Compañía: compania,
                        "ID solicitud": pendiente!.id,
                        Cobertura: pendiente!.cobertura,
                    },
                    tags: ["auto", "operaciones-por-fuera", "fuera-de-pauta", "regression"],
                });

                await applyUserMock(page);
                const opfId = pendiente!.id!;
                let patente = pendiente!.patente;
                if (pendiente!.estado !== "completada") {
                    patente = await completarSolicitudCotizada(page, testInfo, { compania, companyEnum, opfId });
                    guardarOpfPendiente(clave(companyEnum), { ...pendiente!, estado: "completada", patente });
                }
                await verPolizaEmitidaEnMiCartera(page, { compania, companyEnum, opfId, patente });
                borrarOpfPendiente(clave(companyEnum));
            });
        }

        test(`${ZURICH_OUT_STANDARD.compania}: "${ZURICH_OUT_STANDARD.nombre}" (${ZURICH_OUT_STANDARD.codigo} fuera de pauta): descargar pdf y ver la póliza emitida en Mi Cartera`, async ({
            page,
        }, testInfo) => {
            const { compania, pendienteKey, codigo, nombre } = ZURICH_OUT_STANDARD;
            const companyEnum = COMPANY_ENUM_POR_LABEL[compania];
            test.setTimeout(OPF_FASE1_TIMEOUT_MS + OPF_APROBACION_TIMEOUT_MS + 600000);
            const pendiente = await test.step(`Esperar la fase 1 de ${compania} ${codigo}`, () => esperarFase1(clave(pendienteKey)));
            test.skip(!pendiente?.id, `${compania} ${codigo}: la fase 1 no dejó solicitud`);

            await documentarCaso({
                epic: "Auto",
                feature: "Operaciones por fuera",
                story: "Cobertura cotizada fuera de pauta (apiCatalogOutStandard)",
                severidad: "critical",
                prioridad: "high",
                tickets: ["POL-3076", "POL-3083", "POL-3085"],
                descripcion:
                    `Toma la solicitud ${pendiente!.id} de ${compania} "${nombre}" creada en la fase 1 (nace en Pendiente de ` +
                    'emisión, sin paso "A completar"), la abre en Mis Solicitudes y descarga el "PDF de cotización". ' +
                    'Después espera que la emitan en admin, la abre en "Aprobada" (mismo ID), va a Mi Cartera con ' +
                    '"Ver póliza en Mi Cartera" y la encuentra buscando por la patente.',
                precondiciones:
                    "Fase 1 corrida contra backend real; en admin se emite la solicitud. Frontend en localhost:3000, " +
                    "general_api, microservice_products, microservice_pdfs y microservice_statistics levantados.",
                parametros: {
                    Compañía: compania,
                    "ID solicitud": pendiente!.id,
                    Cobertura: `${nombre} (${codigo})`,
                },
                tags: ["auto", "operaciones-por-fuera", "fuera-de-pauta", "regression"],
            });

            await applyUserMock(page);
            const opfId = pendiente!.id!;
            if (pendiente!.estado !== "completada") {
                await descargarPdfCotizacionSolicitud(page, testInfo, { compania, companyEnum, opfId });
                guardarOpfPendiente(clave(pendienteKey), { ...pendiente!, estado: "completada" });
            }
            await verPolizaEmitidaEnMiCartera(page, { compania, companyEnum, opfId, patente: pendiente!.patente });
            borrarOpfPendiente(clave(pendienteKey));
        });
    });
}

/**
 * Recarga Mis Solicitudes → Automotor cada `OPF_POLL_INTERVAL_MS` y mira el estado de la solicitud
 * en el listado que trae la pantalla, hasta que esté en alguno de `objetivo`. Devuelve el ítem.
 */
async function esperarEstadoEnMisSolicitudes(
    misSolicitudes: MisSolicitudesPage,
    opts: { opfId: string; compania: string; objetivo: string[]; label: string; aviso: string },
): Promise<any> {
    const { opfId, compania, objetivo, label, aviso } = opts;
    const page = misSolicitudes.page;
    const limite = Date.now() + OPF_APROBACION_TIMEOUT_MS;
    let ultimoStatus = "";
    console.log(`⏳ ${compania} · ${opfId}: ${aviso}`);
    while (Date.now() < limite) {
        const listResponsePromise = page.waitForResponse(isOpfListResponse, { timeout: 60000 });
        await misSolicitudes.navigate();
        await misSolicitudes.irATab("Automotor");
        const items = extractOpfListItems(await (await listResponsePromise).json());
        const item = items.find((candidato) => (candidato._id ?? candidato.id) === opfId);
        const status = String(item?.status ?? "");
        if (status !== ultimoStatus) {
            console.log(`   ${compania} · ${opfId}: ${status || "(no figura en el listado)"}`);
            ultimoStatus = status;
        }
        if (objetivo.includes(status)) return item;
        if (status === OPF_STATUS_CANCELADA) throw new Error(`La solicitud ${opfId} (${compania}) fue cancelada en admin`);
        await page.waitForTimeout(OPF_POLL_INTERVAL_MS);
    }
    throw new Error(
        `Timeout (${OPF_APROBACION_TIMEOUT_MS / 60_000} min) esperando que ${compania} · ${opfId} `
        + `pase a "${label}"; último status: ${ultimoStatus || "desconocido"}`,
    );
}

/** Click en un botón de descarga del PDF de cotización (`POST /newTemplate` + archivo .pdf). */
async function validarDescargaPdfCotizacion(page: Page, testInfo: TestInfo, boton: Locator): Promise<void> {
    const pdfResponsePromise = page.waitForResponse(
        (response) =>
            response.request().method() === "POST"
            && new URL(response.url()).pathname.endsWith("/newTemplate"),
        { timeout: 60000 },
    );
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await boton.click();

    const pdfResponse = await pdfResponsePromise;
    expect(pdfResponse.ok(), `/newTemplate respondió ${pdfResponse.status()}`).toBe(true);
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    await testInfo.attach(download.suggestedFilename(), {
        path: await download.path(),
        contentType: "application/pdf",
    });
    await expect(new OperacionPorFuera(page).descargaErrorTitle).toBeHidden();
}

/**
 * Fase 2 `apiCatalogOutStandard`: la solicitud ya nace en Pendiente de emisión, así que solo se abre
 * por ID en Mis Solicitudes y se descarga el "PDF de cotización" de Documentación.
 */
async function descargarPdfCotizacionSolicitud(
    page: Page,
    testInfo: TestInfo,
    ctx: { compania: string; companyEnum: string; opfId: string },
): Promise<void> {
    const { compania, companyEnum, opfId } = ctx;
    const misSolicitudes = new MisSolicitudesPage(page);

    const operacion = await test.step(`Ubicar la solicitud ${opfId} en Mis Solicitudes`, () =>
        esperarEstadoEnMisSolicitudes(misSolicitudes, {
            opfId,
            compania,
            objetivo: [OPF_STATUS_PENDIENTE_EMISION, ...OPF_STATUS_APROBADA],
            label: OPF_STATUS_PENDIENTE_EMISION,
            aviso: `buscando en Mis Solicitudes (esperando "${OPF_STATUS_PENDIENTE_EMISION}")`,
        }),
    );
    const estado = OPF_STATUS_APROBADA.includes(String(operacion?.status)) ? OPF_LABEL_APROBADA : OPF_STATUS_PENDIENTE_EMISION;

    await test.step(`Abrir la solicitud en "${estado}" y validar el ID`, async () => {
        await misSolicitudes.abrirSolicitudAutomotorPorId(opfId, estado, OPF_COMPANY_OPTION[companyEnum]);
        await expect(misSolicitudes.detail.root.getByText(/ID Solicitud:/)).toContainText(opfId);
    });

    await test.step('"PDF de cotización" descarga la cotización', async () => {
        await validarDescargaPdfCotizacion(page, testInfo, misSolicitudes.documentoBtn("PDF de cotización"));
    });
}

function buscarValor(obj: any, clave: string): unknown {
    if (!obj || typeof obj !== "object") return undefined;
    if (clave in obj && !isBlank(obj[clave])) return obj[clave];
    for (const valor of Object.values(obj)) {
        const encontrado = buscarValor(valor, clave);
        if (encontrado !== undefined) return encontrado;
    }
    return undefined;
}

/** Fase 2: devuelve la patente cargada (la usa la fase 3 para buscar en Mi Cartera). */
async function completarSolicitudCotizada(
    page: Page,
    testInfo: TestInfo,
    ctx: { compania: string; companyEnum: string; opfId: string },
): Promise<string | undefined> {
    const { compania, companyEnum, opfId } = ctx;
    const misSolicitudes = new MisSolicitudesPage(page);
    const cotizarAutoIA = new CotizarAutoIAPage(page);
    const opf = new OperacionPorFuera(page);

    await test.step(`Esperar en Mis Solicitudes que ${opfId} pase a "${OPF_LABEL_A_COMPLETAR}"`, async () => {
        await esperarEstadoEnMisSolicitudes(misSolicitudes, {
            opfId,
            compania,
            objetivo: [OPF_STATUS_COTIZADA],
            label: OPF_LABEL_A_COMPLETAR,
            aviso: `cotizala en admin (esperando "${OPF_LABEL_A_COMPLETAR}")`,
        });
    });

    await test.step(`Abrir la solicitud en Mis Solicitudes → Automotor → "${OPF_LABEL_A_COMPLETAR}"`, async () => {
        await misSolicitudes.abrirSolicitudAutomotorPorId(opfId, OPF_LABEL_A_COMPLETAR, OPF_COMPANY_OPTION[companyEnum]);
        await expect(misSolicitudes.detail.descargarPdfBtn).toBeVisible({ timeout: 30000 });
        await expect(misSolicitudes.detail.solicitarEmisionBtn).toBeVisible();
    });

    await test.step('"Descargar pdf" descarga la cotización', async () => {
        await validarDescargaPdfCotizacion(page, testInfo, misSolicitudes.detail.descargarPdfBtn);
    });

    await test.step('"Solicitar emisión" abre el asistente en modo completar', async () => {
        await misSolicitudes.detail.solicitarEmisionBtn.click();
        await expect(page).toHaveURL(/\/u\/cotizar\/automotor/, { timeout: 30000 });
    });

    await test.step("Completar la póliza", async () => {
        await cotizarAutoIA.completarPasoPoliza(FORMA_PAGO_POR_COMPANIA[compania]);
    });

    await test.step("Completar el detalle del vehículo", async () => {
        await cotizarAutoIA.completarPasoDetalleVehiculo();
    });

    const patchPromise = page.waitForResponse(isOpfPatchResponse(opfId), { timeout: 60000 });

    await test.step('"Solicitar emisión"', async () => {
        await expect(opf.completarSolicitarEmisionBtn).toBeEnabled({ timeout: 30000 });
        await opf.completarSolicitarEmisionBtn.click();
    });

    const patchResponse = await patchPromise;
    const patchBody = patchResponse.request().postDataJSON();
    const patchResult = await patchResponse.json().catch(() => null);
    await testInfo.attach("opf-completar-request.json", {
        body: JSON.stringify(redactCodigos(patchBody), null, 2),
        contentType: "application/json",
    });
    await testInfo.attach("opf-completar-response.json", {
        body: JSON.stringify(patchResult, null, 2),
        contentType: "application/json",
    });

    await test.step("Validar PATCH a Pendiente de emisión y pantalla de éxito", async () => {
        expect(new URL(patchResponse.url()).searchParams.get("origin")).toBe("polko");
        expect(patchBody?.status).toBe(OPF_STATUS_PENDIENTE_EMISION);
        expect(patchBody?.request?.company ?? companyEnum).toBe(companyEnum);
        expect(patchResponse.ok(), `PATCH OPF respondió ${patchResponse.status()}`).toBe(true);
        await expect(opf.submitErrorTitle).toBeHidden();
        await expect(opf.completarSuccessTitle).toBeVisible({ timeout: 30000 });
        await expect(opf.successIdValue).toHaveText(opfId);
        await expect(opf.successDescargarPdfBtn).toBeVisible();
    });

    const patente = buscarValor(patchBody, "patente");
    return patente ? String(patente) : undefined;
}

/**
 * Fase 3: espera que admin emita la solicitud, la abre en "Aprobada" (mismo ID), va a Mi Cartera
 * con "Ver póliza en Mi Cartera" y verifica que la emisión esté (por `id_issuance` y por patente).
 */
async function verPolizaEmitidaEnMiCartera(
    page: Page,
    ctx: { compania: string; companyEnum: string; opfId: string; patente?: string },
): Promise<void> {
    const { compania, companyEnum, opfId, patente } = ctx;
    const misSolicitudes = new MisSolicitudesPage(page);
    const miCartera = new MiCarteraPage(page);

    const operacion = await test.step(`Esperar en Mis Solicitudes que ${opfId} pase a "${OPF_LABEL_APROBADA}"`, () =>
        esperarEstadoEnMisSolicitudes(misSolicitudes, {
            opfId,
            compania,
            objetivo: OPF_STATUS_APROBADA,
            label: OPF_LABEL_APROBADA,
            aviso: `emitila en admin (esperando "${OPF_LABEL_APROBADA}")`,
        }),
    );
    const idEmision = operacion?.id_issuance ? String(operacion.id_issuance) : undefined;

    await test.step(`Abrir la solicitud en "${OPF_LABEL_APROBADA}" y validar el ID`, async () => {
        await misSolicitudes.abrirSolicitudAutomotorPorId(opfId, OPF_LABEL_APROBADA, OPF_COMPANY_OPTION[companyEnum]);
        await expect(misSolicitudes.detail.root.getByText(/ID Solicitud:/)).toContainText(opfId);
        await expect(misSolicitudes.detail.statusTitle).toHaveText("Póliza emitida");
        await expect(misSolicitudes.detail.verPolizaEnMiCarteraBtn).toBeVisible();
    });

    await test.step('"Ver póliza en Mi Cartera" lleva a Mi Cartera con la póliza emitida', async () => {
        const documentacionPromise = miCartera.waitForDocumentacion();
        await misSolicitudes.detail.verPolizaEnMiCarteraBtn.click();
        await expect(page).toHaveURL(/\/u\/micartera/, { timeout: 30000 });

        const documentacion = await documentacionPromise;
        expect(documentacion.ok(), `getDocumentacion respondió ${documentacion.status()}`).toBe(true);
        if (idEmision) {
            const json = await documentacion.json();
            const polizasPolko: any[] = Array.isArray(json) ? json : json?.polizas_polko ?? [];
            const ids = polizasPolko.map((item) => item.idEmision ?? item.id);
            expect(ids, `La emisión ${idEmision} no está en Mi Cartera`).toContain(idEmision);
        }
        await miCartera.waitForListaCargada();
        await miCartera.irATab(TAB_EMITIDAS_POLKO);
    });

    if (!patente) return;
    await test.step(`Encontrar la póliza en Mi Cartera buscando la patente ${patente}`, async () => {
        await miCartera.buscar(patente);
        const card = miCartera.cards.filter({ hasText: OPF_COMPANY_OPTION[companyEnum] });
        await expect(card.first(), `${compania}: la póliza con patente ${patente} no aparece en Mi Cartera`).toBeVisible();
        await miCartera.abrirCard(card.first());
        await expect(miCartera.detailCompanyName).toHaveText(OPF_COMPANY_OPTION[companyEnum]);
    });
}

/**
 * `idCobertura` del payload es la clave del catálogo (`originalId`). Zurich muestra en la
 * fila el código comercial (`codZurich` / `codigo`), así que se resuelve contra el catálogo.
 */
function idCatalogo(catalogo: Record<string, any>, idFila: string): string {
    if (idFila in catalogo) return idFila;
    const match = Object.entries(catalogo).find(
        ([, cobertura]) => cobertura?.parametrosAdicionales?.codZurich === idFila || cobertura?.codigo === idFila,
    );
    return match?.[0] ?? idFila;
}

async function validarEnMisSolicitudes(page: Page, opfId: string): Promise<void> {
    await test.step("La solicitud aparece en Mis Solicitudes ordenada por updated_at", async () => {
        const misSolicitudes = new MisSolicitudesPage(page);
        const listResponsePromise = page.waitForResponse(isOpfListResponse, { timeout: 60000 });
        await misSolicitudes.navigate();
        await misSolicitudes.irATab("Automotor");
        const listResponse = await listResponsePromise;

        const listParams = new URL(listResponse.url()).searchParams;
        expect(listParams.get("order_by")).toBe("updated_at");
        expect(listParams.get("order_direction")).toBe("desc");
        const items = extractOpfListItems(await listResponse.json());
        const ids = items.map((item) => item._id ?? item.id);
        expect(ids).toContain(opfId);

        const fechas = items.map((item) => Date.parse(item.updated_at ?? item.created_at));
        expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
        await expect(misSolicitudes.automotorCards.first()).toBeVisible();
    });
}
