import { expect, test, type Locator } from '@playwright/test';

/**
 * Valida que el número de la pantalla de éxito no esté vacío y lo deja como
 * anotación del test, visible en el reporte HTML junto al título.
 */
export async function reportarNumeroEmision(valor: Locator, tipo = 'Número de póliza'): Promise<string> {
    await expect(valor).not.toBeEmpty();
    const numero = (await valor.innerText()).trim();
    test.info().annotations.push({ type: tipo, description: numero });
    return numero;
}
