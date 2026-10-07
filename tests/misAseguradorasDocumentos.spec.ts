/// <reference types="node" />
import * as path from "path";
import { test, expect } from "@playwright/test";
import MisAseguradorasPage from "../pages/misAseguradorasPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";

// POL-2872 (Release 48) - bloques A, B y C del procedimiento de prueba.
// Usuario: master (userPre.json), vía el proyecto "chromium" (storageState por defecto).

test.afterEach(async ({}, testInfo) => {
    await attachBackendLogsOnFailure(testInfo);
});

test.describe("Mis Aseguradoras - Solicitudes de vinculación/apertura (bloques A y B)", () => {

    test("Mis aseguradoras carga sin errores y expone los accesos de solicitud", async ({ page }) => {
        const misAseguradoras = new MisAseguradorasPage(page);

        await misAseguradoras.navigateToMisAseguradoras();

        await expect(misAseguradoras.title).toBeVisible();
        await expect(misAseguradoras.solicitarAseguradoraCard).toBeVisible();
        await expect(misAseguradoras.misDocumentosCard).toBeVisible();
    });

    test("Mis solicitudes carga sin errores de carga", async ({ page }) => {
        const misAseguradoras = new MisAseguradorasPage(page);

        await misAseguradoras.navigateToMisSolicitudes();

        await expect(misAseguradoras.habilitacionAseguradorasHeading).toBeVisible();
        // NOTA (hallazgo de la exploración manual): con la cuenta master de este entorno
        // (userPre.json) TODAS las aseguradoras del catálogo ya están vinculadas
        // (Sancor, Río Uruguay, Terrawind, Triunfo, Federación Patronal, Mercantil Andina,
        // Rivadavia, Zurich, ATM, Experta), por lo que GET /codes/requests devuelve `[]`
        // y esta pantalla no ofrece ningún selector de aseguradora para iniciar una
        // vinculación/apertura nueva (ni para Sancor ni para Río Uruguay como pide el
        // ticket). No se encontró, además, ninguna aseguradora sin vincular (p.ej. RUS)
        // con una acción de "Solicitar vinculación/apertura" disponible en la UI.
        // Por eso este test solo puede validar el estado vacío observado; los pasos 4-9
        // del ticket (aceptar código Sancor / Río Uruguay y ver "La activación fue
        // enviada.") no son reproducibles con la cuenta y el entorno disponibles.
        await expect(misAseguradoras.sinSolicitudesPendientesText).toBeVisible();
        await expect(misAseguradoras.noPudimosActivarText).not.toBeVisible();
    });
});

test.describe("Mis Documentos - Carga de documentación general (bloque C)", () => {

    test("Subir un PDF real a un documento 'Pendiente de carga' muestra éxito y actualiza la fecha", async ({ page }) => {
        const misAseguradoras = new MisAseguradorasPage(page);
        const pdfPath = path.join(__dirname, "..", "fixtures", "misDocumentos_dniFrente.pdf");

        await misAseguradoras.navigateToMisDocumentos();
        await expect(misAseguradoras.tabGeneral).toBeVisible();

        const nombreDocumento = await misAseguradoras.subirPrimerDocumentoPendiente(pdfPath);
        expect(nombreDocumento.length).toBeGreaterThan(0);

        await expect(misAseguradoras.archivoSubidoCorrectamenteToast).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/se ha subido correctamente\.?/i)).toBeVisible();
        await expect(misAseguradoras.errorAlSubirArchivoToast).not.toBeVisible();

        const subtitulo = misAseguradoras.documentoSubtitulo(nombreDocumento);
        await expect(subtitulo).toContainText("Última modificación");

        const hoy = new Date();
        const dd = String(hoy.getDate()).padStart(2, "0");
        const mm = String(hoy.getMonth() + 1).padStart(2, "0");
        const fechaEsperada = `${dd}/${mm}/${hoy.getFullYear()}`;
        await expect(subtitulo).toContainText(fechaEsperada);
    });
});
