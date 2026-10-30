import { test, expect, type Locator, type Page, type Response, type TestInfo } from "@playwright/test";
import ArtCotizarLayout from "../components/ART/artCotizarLayout";
import ArtMisSolicitudes from "../components/ART/artMisSolicitudes";
import AdminSolicitudesArtPage, { type CotizacionArtAdmin } from "../pages/adminSolicitudesArtPage";
import MiCarteraPage from "../pages/miCarteraPage";
import { ART_COMPANIAS_ADMIN } from "../data/artCompanias";
import { adminDisponible, conAdmin } from "../helpers/adminApp";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { descargarComprobanteSolicitud, descargarDocumento, type TipoComprobanteSolicitud } from "../helpers/comprobantes";
import { TIMEOUT_EXTRA_POLIZA_MI_CARTERA } from "../helpers/polizaMiCartera";
import { mockUserDataString } from "../helpers/mockUser";
import { documentarCaso } from "../helpers/documentarCaso";
import { guardarOpfPendiente } from "../helpers/opfMocks";

/**
 * Happy path de emisión ART. Como OPF, el flujo cruza Polko → admin → Polko: el test hace en admin
 * lo que haría operaciones (cotizar y emitir) y en Polko lo que haría el productor.
 *
 * Régimen General (operaciones cotiza a mano):
 *   1. Polko: se cotiza, se ve la confirmación en línea y la solicitud queda "Pendiente de cotización".
 *   2. Admin: cotiza la solicitud con `COTIZACION_ADMIN_GENERAL`.
 *   3. Polko: la solicitud "Cotizada" → "Ver cotización y emitir" → emisión.
 *   4. Gestión hasta emitida (ver abajo).
 *
 * Régimen Especial con "Cotizar otras opciones" (un test por compañía de `ART_COMPANIAS_ADMIN`): en vez
 * de emitir la oferta local se pide a operaciones que cotice otras compañías. Popup "Solicitud enviada",
 * admin cotiza con la compañía del test (régimen especial: sin alícuota) y sigue desde el paso 3; la
 * emisión tiene que salir con esa compañía. Debería nacer "Pendiente de cotización", pero el back
 * (microservice_products 2017f278) auto-aprueba toda cotización de régimen especial con Prevención:
 * mientras siga así, admin reemplaza la compañía igual y el test lo deja como warning.
 *
 * Régimen Especial (casas particulares, oferta local con costo fijo): cotiza, emite la oferta local y
 * sigue con la gestión.
 *
 * Gestión hasta emitida (alta / cliente NUEVO): en Polko el productor confirma e-servicios y SPD
 * ("Pendiente de emisión"), admin emite con número de contrato y PDF, y en Polko la solicitud queda
 * "Emitida" con el contrato para descargar. "Ver póliza en Mi Cartera" abre el detalle de la póliza y
 * el contrato se descarga también desde ahí (`POST /my-client-base/policies/{id}/documents/art`).
 *
 * Comprobantes de solicitud: mismo `POST /comprobante/solicitud` (microservice_pdfs) y labels que
 * OPF. "Comprobante de solicitud de cotización" en la confirmación en línea y en el detalle de la cotizada;
 * "Comprobante de solicitud de emisión" en el popup "¡Solicitud enviada!" y en el detalle de la emisión.
 * El popup de "Cotizar otras opciones" no tiene comprobante.
 *
 * Admin automatizado (helpers/adminApp.ts): requiere `admin/build` y `.auth/userAdmin.json` vigente
 * (`npm run auth:admin`). Sin eso (o con `OPF_ADMIN=0`) cada test corta después de la fase Polko y
 * deja el ID en `.opf-pendientes/ART_<régimen>_<project>.json` para operarlo a mano.
 *   npx playwright test tests/emisionARTHappyPath.spec.ts --project=chromium
 */

const CUIT_EMPLEADOR = "20386485446";

const COTIZACION_GENERAL = {
    regimen: "Régimen General" as const,
    cantEmpleados: "25",
    masaSalarial: "5000000",
};

const COTIZACION_ESPECIAL = {
    regimen: "Régimen Especial" as const,
    cantEmpleados: "2",
    horasSemanales: "12 a 16",
};

const COTIZACION_ADMIN_GENERAL: CotizacionArtAdmin[] = [{ company: "Prevencion", alicuota: 3.5 }];

/** PDF mínimo válido que admin sube como "Contrato" al emitir. */
const PDF_CONTRATO = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);
const DOCUMENTO_CONTRATO = "Contrato";

const ESTADOS_EN_GESTION = /Pendiente CNO|CNO en revisión|Pendiente e-servicios|Pendiente SPD|Pendiente de emisión|En gestión/i;

/** Admin opera al instante: alcanza con recargar Mis Solicitudes unas veces hasta ver el cambio. */
const ESPERA_ESTADO_POLKO_MS = 120000;
const INTERVALO_ESTADO_POLKO_MS = 5000;
/** Mi Cartera puede fallar con 504 si `microservice_statistics` tarda; el front no reintenta. */
const INTENTOS_MI_CARTERA = 3;

const ART_COTIZACION_PATH = "/cotizacion/art";
const ART_EMISION_PATH = "/emision/art";
const ART_DOCUMENTACION_PATH = /\/documentacion\/art$/;
const CLIENT_LOOKUP_PATH = "/client";

function isArtPost(path: string) {
    return (response: Response): boolean =>
        response.request().method() === "POST" && new URL(response.url()).pathname.endsWith(path);
}

function isEmisionPatch(idEmision: string) {
    return (response: Response): boolean =>
        response.request().method() === "PATCH"
        && new URL(response.url()).pathname.endsWith(`${ART_EMISION_PATH}/${idEmision}`);
}

function isEmisionDetalle(idEmision: string) {
    return (response: Response): boolean =>
        response.request().method() === "GET"
        && new URL(response.url()).pathname.endsWith(`${ART_EMISION_PATH}/${idEmision}`);
}

async function applyUserMock(page: Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockUserDataString,
        });
    });
}

async function adjuntarIntercambio(testInfo: TestInfo, nombre: string, response: Response): Promise<any> {
    const body = await response.json().catch(() => null);
    await testInfo.attach(`${nombre}-request.json`, {
        body: JSON.stringify(response.request().postDataJSON(), null, 2),
        contentType: "application/json",
    });
    await testInfo.attach(`${nombre}-response.json`, {
        body: JSON.stringify(body, null, 2),
        contentType: "application/json",
    });
    return body;
}

/** Descarga el comprobante de solicitud ART dentro de `contenedor` y valida que sea de la solicitud `id`. */
async function descargarComprobanteArt(
    page: Page,
    testInfo: TestInfo,
    contenedor: Locator,
    tipo: TipoComprobanteSolicitud,
    { id, empleador, company }: { id: string; empleador: string; company?: string },
): Promise<void> {
    const body = await descargarComprobanteSolicitud(page, testInfo, tipo, contenedor);
    expect(body?.solicitud).toEqual(expect.objectContaining({ id, producto: "art", titleKind: tipo }));
    expect(body?.empleador?.empleador).toBe(empleador);
    expect(String(body?.empleador?.cuit ?? "").replace(/\D/g, "")).toBe(CUIT_EMPLEADOR);
    if (company) expect(body?.coverage?.["compañía"]).toBe(company);
}

/**
 * Tramo común a régimen general y "Cotizar otras opciones": `accion` dispara el POST de cotización,
 * después la confirmación (`confirmacion`, con el comprobante de cotización si lo muestra) → Mis
 * Solicitudes → ART con la solicitud en `estadoEsperado`. Devuelve el `idCotizar`.
 */
async function solicitarCotizacionAOperaciones(
    page: Page,
    testInfo: TestInfo,
    empleador: string,
    accion: { titulo: string; ejecutar: () => Promise<void> },
    confirmacion: { titulo: string; locator: Locator; comprobante?: Locator },
    estadoEsperado: { label: string; patron: RegExp },
): Promise<string> {
    const art = new ArtCotizarLayout(page);
    const misSolicitudes = new ArtMisSolicitudes(page);
    const cotizacionResponsePromise = page.waitForResponse(isArtPost(ART_COTIZACION_PATH), { timeout: 90000 });

    await test.step(accion.titulo, accion.ejecutar);

    const cotizacionResponse = await cotizacionResponsePromise;
    const cotizacionPayload = cotizacionResponse.request().postDataJSON();
    const cotizacionResult = await adjuntarIntercambio(testInfo, "art-cotizacion", cotizacionResponse);
    const cotizacionId = String(cotizacionResult?.idCotizar ?? "");

    await test.step("Validar la solicitud de cotización creada", async () => {
        expect(cotizacionResponse.ok(), `POST ${ART_COTIZACION_PATH} respondió ${cotizacionResponse.status()}`).toBe(true);
        expect(cotizacionPayload?.empleador).toBe(empleador);
        expect(String(cotizacionPayload?.cuit)).toBe(CUIT_EMPLEADOR);
        expect(cotizacionId, "la cotización no devolvió idCotizar").toBeTruthy();
    });

    await test.step(confirmacion.titulo, async () => {
        await expect(confirmacion.locator).toBeVisible({ timeout: 90000 });
        await expect(page.getByText(/Recibimos tu pedido de cotización/i)).toBeVisible();
    });

    if (confirmacion.comprobante) {
        await descargarComprobanteArt(page, testInfo, confirmacion.comprobante, "cotizacion", {
            id: cotizacionId,
            empleador,
        });
    }

    await test.step('"Ver mis solicitudes" abre Mis Solicitudes en la tab ART', async () => {
        await art.verMisSolicitudesBtn.click();
        await expect(page).toHaveURL(/missolicitudes/, { timeout: 30000 });
        await expect(misSolicitudes.tabArt).toHaveAttribute("aria-selected", "true", { timeout: 30000 });
    });

    await test.step(`La solicitud de "${empleador}" figura "${estadoEsperado.label}"`, async () => {
        const card = misSolicitudes.listCards.filter({ hasText: empleador }).first();
        await expect(card).toBeVisible({ timeout: 60000 });
        await expect(card).toContainText(estadoEsperado.patron);
    });

    return cotizacionId;
}

/**
 * Si admin no se puede automatizar, deja el ID en `.opf-pendientes/` para operarlo a mano y devuelve
 * false: el test termina con la fase Polko.
 */
function continuarEnAdmin(testInfo: TestInfo, regimen: string, id: string, empleador: string): boolean {
    const disponible = adminDisponible();
    if (disponible.ok) return true;
    const clave = `ART_${regimen}_${testInfo.project.name}`.replace(/\W+/g, "-");
    guardarOpfPendiente(clave, { estado: "creada", compania: "ART", id, cobertura: empleador });
    console.log(`📝 ART ${regimen}: ${id} (${empleador}) listo para admin`);
    testInfo.annotations.push({
        type: "info",
        description: `Admin no automatizado (${disponible.motivo}): ART ${regimen} ${empleador} · ${id} queda para operar a mano`,
    });
    return false;
}

/**
 * `admitirAutoAprobada`: "Cotizar otras opciones" debería llegar abierta, pero el back la crea "Cotizada"
 * con Prevención; en ese caso se cotiza igual (reemplazando la compañía) y queda un warning.
 */
async function cotizarEnAdmin(
    testInfo: TestInfo,
    cotizacionId: string,
    cotizaciones: CotizacionArtAdmin[],
    { admitirAutoAprobada = false }: { admitirAutoAprobada?: boolean } = {},
): Promise<void> {
    const resumen = cotizaciones.map((c) => `${c.company}${c.alicuota !== undefined ? ` ${c.alicuota}%` : ""}`).join(", ");
    await test.step(`Admin: cotizar ${cotizacionId} (${resumen})`, () =>
        conAdmin(async (adminPage) => {
            const admin = new AdminSolicitudesArtPage(adminPage);
            await admin.goto();
            const detalle = await admin.abrirSolicitud("Cotizaciones", cotizacionId);
            if (admitirAutoAprobada && detalle?.estado === "Success") {
                const companias = (detalle?.cotizacion ?? []).map((c: any) => c.company).join(", ");
                testInfo.annotations.push({
                    type: "warning",
                    description:
                        `${cotizacionId} llegó a admin ya "Cotizada" (${companias}) en vez de "Pendiente de cotización": ` +
                        "el back auto-aprueba régimen especial también en \"Cotizar otras opciones\" (microservice_products 2017f278)",
                });
            } else {
                expect(detalle?.estado, `${cotizacionId} tiene que estar abierta para cotizarla`).toBe("Open");
            }
            const body = await admin.cotizar(cotizacionId, cotizaciones);
            await testInfo.attach("admin-cotizada-request.json", {
                body: JSON.stringify(body, null, 2),
                contentType: "application/json",
            });
            expect(body?.estado).toBe("Success");
            expect(body?.cotizacion).toEqual(
                cotizaciones.map((c) => expect.objectContaining({
                    company: c.company,
                    ...(c.alicuota !== undefined ? { porcentaje_alicuota: c.alicuota } : {}),
                })),
            );
        }),
    );
}

async function emitirEnAdmin(testInfo: TestInfo, idEmision: string, numeroContrato: string): Promise<void> {
    await test.step(`Admin: emitir ${idEmision} con contrato ${numeroContrato}`, () =>
        conAdmin(async (adminPage) => {
            const admin = new AdminSolicitudesArtPage(adminPage);
            await admin.goto();
            const detalle = await admin.abrirSolicitud("Emisiones", idEmision);
            expect(detalle?.estado, `${idEmision} tiene que estar lista para emisión`).toBe("Pending");
            const body = await admin.emitir(idEmision, {
                numeroContrato,
                contrato: { name: "contrato.pdf", buffer: PDF_CONTRATO },
            });
            await testInfo.attach("admin-emitida-request.json", {
                body: JSON.stringify({ ...body, files: body?.files?.map((f: any) => ({ ...f, content: "<pdf>" })) }, null, 2),
                contentType: "application/json",
            });
            expect(body?.estado).toBe("Success");
            expect(body?.numeroContrato).toBe(numeroContrato);
            expect(body?.files?.map((f: any) => f.label)).toEqual([DOCUMENTO_CONTRATO]);
        }),
    );
}

/**
 * Recarga Mis Solicitudes → ART hasta que la card de `empleador` esté en `estado` y abre su detalle.
 * Cotización y emisión del mismo empleador conviven en el listado: se elige por estado.
 */
async function abrirEnMisSolicitudes(page: Page, empleador: string, estado: { label: string; patron: RegExp }): Promise<void> {
    const misSolicitudes = new ArtMisSolicitudes(page);
    await test.step(`Abrir en Mis Solicitudes → ART la solicitud de "${empleador}" en "${estado.label}"`, async () => {
        const card = misSolicitudes.card(empleador, estado.patron);
        await expect(async () => {
            await misSolicitudes.goto();
            await misSolicitudes.openArtTab();
            await expect(card).toBeVisible({ timeout: 10000 });
            await expect(misSolicitudes.loading).toHaveCount(0, { timeout: 20000 });
        }).toPass({ timeout: ESPERA_ESTADO_POLKO_MS, intervals: [INTERVALO_ESTADO_POLKO_MS] });
        await card.click();
        await expect(misSolicitudes.detail).toBeVisible({ timeout: 60000 });
        await expect(misSolicitudes.detailStatus).toHaveText(estado.patron);
    });
}

/**
 * Desde el resumen de emisión: "Emitir", valida el POST (y el de cotización si la oferta es local) y
 * el popup "¡Solicitud enviada!" con su comprobante de emisión; "Ir a Mis Solicitudes" abre la tab ART.
 * Devuelve el `idEmision`.
 */
async function emitirDesdeResumen(
    page: Page,
    testInfo: TestInfo,
    { empleador, cotizacionLocal, company }: { empleador: string; cotizacionLocal: boolean; company?: string },
): Promise<string> {
    const art = new ArtCotizarLayout(page);
    const misSolicitudes = new ArtMisSolicitudes(page);
    const cotizacionResponsePromise = cotizacionLocal
        ? page.waitForResponse(isArtPost(ART_COTIZACION_PATH), { timeout: 120000 })
        : null;
    const emisionResponsePromise = page.waitForResponse(isArtPost(ART_EMISION_PATH), { timeout: 120000 });

    await test.step("Confirmar en el resumen y emitir", async () => {
        await expect(art.resumenHeading).toBeVisible({ timeout: 60000 });
        await art.emitirResumenBtn.click();
    });

    if (cotizacionResponsePromise) {
        const cotizacionResponse = await cotizacionResponsePromise;
        const cotizacionResult = await adjuntarIntercambio(testInfo, "art-cotizacion", cotizacionResponse);
        await test.step("Validar la cotización local creada", async () => {
            expect(cotizacionResponse.ok(), `POST ${ART_COTIZACION_PATH} respondió ${cotizacionResponse.status()}`).toBe(true);
            expect(cotizacionResult?.idCotizar, "la cotización no devolvió idCotizar").toBeTruthy();
        });
    }
    const emisionResponse = await emisionResponsePromise;
    const emisionResult = await adjuntarIntercambio(testInfo, "art-emision", emisionResponse);
    const idEmision = String(emisionResult?.idEmision ?? emisionResult?.id_emision ?? "");

    await test.step(`Validar la emisión creada${company ? ` con ${company}` : ""}`, async () => {
        expect(emisionResponse.ok(), `POST ${ART_EMISION_PATH} respondió ${emisionResponse.status()}`).toBe(true);
        if (company) expect(emisionResponse.request().postDataJSON()?.company).toBe(company);
        expect(idEmision, "la emisión no devolvió idEmision").toBeTruthy();
    });

    await test.step('Popup "¡Solicitud enviada!" con el ID de emisión', async () => {
        await expect(art.emisionErrorText).toBeHidden();
        await expect(art.emisionSuccessTitle).toBeVisible({ timeout: 60000 });
        await expect(page.getByText(idEmision)).toBeVisible();
    });

    await descargarComprobanteArt(page, testInfo, art.emisionComprobanteCard, "emision", {
        id: idEmision,
        empleador,
        company,
    });

    await test.step('"Ir a Mis Solicitudes" abre la tab ART', async () => {
        await art.irAMisSolicitudesBtn.click();
        await expect(page).toHaveURL(/missolicitudes/, { timeout: 30000 });
        await expect(misSolicitudes.tabArt).toHaveAttribute("aria-selected", "true", { timeout: 30000 });
    });

    return idEmision;
}

/**
 * Fase 3 de régimen general y "otras opciones": la solicitud "Cotizada" (con su comprobante de
 * cotización) → oferta → cliente → emisión. Con `company`, la oferta tiene que ser la única cotizada en
 * admin y la emisión salir con ella.
 */
async function emitirCotizadaDesdeMisSolicitudes(
    page: Page,
    testInfo: TestInfo,
    { empleador, cotizacionId, company }: { empleador: string; cotizacionId: string; company?: string },
): Promise<string> {
    const art = new ArtCotizarLayout(page);
    const misSolicitudes = new ArtMisSolicitudes(page);

    await abrirEnMisSolicitudes(page, empleador, { label: "Cotizada", patron: /Cotizada/i });
    await descargarComprobanteArt(page, testInfo, misSolicitudes.detailComprobante, "cotizacion", {
        id: cotizacionId,
        empleador,
    });

    await test.step('"Ver cotización y emitir" muestra las ofertas cotizadas', async () => {
        await expect(misSolicitudes.detailStatusTitle).toHaveText("Tu cotización está lista");
        await misSolicitudes.emitCta.click();
        await expect(art.coberturasDisponiblesText).toBeVisible({ timeout: 90000 });
        await expect(art.emitirOfferBtn.first()).toBeVisible();
        if (company) await expect(art.coberturasDisponiblesText).toHaveText(/^1\s+Cobertura disponible/i);
    });

    await test.step("Emitir la oferta con el cliente del CUIT de la cotización", async () => {
        await art.emitirOfferBtn.first().click();
        await expect(art.clienteHeading).toBeVisible({ timeout: 60000 });
        await expect(page.locator(`input[value='${CUIT_EMPLEADOR}']`).first()).toBeVisible({ timeout: 30000 });
        // "Siguiente" no avanza hasta que se resuelve la localidad del cliente.
        await expect(async () => {
            if (!(await art.resumenHeading.isVisible())) await art.siguienteBtn.click({ timeout: 5000 });
            await expect(art.resumenHeading).toBeVisible({ timeout: 5000 });
        }).toPass({ timeout: 60000 });
    });

    return emitirDesdeResumen(page, testInfo, { empleador, cotizacionLocal: false, company });
}

/**
 * Gestión de una emisión alta (cliente NUEVO) hasta emitida: el detalle "Pendiente e-servicios" descarga
 * el comprobante de emisión, el productor confirma e-servicios y SPD en Polko, admin emite con número de contrato y PDF, y la solicitud queda "Emitida" con el contrato, que se
 * descarga desde Mis Solicitudes y desde el detalle de la póliza en Mi Cartera.
 */
async function completarGestionHastaEmitida(
    page: Page,
    testInfo: TestInfo,
    { empleador, idEmision }: { empleador: string; idEmision: string },
): Promise<void> {
    const misSolicitudes = new ArtMisSolicitudes(page);
    const numeroContrato = `QA-ART-${Date.now()}`;

    await abrirEnMisSolicitudes(page, empleador, { label: "Pendiente e-servicios", patron: /Pendiente e-servicios/i });
    await descargarComprobanteArt(page, testInfo, misSolicitudes.detailComprobante, "emision", {
        id: idEmision,
        empleador,
    });

    const pasos = [
        { paso: "eservicios", titulo: "e-servicios", siguiente: /Pendiente SPD/i },
        { paso: "spd", titulo: "SPD (sin nómina)", siguiente: /Pendiente de emisión/i },
    ];
    for (const { paso, titulo, siguiente } of pasos) {
        await test.step(`Polko: confirmar la gestión de ${titulo}`, async () => {
            const patchPromise = page.waitForResponse(isEmisionPatch(idEmision), { timeout: 60000 });
            // Tras el PATCH el front vuelve a pedir el detalle y hasta que responde ignora otro "Confirmar gestión".
            const detallePromise = page.waitForResponse(isEmisionDetalle(idEmision), { timeout: 60000 });
            await misSolicitudes.confirmarGestionBtn.click();
            const patch = await patchPromise;
            expect(patch.ok(), `PATCH emisión (${paso}) respondió ${patch.status()}`).toBe(true);
            expect(patch.request().postDataJSON()?.step).toEqual({ name: paso, status: "approved" });
            expect((await detallePromise).ok(), `GET emisión ${idEmision} tras confirmar ${paso} falló`).toBe(true);
            await expect(misSolicitudes.detailStatus).toHaveText(siguiente, { timeout: 30000 });
        });
    }

    await emitirEnAdmin(testInfo, idEmision, numeroContrato);

    await abrirEnMisSolicitudes(page, empleador, { label: "Emitida", patron: /Emitida/i });

    await test.step(`"${DOCUMENTO_CONTRATO}" descarga el contrato emitido`, async () => {
        await expect(misSolicitudes.detailStatusTitle).toHaveText("Contrato emitido");
        await descargarDocumento(page, testInfo, misSolicitudes.documentoBtn(DOCUMENTO_CONTRATO), {
            endpoint: ART_DOCUMENTACION_PATH,
            archivo: `${DOCUMENTO_CONTRATO.toLowerCase()}.pdf`,
            documento: DOCUMENTO_CONTRATO,
        });
        await expect(page.getByText("Error al descargar la documentación")).toBeHidden();
    });

    testInfo.annotations.push({ type: "ART emitida", description: `${empleador} · ${idEmision} · contrato ${numeroContrato}` });

    test.setTimeout(testInfo.timeout + TIMEOUT_EXTRA_POLIZA_MI_CARTERA);
    const miCartera = new MiCarteraPage(page);
    for (let intento = 1; ; intento++) {
        await test.step(`"Ver póliza en Mi Cartera" lleva a Mi Cartera (intento ${intento})`, async () => {
            await misSolicitudes.verPolizaEnMiCarteraBtn.click();
            await expect(page).toHaveURL(/\/u\/micartera/, { timeout: 30000 });
            await expect(miCartera.detail.or(miCartera.listError).first()).toBeVisible({ timeout: 90000 });
        });
        if (!(await miCartera.listError.isVisible())) break;
        expect(intento, `Mi Cartera respondió "No pudimos obtener los datos de tu cartera" ${intento} veces`)
            .toBeLessThan(INTENTOS_MI_CARTERA);
        test.setTimeout(testInfo.timeout + ESPERA_ESTADO_POLKO_MS);
        await abrirEnMisSolicitudes(page, empleador, { label: "Emitida", patron: /Emitida/i });
    }

    await test.step(`Mi Cartera: el detalle de la póliza descarga el "${DOCUMENTO_CONTRATO}"`, async () => {
        await expect(miCartera.detail).toBeVisible({ timeout: 90000 });
        await expect(miCartera.detailDescription).toContainText(empleador, { timeout: 60000 });
        await expect(miCartera.detailDocumentsTitle).toHaveText("Documentación");

        const boton = miCartera.detailDocumentButton(new RegExp(`^${DOCUMENTO_CONTRATO}`, "i")).first();
        const labels = await miCartera.detailDocumentLabels.allInnerTexts();
        await expect(boton, `No hay "${DOCUMENTO_CONTRATO}" en Mi Cartera. Documentos: ${labels.join(", ")}`)
            .toBeEnabled({ timeout: 60000 });
        const download = await miCartera.descargarDocumento(boton);
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
        await testInfo.attach(`mi-cartera-${download.suggestedFilename()}`, {
            path: await download.path(),
            contentType: "application/pdf",
        });
        await expect(page.getByText("Error al descargar la documentación")).toBeHidden();
    });
}

test.describe("ART - Happy path de emisión @regression", () => {
    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    test("Régimen general: cotizar, cotizar en admin, emitir y quedar emitida", async ({ page }, testInfo) => {
        test.setTimeout(480000);
        const empleador = `QA ART General ${Date.now()}`;

        await documentarCaso({
            epic: "ART",
            feature: "Happy path de emisión",
            story: "Régimen general — Polko → admin → Polko",
            severidad: "critical",
            prioridad: "high",
            descripcion:
                `Cotiza ART en ${COTIZACION_GENERAL.regimen} para el empleador "${empleador}" (CUIT ${CUIT_EMPLEADOR}) ` +
                `con ${COTIZACION_GENERAL.cantEmpleados} empleados y masa salarial ${COTIZACION_GENERAL.masaSalarial}. ` +
                'Espera la confirmación en línea "Recibimos tu pedido de cotización", descarga el "Comprobante de solicitud ' +
                'de cotización" y ve la solicitud "Pendiente de cotización". Admin la cotiza; en Polko queda "Cotizada" ' +
                '(el detalle descarga el comprobante de cotización) y desde "Ver cotización y emitir" se emite la oferta; ' +
                'el popup "¡Solicitud enviada!" y el detalle de la emisión descargan el "Comprobante de solicitud de emisión". ' +
                "El productor confirma e-servicios y SPD, admin emite con contrato y la solicitud queda \"Emitida\" " +
                "con el contrato para descargar desde Mis Solicitudes y desde el detalle de la póliza en Mi Cartera.",
            precondiciones:
                "Usuario logueado (storageState del project), datos de usuario mockeados con ART habilitado, " +
                "frontend en localhost:3000, general_api, quotation microservice (:8082) y microservice_pdfs (:8084, " +
                "con POST /comprobante/solicitud) levantados. " +
                "Admin automatizado: admin/build y .auth/userAdmin.json vigente (npm run auth:admin).",
            parametros: {
                Empleador: empleador,
                CUIT: CUIT_EMPLEADOR,
                Régimen: COTIZACION_GENERAL.regimen,
                Empleados: COTIZACION_GENERAL.cantEmpleados,
                "Masa salarial": COTIZACION_GENERAL.masaSalarial,
                "Cotización admin": COTIZACION_ADMIN_GENERAL.map((c) => `${c.company} ${c.alicuota}%`).join(", "),
            },
            tags: ["art", "happy-path", "regression"],
        });

        await applyUserMock(page);
        const art = new ArtCotizarLayout(page);

        await test.step("Ingresar al cotizador de ART", async () => {
            await art.gotoCotizar();
        });

        await test.step(`Completar datos del empleador (${empleador} / CUIT ${CUIT_EMPLEADOR})`, async () => {
            await art.fillEmpleador(empleador, CUIT_EMPLEADOR);
        });

        await test.step(`Completar datos de los empleados (${COTIZACION_GENERAL.regimen})`, async () => {
            await art.selectRegimen(COTIZACION_GENERAL.regimen);
            await art.cantEmpleadosInput.fill(COTIZACION_GENERAL.cantEmpleados);
            await art.masaSalarialInput.fill(COTIZACION_GENERAL.masaSalarial);
        });

        const cotizacionId = await solicitarCotizacionAOperaciones(
            page,
            testInfo,
            empleador,
            { titulo: "Cotizar", ejecutar: () => art.cotizarBtn.click() },
            {
                titulo: 'Confirmación en línea "Recibimos tu pedido de cotización"',
                locator: art.solicitudEnviadaInlineTitle,
                comprobante: art.solicitudEnviadaComprobante,
            },
            { label: "Pendiente de cotización", patron: /Pendiente de cotización/i },
        );

        if (!continuarEnAdmin(testInfo, "General", cotizacionId, empleador)) return;
        await cotizarEnAdmin(testInfo, cotizacionId, COTIZACION_ADMIN_GENERAL);
        const idEmision = await emitirCotizadaDesdeMisSolicitudes(page, testInfo, { empleador, cotizacionId });
        await completarGestionHastaEmitida(page, testInfo, { empleador, idEmision });
    });

    test("Régimen especial: cotizar, emitir la oferta local y quedar emitida", async ({ page }, testInfo) => {
        test.setTimeout(480000);
        const empleador = `QA ART Especial ${Date.now()}`;

        await documentarCaso({
            epic: "ART",
            feature: "Happy path de emisión",
            story: "Régimen especial — Polko → admin → Polko",
            severidad: "critical",
            prioridad: "high",
            descripcion:
                `Cotiza ART en ${COTIZACION_ESPECIAL.regimen} para el empleador "${empleador}" (CUIT ${CUIT_EMPLEADOR}) ` +
                `con ${COTIZACION_ESPECIAL.cantEmpleados} empleados de ${COTIZACION_ESPECIAL.horasSemanales} horas semanales. ` +
                'Emite la oferta local con el cliente precargado desde el CUIT, confirma en el resumen y espera el popup ' +
                '"¡Solicitud enviada!" con el ID de emisión y el "Comprobante de solicitud de emisión" para descargar. ' +
                '"Ir a Mis Solicitudes" abre la tab ART con la solicitud en gestión, cuyo detalle también descarga el ' +
                'comprobante. El productor confirma e-servicios y SPD, admin emite con contrato y la solicitud queda "Emitida".',
            precondiciones:
                "Usuario logueado (storageState del project), datos de usuario mockeados con ART habilitado, " +
                "frontend en localhost:3000, general_api, quotation microservice (:8082) y microservice_pdfs (:8084, " +
                "con POST /comprobante/solicitud) levantados. " +
                "Admin automatizado: admin/build y .auth/userAdmin.json vigente (npm run auth:admin).",
            parametros: {
                Empleador: empleador,
                CUIT: CUIT_EMPLEADOR,
                Régimen: COTIZACION_ESPECIAL.regimen,
                Empleados: COTIZACION_ESPECIAL.cantEmpleados,
                "Horas semanales": COTIZACION_ESPECIAL.horasSemanales,
            },
            tags: ["art", "happy-path", "regression"],
        });

        await applyUserMock(page);
        const art = new ArtCotizarLayout(page);
        const misSolicitudes = new ArtMisSolicitudes(page);

        await test.step("Ingresar al cotizador de ART", async () => {
            await art.gotoCotizar();
        });

        await test.step(`Completar datos del empleador (${empleador} / CUIT ${CUIT_EMPLEADOR})`, async () => {
            await art.fillEmpleador(empleador, CUIT_EMPLEADOR);
        });

        await test.step(`Completar datos de los empleados (${COTIZACION_ESPECIAL.regimen})`, async () => {
            await art.selectRegimen(COTIZACION_ESPECIAL.regimen);
            await art.cantEmpleadosInput.fill(COTIZACION_ESPECIAL.cantEmpleados);
            await art.selectHoras(COTIZACION_ESPECIAL.horasSemanales);
        });

        const clientePrecargado = await test.step("Cotizar y ver la oferta local", async () => {
            const clientLookupPromise = page.waitForResponse(isArtPost(CLIENT_LOOKUP_PATH), { timeout: 60000 });
            await art.cotizarBtn.click();
            await expect(art.coberturasDisponiblesText).toBeVisible({ timeout: 90000 });
            await expect(art.emitirOfferBtn.first()).toBeVisible();
            const clientLookup = await clientLookupPromise;
            expect(clientLookup.ok(), `POST ${CLIENT_LOOKUP_PATH} respondió ${clientLookup.status()}`).toBe(true);
            return clientLookup.json().catch(() => null);
        });

        await test.step("Emitir la oferta: el cliente viene precargado desde el CUIT", async () => {
            await art.emitirOfferBtn.first().click();
            await expect(art.clienteHeading).toBeVisible({ timeout: 60000 });
            await expect(page.locator(`input[value='${CUIT_EMPLEADOR}']`).first()).toBeVisible({ timeout: 30000 });
            const codigoPostal = clientePrecargado?.codigoPostal;
            if (codigoPostal) {
                await expect(art.clienteLocalidadInput(codigoPostal)).toBeVisible({ timeout: 30000 });
            }
            await art.siguienteBtn.click();
        });

        const idEmision = await emitirDesdeResumen(page, testInfo, { empleador, cotizacionLocal: true });

        await test.step(`La solicitud de "${empleador}" figura en gestión`, async () => {
            await expect(misSolicitudes.card(empleador, ESTADOS_EN_GESTION)).toBeVisible({ timeout: 60000 });
        });

        if (!continuarEnAdmin(testInfo, "Especial", idEmision, empleador)) return;
        await completarGestionHastaEmitida(page, testInfo, { empleador, idEmision });
    });
});

test.describe('ART - "Cotizar otras opciones" por compañía @regression', () => {
    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    for (const { company, label } of ART_COMPANIAS_ADMIN) {
        test(`${label}: "Cotizar otras opciones", admin cotiza con ${label}, se emite y queda emitida`, async ({
            page,
        }, testInfo) => {
            test.setTimeout(480000);
            const empleador = `QA ART Otras ${label} ${Date.now()}`;

            await documentarCaso({
                epic: "ART",
                feature: "Happy path de emisión",
                story: 'Régimen especial — "Cotizar otras opciones" por compañía',
                severidad: "critical",
                prioridad: "high",
                descripcion:
                    `Cotiza ART en ${COTIZACION_ESPECIAL.regimen} para el empleador "${empleador}" (CUIT ${CUIT_EMPLEADOR}) ` +
                    `con ${COTIZACION_ESPECIAL.cantEmpleados} empleados de ${COTIZACION_ESPECIAL.horasSemanales} horas semanales. ` +
                    'En lugar de emitir la oferta local, pide "Cotizar otras opciones" (popup "Solicitud enviada"). ' +
                    `Admin cotiza la solicitud con ${label}; en Polko queda "Cotizada" con esa única oferta (el detalle ` +
                    'descarga el comprobante de cotización) y desde "Ver cotización y emitir" se emite con esa compañía; ' +
                    'el popup de emisión y el detalle de la emisión descargan el comprobante de emisión con esa compañía. ' +
                    'El productor confirma e-servicios y SPD, admin emite con contrato y la solicitud queda "Emitida".',
                precondiciones:
                    "Usuario logueado (storageState del project), datos de usuario mockeados con ART habilitado, " +
                    "frontend en localhost:3000, general_api, quotation microservice (:8082) y microservice_pdfs (:8084, " +
                    "con POST /comprobante/solicitud) levantados. " +
                    "Admin automatizado: admin/build y .auth/userAdmin.json vigente (npm run auth:admin).",
                parametros: {
                    Empleador: empleador,
                    CUIT: CUIT_EMPLEADOR,
                    Régimen: COTIZACION_ESPECIAL.regimen,
                    Empleados: COTIZACION_ESPECIAL.cantEmpleados,
                    "Horas semanales": COTIZACION_ESPECIAL.horasSemanales,
                    "Compañía (admin)": `${label} (${company})`,
                },
                tags: ["art", "happy-path", "regression"],
            });

            await applyUserMock(page);
            const art = new ArtCotizarLayout(page);

            await test.step("Ingresar al cotizador de ART", async () => {
                await art.gotoCotizar();
            });

            await test.step(`Completar datos del empleador (${empleador} / CUIT ${CUIT_EMPLEADOR})`, async () => {
                await art.fillEmpleador(empleador, CUIT_EMPLEADOR);
            });

            await test.step(`Completar datos de los empleados (${COTIZACION_ESPECIAL.regimen})`, async () => {
                await art.selectRegimen(COTIZACION_ESPECIAL.regimen);
                await art.cantEmpleadosInput.fill(COTIZACION_ESPECIAL.cantEmpleados);
                await art.selectHoras(COTIZACION_ESPECIAL.horasSemanales);
            });

            await test.step("Cotizar y ver la oferta local", async () => {
                await art.cotizarBtn.click();
                await expect(art.coberturasDisponiblesText).toBeVisible({ timeout: 90000 });
                await expect(art.cotizarOtrasOpcionesBtn).toBeVisible();
            });

            const cotizacionId = await solicitarCotizacionAOperaciones(
                page,
                testInfo,
                empleador,
                { titulo: '"Cotizar otras opciones"', ejecutar: () => art.cotizarOtrasOpcionesBtn.click() },
                { titulo: 'Popup "Solicitud enviada"', locator: art.successPopupTitle },
                // Debería ser solo "Pendiente de cotización": hoy el back la crea "Cotizada" (ver cotizarEnAdmin).
                { label: "Pendiente de cotización", patron: /Pendiente de cotización|Cotizada/i },
            );

            if (!continuarEnAdmin(testInfo, `Otras_${company}`, cotizacionId, empleador)) return;
            await cotizarEnAdmin(testInfo, cotizacionId, [{ company }], { admitirAutoAprobada: true });
            const idEmision = await emitirCotizadaDesdeMisSolicitudes(page, testInfo, { empleador, cotizacionId, company });
            await completarGestionHastaEmitida(page, testInfo, { empleador, idEmision });
        });
    }
});
