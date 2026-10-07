/**
 * Helper para extraer texto y validar contenido de un PDF
 * Usa pdf-parse para inspeccionar el contenido
 */
import * as fs from 'fs';
// pdf-parse v2.4.5+ exporta PDFParse como clase, no como función
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');

interface PdfLinkAnnotation {
    url: string;
    pageNumber: number;
    text?: string; // Texto asociado al link (si está disponible)
}

interface PdfAnnotationsResult {
    text: string;
    linkAnnotations: PdfLinkAnnotation[];
    hasEmitirLinks: boolean;
    emitirLinks: PdfLinkAnnotation[];
}

/**
 * Extrae el texto y los links reales (anotaciones) de un PDF
 * @param pdfPath - Ruta absoluta al archivo PDF
 * @returns Objeto con texto y links encontrados (extraídos de las anotaciones del PDF)
 */
export async function extractPdfAnnotations(pdfPath: string): Promise<PdfAnnotationsResult> {
    // Verificar que el archivo existe
    if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF no encontrado: ${pdfPath}`);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);

    // Usar pdf-parse v2.4.5+ API: crear instancia y extraer texto y links
    const pdfParser = new PDFParse({ data: pdfBuffer });
    try {
        // Obtener texto del PDF
        const pdfTextData = await pdfParser.getText();
        const fullText = pdfTextData.text;

        // Obtener links reales del PDF usando getInfo() con parsePageInfo
        const pdfInfo = await pdfParser.getInfo({ parsePageInfo: true });
        
        // Extraer todos los links de todas las páginas
        const linkAnnotations: PdfLinkAnnotation[] = [];
        if (pdfInfo.pages && Array.isArray(pdfInfo.pages)) {
            for (const page of pdfInfo.pages) {
                if (page.links && Array.isArray(page.links)) {
                    for (const link of page.links) {
                        if (link.url) {
                            linkAnnotations.push({
                                url: link.url,
                                pageNumber: page.pageNumber || 1,
                                text: link.text || undefined // Texto asociado al link (si está disponible)
                            });
                        }
                    }
                }
            }
        }

        // Filtrar links que corresponden a "Emitir" (protectedPurchaseLink)
        const emitirLinks = linkAnnotations.filter(link =>
            link.url.includes('compra=') ||
            link.url.includes('emision') ||
            link.url.includes('/u/emision/')
        );

        return {
            text: fullText,
            linkAnnotations,
            hasEmitirLinks: emitirLinks.length > 0,
            emitirLinks
        };
    } finally {
        // Limpiar recursos
        await pdfParser.destroy();
    }

}

/**
 * Valida que el PDF contenga al menos un link que matchee las URLs esperadas
 * @param pdfPath - Ruta al PDF
 * @param expectedUrls - Array de URLs que deberían estar en el PDF
 * @returns Objeto con resultado de validación
 */
export async function validatePdfLinks(
    pdfPath: string,
    expectedUrls: string[]
): Promise<{ valid: boolean; foundUrls: string[]; missingUrls: string[] }> {
    const result = await extractPdfAnnotations(pdfPath);

    const pdfUrls = result.linkAnnotations.map(a => a.url);
    const foundUrls: string[] = [];
    const missingUrls: string[] = [];

    for (const expectedUrl of expectedUrls) {
        const found = pdfUrls.some(pdfUrl =>
            pdfUrl === expectedUrl || pdfUrl.includes(expectedUrl)
        );

        if (found) {
            foundUrls.push(expectedUrl);
        } else {
            missingUrls.push(expectedUrl);
        }
    }

    return {
        valid: missingUrls.length === 0,
        foundUrls,
        missingUrls
    };
}

/**
 * Verifica que el PDF NO contenga links de Emitir
 * Útil para el caso negativo (purchase=false)
 */
export async function validateNoEmitirLinks(pdfPath: string): Promise<boolean> {
    const result = await extractPdfAnnotations(pdfPath);
    return !result.hasEmitirLinks;
}
