import * as fs from "fs";

/**
 * pdf-parse 2.x pide Node >= 20.16 y referencia DOMMatrix/ImageData/Path2D al cargarse; para extraer
 * texto alcanzan stubs vacíos. Se carga recién al leer un PDF para no romper a quien solo use los parsers.
 */
async function leerPdf(pdfPath: string, opts: { links?: boolean } = {}): Promise<{ texto: string; links: string[] }> {
    for (const nombre of ["DOMMatrix", "ImageData", "Path2D"]) {
        if (!(nombre in globalThis)) (globalThis as Record<string, unknown>)[nombre] = class {};
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
    try {
        const texto: string = (await parser.getText()).text;
        if (!opts.links) return { texto, links: [] };
        const info = await parser.getInfo({ parsePageInfo: true });
        const links: string[] = (info.pages ?? []).flatMap((pagina: { links?: { url?: string }[] }) =>
            (pagina.links ?? []).map((link) => link.url).filter((url): url is string => Boolean(url)),
        );
        return { texto, links };
    } finally {
        await parser.destroy();
    }
}

async function extraerTextoPdf(pdfPath: string): Promise<string> {
    return (await leerPdf(pdfPath)).texto;
}

/**
 * Convierte un monto con formato AR ("$106.078", "106.078,45") o US ("106,078.45", "106078.45") a número.
 * Un único separador seguido de exactamente 3 dígitos se toma como separador de miles.
 */
export function parseMontoArs(texto: string): number {
    const limpio = texto.replace(/[^\d.,]/g, "");
    const ultimoPunto = limpio.lastIndexOf(".");
    const ultimaComa = limpio.lastIndexOf(",");
    let normalizado: string;
    if (ultimoPunto >= 0 && ultimaComa >= 0) {
        const decimal = ultimoPunto > ultimaComa ? "." : ",";
        const miles = decimal === "." ? "," : ".";
        normalizado = limpio.split(miles).join("").replace(decimal, ".");
    } else if (ultimoPunto >= 0 || ultimaComa >= 0) {
        const sep = ultimoPunto >= 0 ? "." : ",";
        const partes = limpio.split(sep);
        const esMiles = partes.length > 2 || partes[partes.length - 1].length === 3;
        normalizado = esMiles ? partes.join("") : partes.join(".");
    } else {
        normalizado = limpio;
    }
    return Number(normalizado);
}

/** Montos del texto: números con separadores o decimales, y enteros solo si van precedidos de "$". */
export function extraerMontos(texto: string): number[] {
    const regex = /(\$\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}|\d{4,})/g;
    const montos: number[] = [];
    for (const match of texto.matchAll(regex)) {
        const [, signo, valor] = match;
        if (!signo && /^\d+$/.test(valor)) continue;
        const monto = parseMontoArs(valor);
        if (Number.isFinite(monto) && monto > 0) montos.push(monto);
    }
    return montos;
}

const normalizarAlfanumerico = (valor: string): string =>
    valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

export interface ResultadoPdfPoliza {
    texto: string;
    contienePatente: boolean | null;
    contieneNumero: boolean | null;
    montosEncontrados: number[];
    montoCoincidente: { esperado: number; encontrado: number } | null;
}

/**
 * Lee el PDF descargado y verifica que sea la póliza esperada (patente y número, si se pasan)
 * y que algún monto del documento esté dentro de `tolerancia` de alguno de `montosEsperados`.
 */
export async function analizarPdfPoliza(
    pdfPath: string,
    esperado: { patente?: string; numero?: string; montosEsperados: number[]; tolerancia?: number },
): Promise<ResultadoPdfPoliza> {
    const text = await extraerTextoPdf(pdfPath);
    const textoPlano = normalizarAlfanumerico(text);
    const tolerancia = esperado.tolerancia ?? 0.01;
    const montosEncontrados = extraerMontos(text);

    let montoCoincidente: ResultadoPdfPoliza["montoCoincidente"] = null;
    for (const objetivo of esperado.montosEsperados) {
        const encontrado = montosEncontrados.find((monto) => Math.abs(monto - objetivo) <= objetivo * tolerancia);
        if (encontrado !== undefined) {
            montoCoincidente = { esperado: objetivo, encontrado };
            break;
        }
    }

    return {
        texto: text,
        contienePatente: esperado.patente ? textoPlano.includes(normalizarAlfanumerico(esperado.patente)) : null,
        contieneNumero: esperado.numero ? textoPlano.includes(normalizarAlfanumerico(esperado.numero)) : null,
        montosEncontrados,
        montoCoincidente,
    };
}

export interface ResultadoPdfCotizacion {
    texto: string;
    montosEncontrados: number[];
    contieneMonto: boolean;
    /** Textos pedidos en `textosEsperados` que no aparecen en el PDF (comparación sin espacios, acentos ni símbolos). */
    textosFaltantes: string[];
    /** N de "Mismo precio por N meses"; null si el PDF no muestra cuotas. */
    cuotas: number | null;
    /** URLs de los botones "Emitir" (links de compra protegida `...emision?compra=...`). */
    linksEmitir: string[];
}

/**
 * Lee el PDF de cotización ("Compará coberturas"): premio exacto, textos esperados (plan, vehículo,
 * coberturas), cuotas y links de "Emitir".
 */
export async function analizarPdfCotizacion(
    pdfPath: string,
    premio: number,
    textosEsperados: readonly string[] = [],
): Promise<ResultadoPdfCotizacion> {
    const { texto, links } = await leerPdf(pdfPath, { links: true });
    const montosEncontrados = extraerMontos(texto);
    const textoPlano = normalizarAlfanumerico(texto);
    const cuotas = texto.match(/Mismo\s+precio\s+por\s+(\d+)\s+mes/i)?.[1];
    return {
        texto,
        montosEncontrados,
        contieneMonto: montosEncontrados.includes(premio),
        textosFaltantes: textosEsperados.filter((esperado) => !textoPlano.includes(normalizarAlfanumerico(esperado))),
        cuotas: cuotas ? Number(cuotas) : null,
        linksEmitir: links.filter((url) => /[?&]compra=/.test(url)),
    };
}
