import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionFinal {
    readonly page: Page;
    readonly descargaBtn: Locator;
    readonly emisionExitosaText: Locator;
    readonly errorDocumentacion: Locator;
    readonly errorEmision: Locator;
    readonly valorCobertura: Locator;
    




    constructor(page: Page) {
        this.page = page;
        // cotizarMotoIA: la pantalla de éxito rediseñada ("¡Póliza emitida con
        // éxito!") lista varios documentos (Póliza completa, Certificado de
        // cobertura, Factura, etc.), cada uno con su propio botón "Descargar"
        // — sin .first() esto resuelve a N elementos y hace explotar cualquier
        // expect(...).toBeEnabled()/toBeVisible() en modo strict. Usar
        // `documentoDescargarBtn(nombre)` de cotizarMotoIAPage.ts si se
        // necesita apuntar a un documento específico.
        this.descargaBtn = page.getByRole('button', { name: 'DESCARGAR' }).first();
        this.emisionExitosaText = page.getByText('¡Felicitaciones, la operación').or(page.getByText('¡Felicitaciones!Recibimos tu')).or(page.getByText("¡Póliza emitida con éxito!"));
        this.errorDocumentacion = page.getByText("Error al descargar");
        this.errorEmision = page.getByText("Hubo un problema al emitir").or(page.getByText("Parece que hubo un"));
        // El formato del DOM difiere por producto:
        // - Auto: la etiqueta "Cuota mensual" y el valor "$115.732" son DOS
        //   elementos hermanos (sin ":" entre medio); sólo su contenedor
        //   común concatena ambos textos como "Cuota mensual$115.732".
        // - Hogar/Moto: es un único elemento con el texto "Cuota mensual: $N".
        // Por eso el match exige "Cuota mensual" seguido en algún punto de
        // "$" dentro del mismo elemento (dotAll para que el "." cruce saltos
        // de texto entre nodos hermanos concatenados). Puede haber varios
        // elementos ancestro que cumplan el patrón (por el wrapping del DOM,
        // y porque en Auto el precio aparece dos veces: en la tarjeta de
        // detalle y en la barra de acción final); `.last()` se queda con el
        // nodo más específico/interno del último bloque en el documento, que
        // es la barra de acción final con el precio vigente.
        this.valorCobertura = page.getByText(/Cuota mensual[\s\S]*\$/i).last();
        
    }

    async getValorCoberturaFinal(): Promise<string> {
    const textoCompleto = await this.valorCobertura.textContent(); // O como llames a tu locator

    if (!textoCompleto) {
        throw new Error("No se pudo encontrar el texto de la cobertura (valorCobertura).");
    }

    // 1. Partimos el string usando el '$' como divisor
    // ej: ["Cuota mensual: ", "131.399Mismo precio por 3 meses"]
    const partesDelTexto = textoCompleto.split('$');

    // 2. Obtenemos la parte "sucia"
    const valorSucio = partesDelTexto[1]; // "131.399Mismo precio por 3 meses"

    // --- ¡AQUÍ VA LA CORRECCIÓN! ---
    // 3. Usamos RegExp para quedarnos solo con el número del principio
    // Esto busca dígitos (\\d), puntos (.) y comas (,) al inicio (^)
    const match = valorSucio.match(/^[\d.,]+/);

    if (match && match[0]) {
        return match[0]; // Devuelve "131.399"
    }

    // Si no encuentra el número, falla el test con un error claro
    throw new Error(`No se pudo extraer el valor numérico de: "${valorSucio}"`);
}

}