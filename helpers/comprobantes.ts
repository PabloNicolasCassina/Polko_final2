import { test, expect, type Locator, type Page, type Response, type TestInfo } from "@playwright/test";

const DESCARGA_TIMEOUT = 120000;

/**
 * Comprobantes de solicitud (`POST /comprobante/solicitud` en microservice_pdfs). Los usan OPF
 * (pantalla de éxito; "cotizacion" solo en el alta `catalogExtra`) y ART (confirmación de cotización,
 * popup de emisión y detalle en Mis Solicitudes) con los mismos labels y nombres de archivo.
 */
export const COMPROBANTE_SOLICITUD = {
    cotizacion: {
        label: "Comprobante de solicitud de cotización",
        archivo: "comprobante_solicitud_cotizacion.pdf",
    },
    emision: {
        label: "Comprobante de solicitud de emisión",
        archivo: "comprobante_solicitud_emision.pdf",
    },
} as const;

export type TipoComprobanteSolicitud = keyof typeof COMPROBANTE_SOLICITUD;

const COMPROBANTE_SOLICITUD_ENDPOINT = /\/comprobante\/solicitud$/;
const COMPROBANTE_SOLICITUD_ERROR = "No pudimos descargar el comprobante";
/** Peor caso de esperas de `descargarComprobanteEmision`, para que no se coma el timeout del test. */
const TIMEOUT_MAX_COMPROBANTE = 30000 + 60000 + DESCARGA_TIMEOUT + 30000;

export const COMPROBANTE_EMISION_LABEL = "Comprobante de emisión";
const COMPROBANTE_EMISION_DOCUMENTO = "COMPROBANTE_DE_EMISION";
const COMPROBANTE_EMISION_ARCHIVO = "comprobante_de_emision.pdf";
/** Opción del select del modal legacy (`.SEmission__popup`, AP): el front reemplaza "_" por " ". */
const COMPROBANTE_EMISION_OPCION_LEGACY = "COMPROBANTE DE EMISION";

interface DescargaEsperada {
    /** Pathname del POST que genera el PDF. */
    endpoint: RegExp;
    archivo: string;
    /** Valor de `documento` que tiene que viajar en el body del POST. */
    documento?: string;
}

/**
 * Click en `boton`, valida el POST que genera el PDF y el archivo descargado, y lo adjunta al reporte.
 * Devuelve la response del POST.
 */
export async function descargarDocumento(
    page: Page,
    testInfo: TestInfo,
    boton: Locator,
    esperado: DescargaEsperada,
): Promise<Response> {
    await expect(boton).toBeEnabled({ timeout: 60000 });
    const responsePromise = page.waitForResponse(
        (response) =>
            response.request().method() === "POST" && esperado.endpoint.test(new URL(response.url()).pathname),
        { timeout: DESCARGA_TIMEOUT },
    );
    const downloadPromise = page.waitForEvent("download", { timeout: DESCARGA_TIMEOUT });
    downloadPromise.catch(() => undefined);
    await boton.click();

    const response = await responsePromise;
    expect(response.ok(), `${new URL(response.url()).pathname} respondió ${response.status()}`).toBe(true);
    if (esperado.documento) {
        expect(response.request().postDataJSON()?.documento).toBe(esperado.documento);
    }
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(esperado.archivo);
    await testInfo.attach(download.suggestedFilename(), {
        path: await download.path(),
        contentType: "application/pdf",
    });
    return response;
}

/**
 * Descarga el comprobante de solicitud de `tipo` desde la fila `.EmissionDocumentDownloadRow` dentro de
 * `contenedor`. Adjunta el body del POST al reporte y lo devuelve.
 */
export async function descargarComprobanteSolicitud(
    page: Page,
    testInfo: TestInfo,
    tipo: TipoComprobanteSolicitud,
    contenedor: Page | Locator = page,
): Promise<any> {
    const { label, archivo } = COMPROBANTE_SOLICITUD[tipo];
    return test.step(`"${label}" descarga el comprobante`, async () => {
        const boton = contenedor
            .locator(".EmissionDocumentDownloadRow")
            .filter({ has: page.getByText(label, { exact: true }) })
            .getByRole("button", { name: "Descargar" });
        const response = await descargarDocumento(page, testInfo, boton, {
            endpoint: COMPROBANTE_SOLICITUD_ENDPOINT,
            archivo,
        });
        await expect(page.getByText(COMPROBANTE_SOLICITUD_ERROR, { exact: true })).toBeHidden();
        const body = response.request().postDataJSON();
        await testInfo.attach(`comprobante-solicitud-${tipo}-request.json`, {
            body: JSON.stringify(body, null, 2),
            contentType: "application/json",
        });
        return body;
    });
}

/**
 * Como `descargarComprobanteSolicitud`, pero no falla el test: si la descarga no anda, deja una
 * anotación "Advertencia" con screenshot.
 */
export async function intentarDescargarComprobanteSolicitud(
    page: Page,
    testInfo: TestInfo,
    tipo: TipoComprobanteSolicitud,
    contenedor: Page | Locator = page,
): Promise<void> {
    testInfo.setTimeout(testInfo.timeout + TIMEOUT_MAX_COMPROBANTE);
    try {
        await descargarComprobanteSolicitud(page, testInfo, tipo, contenedor);
    } catch (error) {
        await advertirDescargaFallida(page, testInfo, COMPROBANTE_SOLICITUD[tipo].label, error);
    }
}

async function advertirDescargaFallida(page: Page, testInfo: TestInfo, label: string, error: unknown): Promise<void> {
    const motivo = (error instanceof Error ? error.message : String(error))
        .replace(/\u001b\[[0-9;]*m/g, "")
        .split("\n")[0];
    testInfo.annotations.push({
        type: "Advertencia",
        description: `No se pudo descargar el "${label}": ${motivo}`,
    });
    const screenshot = await page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
        await testInfo.attach(`${label} - no descargado`, { body: screenshot, contentType: "image/png" });
    }
}

/**
 * Descarga el "Comprobante de emisión" de la pantalla de éxito de una emisión. Soporta el éxito
 * rediseñado (fila `.EmissionDocumentDownloadRow`, auto/moto) y el modal legacy con select (AP).
 * No falla el test: si la descarga no anda, deja una anotación "Advertencia" con screenshot.
 */
export async function descargarComprobanteEmision(page: Page, testInfo: TestInfo): Promise<void> {
    testInfo.setTimeout(testInfo.timeout + TIMEOUT_MAX_COMPROBANTE);
    try {
        const fila = page
            .locator(".EmissionDocumentDownloadRow")
            .filter({ has: page.getByText(COMPROBANTE_EMISION_LABEL, { exact: true }) });
        const legacy = page.locator(".SEmission__documentacionSection");
        await expect(fila.or(legacy)).toBeVisible({ timeout: 30000 });

        let boton: Locator;
        if (await fila.isVisible()) {
            boton = fila.getByRole("button", { name: "Descargar" });
        } else {
            await legacy.locator(".mantine-Select-input").click();
            await page.getByRole("option", { name: COMPROBANTE_EMISION_OPCION_LEGACY, exact: true }).click();
            boton = legacy.getByRole("button", { name: /^descargar$/i });
        }

        await descargarDocumento(page, testInfo, boton, {
            endpoint: /\/documentacion\/[^/]+$/,
            archivo: COMPROBANTE_EMISION_ARCHIVO,
            documento: COMPROBANTE_EMISION_DOCUMENTO,
        });
        await expect(page.getByText("Error al descargar la documentación")).toBeHidden();
    } catch (error) {
        await advertirDescargaFallida(page, testInfo, COMPROBANTE_EMISION_LABEL, error);
    }
}
