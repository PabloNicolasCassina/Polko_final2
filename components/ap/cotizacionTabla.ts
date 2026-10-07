import { Page, Locator } from "@playwright/test";

export default class CotizacionTablaAp {
    readonly page: Page;
    readonly configAvanzadaBtn: Locator;
    readonly descuentoSlider: Locator;
    readonly planBasicoEmitirBtn: Locator;
    readonly planSugeridoEmitirBtn: Locator;
    readonly planAvanzadoEmitirBtn: Locator;
    readonly tipoFacturacion: Locator;
    readonly rangoEdad: Locator;
    readonly mei: Locator;
    readonly asMe: Locator;
    readonly rentaDiaria: Locator;
    readonly deducible: Locator;
    readonly subsidioFallecimiento: Locator;
    readonly planPersonalizadoEmitirBtn: Locator;
    readonly descuentoBar30: Locator;
    readonly descuentoPointer: Locator;
    /** POL-2965 — common field Facturación (Sancor AP). */
    readonly facturacionSelect: Locator;
    /** POL-2965 — Cuotas bloqueadas en 1 cuando facturación ANUAL. */
    readonly cuotasSelect: Locator;

    constructor(page: Page) {
        this.page = page;
        // UI vieja: botón CONFIGURACIÓN AVANZADA. Redesign/generic: texto "Configuración avanzada".
        this.configAvanzadaBtn = page
            .getByRole("button", { name: /configuraci[oó]n avanzada/i })
            .or(page.getByText("Configuración avanzada", { exact: true }));
        this.descuentoSlider = page.getByRole('slider');
        this.tipoFacturacion = page.getByRole('searchbox', { name: 'Tipo de facturación' });
        this.facturacionSelect = page.getByRole('searchbox', { name: /^Facturación$/i })
            .or(page.getByRole("searchbox", { name: /facturaci[oó]n/i }))
            .or(page.locator('[id*="facturacion"]').locator('input').first());
        this.cuotasSelect = page.getByRole('searchbox', { name: /^Cuotas$/i })
            .or(page.locator('[id*="cuotas"]').locator('input').first());
        this.rangoEdad = page.locator('#select_rangoEdad');
        this.mei = page.locator('#select_coberturaMuerte');
        this.asMe = page.locator('#select_asistenciaMedica');
        this.rentaDiaria = page.locator('#select_rentaDiariaInternacion');
        this.deducible = page.locator('#dependant_deducible');
        this.subsidioFallecimiento = page.locator('#select_subsidioFallecimiento');
        this.descuentoBar30 = page.getByText("30%");
        this.descuentoPointer = page.getByRole('slider');

        // Los botones EMITIR se identifican por su posición en la tabla. Cada
        // fila de cobertura es un contenedor `.ctrow` cuyo texto y botón
        // "EMITIR" son descendientes de un mismo `.ctrow`, pero el texto y el
        // botón son hermanos entre sí (no ancestro/descendiente), por lo que
        // encadenar getByText(...).getByRole(...) directamente nunca
        // encontraba el botón. Se filtra la fila `.ctrow` por su texto y se
        // busca el botón "Emitir" dentro de ella.
        // Nota: la nomenclatura de "plan" del test no coincide 1 a 1 con la de
        // la UI (Básico / Intermedio / Sugerido); se preserva el mapeo previo:
        // plan "Sugerido" del test -> fila "Intermedio" de la UI, y plan
        // "Avanzado" del test -> fila "Sugerido" de la UI.
        const ctrow = (texto: string) => page.locator('.ctrow').filter({ hasText: texto });
        this.planBasicoEmitirBtn = ctrow('Básico').getByRole("button", {name: "Emitir"});
        this.planSugeridoEmitirBtn = ctrow('Intermedio').getByRole("button", {name: "Emitir"});
        this.planAvanzadoEmitirBtn = ctrow('Sugerido').getByRole("button", {name:"Emitir"});
        this.planPersonalizadoEmitirBtn = ctrow('Personalizada').getByRole("button",{name: "Emitir"});
    }

    async emitirPlanBasico() {
        await this.planBasicoEmitirBtn.click();
    }

    async emitirPlanSugerido() {
        await this.planSugeridoEmitirBtn.click();
    }

    async emitirPlanAvanzado() {
        await this.planAvanzadoEmitirBtn.click();
    }

    async abrirConfigAvanzada() {
        await this.configAvanzadaBtn.click();
    }

    public getOptionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public async aplicarDescuento30Porciento(): Promise<void> {
        await this.descuentoBar30.click();
        await this.descuentoPointer.click();
    }
}
