import { Page, Locator, expect } from "@playwright/test";

/**
 * Formulario de inspección digital de Mercantil Andina (tst.barbara.com.ar).
 * Se abre en una pestaña externa al hacer clic en "Realizá la inspección"
 * desde el paso de Inspección de Polko (ver components/auto/emisionInspeccion.ts).
 */
export default class EmisionInspeccionMercantilAndina {
    readonly page: Page;
    readonly botonComenzarInspeccionDigital: Locator;
    readonly poseeGncSi: Locator;
    readonly poseeGncNo: Locator;
    readonly airbagExplotadoSi: Locator;
    readonly airbagExplotadoNo: Locator;
    readonly poseeRuedaAuxilioSi: Locator;
    readonly poseeRuedaAuxilioNo: Locator;
    readonly checkboxAcepto: Locator;
    readonly botonContinuar: Locator;
    readonly tituloFotosUnidad: Locator;
    readonly fotoLateralConductor: Locator;
    readonly fotoTrasera: Locator;
    readonly fotoFrente: Locator;
    readonly fotoLateralAcompanante: Locator;
    readonly fotoCilindroGnc: Locator;
    readonly fotoTarjetaGnc: Locator;
    readonly botonCompletarInspeccion: Locator;
    readonly botonSolapaFotos: Locator;
    readonly fotosObligatorias: Locator;
    readonly botonEnviar: Locator;

    constructor(page: Page) {
        this.page = page;
        this.botonComenzarInspeccionDigital = page.getByRole('button', { name: 'Comenzar inspección digital' });

        // Pantalla "Confirmar características": Posee GNC / Airbag explotado / Posee rueda auxilio, en ese orden.
        this.poseeGncSi = page.getByRole('button', { name: 'SI' }).first();
        this.poseeGncNo = page.getByRole('button', { name: 'NO' }).first();
        this.airbagExplotadoSi = page.getByRole('button', { name: 'SI' }).nth(1);
        this.airbagExplotadoNo = page.getByRole('button', { name: 'NO' }).nth(1);
        this.poseeRuedaAuxilioSi = page.getByRole('button', { name: 'SI' }).nth(2);
        this.poseeRuedaAuxilioNo = page.getByRole('button', { name: 'NO' }).nth(2);
        this.checkboxAcepto = page.locator('.p-checkbox-box');
        // Se reutiliza tal cual en "Confirmar características" y en "Estado del riesgo".
        this.botonContinuar = page.getByRole('button', { name: 'Continuar' });

        // Pantalla "Fotos de la unidad"
        this.tituloFotosUnidad = page.getByText('Fotos de la unidad', { exact: true });
        this.fotoLateralConductor = page.getByText('Lateral Conductor', { exact: true });
        this.fotoTrasera = page.getByText('Trasera', { exact: true });
        this.fotoFrente = page.getByText('Frente', { exact: true });
        this.fotoLateralAcompanante = page.getByText('Lateral Acompañante', { exact: true });
        this.fotoCilindroGnc = page.getByText('Cilindro GNC', { exact: true });
        this.fotoTarjetaGnc = page.getByText('Tarjeta GNC', { exact: true });
        this.botonCompletarInspeccion = page.getByRole('button', { name: 'Completar inspección' });

        // Formulario Barbara 2.0 con solapas DATOS / DAÑOS / FOTOS (sinTop=1&sinCaracteristicas=1).
        this.botonSolapaFotos = page.getByRole('button', { name: 'Fotos', exact: true });
        this.fotosObligatorias = page.locator('.fotoContainer.fotoObligatoria');
        this.botonEnviar = page.locator('#enviar');
    }

    private async subirFoto(foto: Locator, filepath: string): Promise<void> {
        const [fileChooser] = await Promise.all([
            this.page.waitForEvent('filechooser'),
            foto.click(),
        ]);
        await fileChooser.setFiles(filepath);
    }

    async completarCaracteristicas(tieneGnc: boolean): Promise<void> {
        if (tieneGnc) {
            await this.poseeGncSi.click();
        } else {
            await this.poseeGncNo.click();
        }
        await this.airbagExplotadoNo.click();
        await this.poseeRuedaAuxilioNo.click();
        await this.checkboxAcepto.click();
        await expect(this.botonContinuar).toBeEnabled({ timeout: 15000 });
        await this.botonContinuar.click();
    }

    async completarEstadoRiesgo(): Promise<void> {
        // Sin daños que declarar: se continúa directamente a la carga de fotos.
        await expect(this.botonContinuar).toBeVisible({ timeout: 30000 });
        await this.botonContinuar.click();
    }

    async subirFotosUnidad(filepath: string, tieneGnc: boolean = false): Promise<void> {
        await this.subirFoto(this.fotoLateralConductor, filepath);
        await this.subirFoto(this.fotoTrasera, filepath);
        await this.subirFoto(this.fotoFrente, filepath);
        await this.subirFoto(this.fotoLateralAcompanante, filepath);

        if (tieneGnc) {
            if (await this.fotoCilindroGnc.isVisible().catch(() => false)) {
                await this.subirFoto(this.fotoCilindroGnc, filepath);
            }
            if (await this.fotoTarjetaGnc.isVisible().catch(() => false)) {
                await this.subirFoto(this.fotoTarjetaGnc, filepath);
            }
        }
    }

    async completarFormularioSolapas(filepath: string): Promise<void> {
        await this.botonSolapaFotos.click();
        await expect(this.fotosObligatorias.first()).toBeVisible({ timeout: 30000 });

        const total = await this.fotosObligatorias.count();
        for (let i = 0; i < total; i++) {
            const foto = this.fotosObligatorias.nth(i);
            if (await foto.isVisible()) {
                await foto.locator('input[type="file"]').setInputFiles(filepath);
            }
        }

        await this.botonEnviar.click();
        await expect(this.page).toHaveTitle(/Autoinspección Exitosa/i, { timeout: 60000 });
    }

    async completarInspeccionDigital(filepath: string, tieneGnc: boolean = false): Promise<void> {
        await expect(this.botonComenzarInspeccionDigital.or(this.botonSolapaFotos)).toBeVisible({ timeout: 30000 });
        if (await this.botonSolapaFotos.isVisible()) {
            await this.completarFormularioSolapas(filepath);
            return;
        }
        await this.botonComenzarInspeccionDigital.click();

        await this.completarCaracteristicas(tieneGnc);
        await this.completarEstadoRiesgo();

        await expect(this.tituloFotosUnidad).toBeVisible({ timeout: 30000 });
        await this.subirFotosUnidad(filepath, tieneGnc);

        await expect(this.botonCompletarInspeccion).toBeEnabled({ timeout: 60000 });
        await this.botonCompletarInspeccion.click();
        await expect(this.page).toHaveTitle(/Autoinspección Exitosa/i, { timeout: 60000 });
    }
}
