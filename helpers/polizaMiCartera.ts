import { expect, type Page, type TestInfo } from "@playwright/test";
import fs from "fs";
import path from "path";
import MiCarteraPage from "../pages/miCarteraPage";
import { analizarPdfPoliza } from "./pdfPoliza";

export const TOLERANCIA_PRECIO_POLIZA = 0.01;
/** Margen para sumar al timeout del test: Mi cartera tarda en listar la póliza y la descarga es lenta. */
export const TIMEOUT_EXTRA_POLIZA_MI_CARTERA = 180000;
const LABEL_DOCUMENTO_POLIZA = /^p[oó]liza/i;

/**
 * Busca en Mi cartera la póliza recién emitida (por patente o número de póliza), descarga el documento
 * "Póliza" y lo adjunta al reporte. Si no se puede descargar deja una advertencia y devuelve null.
 */
export async function descargarPolizaDesdeMiCartera(
    page: Page,
    testInfo: TestInfo,
    busqueda: string,
    prefijoArchivo: string,
): Promise<string | null> {
    const miCartera = new MiCarteraPage(page);
    try {
        await miCartera.goto();
        const card = await miCartera.buscarPolizaEmitida(busqueda);
        await miCartera.abrirCard(card);
        await expect(miCartera.detailDocumentsTitle).toHaveText("Documentación");

        const boton = miCartera.detailDocumentButton(LABEL_DOCUMENTO_POLIZA).first();
        const labels = await miCartera.detailDocumentLabels.allInnerTexts();
        await expect(boton, `No hay documento de póliza. Documentos disponibles: ${labels.join(", ")}`)
            .toBeEnabled({ timeout: 60000 });
        const download = await miCartera.descargarDocumento(boton);
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

        const destino = path.join(__dirname, "..", "resultados-polizas");
        fs.mkdirSync(destino, { recursive: true });
        const archivo = path.join(destino, `${prefijoArchivo}_${busqueda}_${download.suggestedFilename()}`);
        await download.saveAs(archivo);
        await testInfo.attach(`Poliza-${prefijoArchivo}-${busqueda}`, { path: archivo, contentType: "application/pdf" });
        return archivo;
    } catch (error) {
        const motivo = (error instanceof Error ? error.message : String(error))
            .replace(/\u001b\[[0-9;]*m/g, "")
            .split("\n")[0];
        testInfo.annotations.push({
            type: "Advertencia",
            description: `No se pudo descargar la póliza desde Mi cartera (${busqueda}): ${motivo}`,
        });
        const screenshot = await page.screenshot({ fullPage: true }).catch(() => null);
        if (screenshot) {
            await testInfo.attach("Mi-cartera-poliza-no-descargada", { body: screenshot, contentType: "image/png" });
        }
        return null;
    }
}

/**
 * Valida que el PDF sea la póliza emitida (patente y/o número si se pasan) y que algún monto esté a
 * ±`TOLERANCIA_PRECIO_POLIZA` del premio cotizado (o del premio × cuotas si hay más de una).
 */
export async function validarPdfPoliza(
    testInfo: TestInfo,
    pdfPath: string,
    esperado: { patente?: string; numero?: { tipo: string; valor: string }; premio: number; cuotas?: number },
): Promise<void> {
    const cuotas = esperado.cuotas ?? 1;
    const montosEsperados = [esperado.premio];
    if (cuotas > 1) montosEsperados.push(esperado.premio * cuotas);
    const resultado = await analizarPdfPoliza(pdfPath, {
        patente: esperado.patente,
        numero: esperado.numero?.valor,
        montosEsperados,
        tolerancia: TOLERANCIA_PRECIO_POLIZA,
    });
    await testInfo.attach("Texto-PDF-poliza", { body: resultado.texto, contentType: "text/plain" });

    expect(resultado.texto.trim(), "El PDF no tiene texto extraíble (¿es una imagen escaneada?)").not.toBe("");
    if (resultado.contienePatente !== null) {
        expect(resultado.contienePatente, `El PDF no menciona la patente ${esperado.patente}`).toBe(true);
    }
    if (resultado.contieneNumero !== null) {
        expect.soft(
            resultado.contieneNumero,
            `El PDF no menciona el ${esperado.numero?.tipo} ${esperado.numero?.valor}`,
        ).toBe(true);
    }
    expect(
        resultado.montoCoincidente,
        `Ningún monto del PDF está a ±${TOLERANCIA_PRECIO_POLIZA * 100}% de ${montosEsperados.join(" / ")}. ` +
            `Montos encontrados: ${resultado.montosEncontrados.join(", ")}`,
    ).not.toBeNull();
}
