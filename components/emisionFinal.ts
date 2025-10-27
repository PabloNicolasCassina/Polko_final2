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
        this.descargaBtn = page.getByRole('button', { name: 'DESCARGAR' });
        this.emisionExitosaText = page.getByText('¡Felicitaciones, la operación');
        this.errorDocumentacion = page.getByText("Error al descargar");
        this.errorEmision = page.getByText("Hubo un problema al emitir");
        this.valorCobertura = page.getByText("Cuota mensual: $");
        
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