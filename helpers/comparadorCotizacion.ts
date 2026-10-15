import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import type CtrowAutoTable from "../components/ctrowAutoTable";
import type CotizarAPIAPage from "../pages/cotizarAPIAPage";
import type { PlanAP, ProductoAP } from "../pages/cotizarAPIAPage";
import { analizarPdfCotizacion, type ResultadoPdfCotizacion } from "./pdfPoliza";

const DOWNLOAD_TIMEOUT = 60000;

/** Filas fijas de la tabla de coberturas de `cotizacionAutomotor.html` (microservice_pdfs). */
export const COBERTURAS_PDF_AUTO = [
    "Valor asegurable",
    "Responsabilidad Civil Limitada",
    "Incendio Total",
    "Incendio Parcial",
    "Robo y/o Hurto Total",
    "Robo y/o Hurto Parcial",
    "Accidente Total",
    "Accidente Parcial según Deducible",
    "Granizo/ Terremoto/Indundación Total y Parcial",
    "Rotura de Cristales",
    "Rotura de Cerraduras",
    "Reposición de Ruedas en caso de Robo o Hurto",
    "Daños Parciales al amparo del Robo",
    "Extensión de Cobertura a Países Limítrofes",
    "Asistencia al Vehículo",
    "CLEAS (Sistema Compensación de Siniestros)",
] as const;

export interface EsperadoPdfCotizacion {
    /** Textos que deben aparecer en el PDF (plan, datos del vehículo, coberturas...). */
    textos?: readonly string[];
    /** Textos que deben aparecer en el nombre del archivo descargado. */
    textosNombreArchivo?: readonly string[];
    /** Cuotas mostradas en la tarjeta; 1 = el PDF no debe mostrar "Mismo precio por N meses". */
    cuotas?: number;
    /** true: debe haber links "Emitir" de compra protegida; false: no debe haber ninguno. */
    compraHabilitada?: boolean;
}

const normalizar = (valor: string): string =>
    valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

/**
 * Click en el "Descargar pdf" del comparador, adjunta el PDF y su texto al reporte y verifica que el
 * premio aparezca exacto. Con `esperado` valida además textos, nombre de archivo, cuotas y links de "Emitir".
 */
export async function descargarYValidarPdfCotizacion(
    page: Page,
    testInfo: TestInfo,
    boton: Locator,
    premio: number,
    etiqueta: string,
    esperado: EsperadoPdfCotizacion = {},
): Promise<ResultadoPdfCotizacion> {
    await expect(boton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download", { timeout: DOWNLOAD_TIMEOUT });
    await boton.click();
    const download = await downloadPromise;
    const nombreArchivo = download.suggestedFilename();
    expect(nombreArchivo).toMatch(/\.pdf$/i);

    const archivo = testInfo.outputPath(`Cotizacion-${etiqueta}.pdf`.replace(/[^\w.-]+/g, "_"));
    await download.saveAs(archivo);
    await testInfo.attach(`Cotizacion-${etiqueta}`, { path: archivo, contentType: "application/pdf" });

    const resultado = await analizarPdfCotizacion(archivo, premio, esperado.textos ?? []);
    await testInfo.attach(`Texto-PDF-cotizacion-${etiqueta}`, { body: resultado.texto, contentType: "text/plain" });
    expect(resultado.texto.trim(), "El PDF de cotización no tiene texto extraíble").not.toBe("");
    expect(
        resultado.contieneMonto,
        `El PDF de cotización no muestra $${premio.toLocaleString("es-AR")}. ` +
            `Montos encontrados: ${resultado.montosEncontrados.join(", ")}`,
    ).toBe(true);

    expect.soft(resultado.textosFaltantes, `Textos que faltan en el PDF de cotización (${etiqueta})`).toEqual([]);

    if (esperado.textosNombreArchivo) {
        const faltantes = esperado.textosNombreArchivo.filter((texto) => !normalizar(nombreArchivo).includes(normalizar(texto)));
        expect.soft(faltantes, `Textos que faltan en el nombre del PDF "${nombreArchivo}"`).toEqual([]);
    }

    if (esperado.cuotas !== undefined) {
        expect
            .soft(resultado.cuotas ?? 1, `Las cuotas del PDF no coinciden con las de la tarjeta (${esperado.cuotas})`)
            .toBe(esperado.cuotas);
    }

    if (esperado.compraHabilitada === true) {
        expect(resultado.linksEmitir.length, 'Con "Habilitar compra" el PDF debería tener links "Emitir"').toBeGreaterThan(0);
        for (const url of resultado.linksEmitir) {
            expect.soft(url, 'El link "Emitir" no apunta a la emisión de compra protegida').toMatch(/\/emision\?compra=.+/);
        }
        await testInfo.attach(`Links-Emitir-${etiqueta}`, { body: resultado.linksEmitir.join("\n"), contentType: "text/plain" });
    } else if (esperado.compraHabilitada === false) {
        expect(resultado.linksEmitir, 'Sin "Habilitar compra" el PDF no debería tener links "Emitir"').toEqual([]);
    }

    return resultado;
}

export interface OpcionesComparadorCtrowAuto {
    /** Textos del vehículo que debe mostrar el PDF (marca, versión, año, CP, localidad). */
    textosVehiculo?: readonly string[];
    /** Textos del vehículo que debe tener el nombre del archivo (marca, modelo, año). */
    textosNombreArchivo?: readonly string[];
    /** Filas de cobertura que debe listar el PDF. */
    coberturas?: readonly string[];
    /** Cuotas mostradas en la tarjeta del plan. */
    cuotas?: number;
    /** Descarga un segundo PDF con "Habilitar compra" y valida los links "Emitir". */
    validarCompra?: boolean;
}

/**
 * Tabla `.ctrowAuto` (auto/moto IA): agrega el plan, abre "COMPARAR (n)", verifica que el
 * drawer muestre el mismo premio que la tarjeta, descarga el PDF y lo valida. Devuelve el premio.
 * Con `opciones` valida también nombre del plan, vehículo, coberturas, cuotas y links "Emitir".
 */
export async function validarComparadorCtrowAuto(
    page: Page,
    testInfo: TestInfo,
    tabla: CtrowAutoTable,
    codigo: string,
    etiqueta: string,
    opciones?: OpcionesComparadorCtrowAuto,
): Promise<number> {
    const premio = await tabla.precioPlan(codigo);
    expect(premio, `El plan ${codigo} no tiene precio`).toBeGreaterThan(0);
    const nombrePlan = opciones ? await tabla.nombrePlan(codigo) : "";

    await tabla.agregarBtn(codigo).click();
    await expect(tabla.compararBtn).toHaveText(/COMPARAR \(\d+\)/);
    await tabla.compararBtn.click();
    await expect(tabla.drawerItem(codigo)).toBeVisible();
    expect(await tabla.precioDrawer(codigo), "El precio del comparador no coincide con el de la tarjeta").toBe(premio);

    if (!opciones) {
        await descargarYValidarPdfCotizacion(page, testInfo, tabla.descargarPdfComparacionBtn, premio, etiqueta);
    } else {
        const esperado: EsperadoPdfCotizacion = {
            textos: [nombrePlan, ...(opciones.textosVehiculo ?? []), ...(opciones.coberturas ?? [])].filter(Boolean),
            textosNombreArchivo: opciones.textosNombreArchivo,
            cuotas: opciones.cuotas,
        };

        if (opciones.validarCompra) await expect(tabla.habilitarCompraSwitch).not.toBeChecked();
        await descargarYValidarPdfCotizacion(page, testInfo, tabla.descargarPdfComparacionBtn, premio, etiqueta, {
            ...esperado,
            compraHabilitada: opciones.validarCompra ? false : undefined,
        });

        if (opciones.validarCompra) {
            await tabla.habilitarCompraLabel.click();
            await expect(tabla.habilitarCompraSwitch).toBeChecked();
            await descargarYValidarPdfCotizacion(page, testInfo, tabla.descargarPdfComparacionBtn, premio, `${etiqueta}-compra`, {
                ...esperado,
                compraHabilitada: true,
            });
        }
    }

    await tabla.cerrarDrawerComparar.click();
    await expect(tabla.drawer).toBeHidden();
    return premio;
}

/**
 * Tabla legacy de AP: agrega el plan al carrito, abre "Comparar", verifica que el modal muestre
 * el premio total de la fila, descarga el PDF y lo valida. Devuelve el premio total.
 */
export async function validarComparadorAP(
    page: Page,
    testInfo: TestInfo,
    cotizarAP: CotizarAPIAPage,
    producto: ProductoAP,
    plan: PlanAP,
    etiqueta: string,
): Promise<number> {
    const premioTotal = await cotizarAP.planPrecioTotal(producto, plan);
    expect(premioTotal, `${producto} / ${plan} no tiene premio total`).toBeGreaterThan(0);

    await cotizarAP.abrirComparador(producto, plan);
    expect(await cotizarAP.precioComparador(plan), "El premio del comparador no coincide con el de la fila").toBe(premioTotal);

    await descargarYValidarPdfCotizacion(page, testInfo, cotizarAP.descargarPdfComparacionBtn, premioTotal, etiqueta);

    await cotizarAP.cerrarComparadorBtn.click();
    await expect(cotizarAP.comparadorModal).toBeHidden();
    return premioTotal;
}
