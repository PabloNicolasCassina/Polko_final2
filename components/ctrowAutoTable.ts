import { Page, Locator } from "@playwright/test";

/**
 * Helpers genéricos para la tabla de cotización rediseñada (clase `.ctrowAuto`).
 *
 * Verificado en vivo el 2026-09-14 que ESTA MISMA estructura de tarjeta la usan
 * tanto /u/cotizar/automotor como /u/cotizar/motovehiculo (mismo componente
 * React reusado entre productos, a pesar del nombre "ctrowAuto"):
 *
 *   <div class="ctrowAuto">
 *     <span class="ctrowAuto__code">17</span>              <- código de plan
 *     <span class="ctrowAuto__name">Moto Premium...</span>
 *     <span class="ctrowAuto__price">$...</span>
 *     <button class="ctrowAuto__addButton">Agregar</button>
 *     <button id="emitirButton_17">Emitir</button>          <- id GLOBAL por código de plan
 *   </div>
 *
 * El id de "Emitir" es `emitirButton_<code>` para cualquier aseguradora/producto.
 * Algunos códigos traen espacios (ej. Rivadavia auto "D F5", RUS moto
 * "B1-80 MOTO AG") — por eso se usa `[id="emitirButton_<code>"]` (atributo,
 * soporta espacios) en vez de `#emitirButton_<code>` (shorthand CSS, rompe
 * con espacios).
 *
 * Ver `pages/cotizarAutoIAPage.ts` y `pages/cotizarMotoIAPage.ts` para el
 * detalle de qué código corresponde a qué plan en cada aseguradora/producto.
 */
export default class CtrowAutoTable {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /** Tarjeta de un plan en la tabla de cotización, por código exacto (ej. "12", "M", "D F5"). */
    planCard(code: string): Locator {
        return this.page.locator(".ctrowAuto").filter({
            has: this.page.locator(".ctrowAuto__code", { hasText: new RegExp(`^${escapeRegExp(code)}$`) }),
        });
    }

    /** Botón "Agregar" de un plan (dentro de su tarjeta), por código. */
    agregarBtn(code: string): Locator {
        return this.planCard(code).locator(".ctrowAuto__addButton");
    }

    /** Botón "Emitir" de un plan, por código (id global `emitirButton_<code>`). */
    emitirBtn(code: string): Locator {
        return this.page.locator(`[id="emitirButton_${code}"]`);
    }

    /** Botón "COMPARAR (n)" que abre el drawer de coberturas agregadas. */
    get compararBtn(): Locator {
        return this.page.getByRole("button", { name: "COMPARAR" }).first();
    }

    /** Botón "X" que cierra el drawer "Comparar coberturas". */
    get cerrarDrawerComparar(): Locator {
        return this.page.locator(".CoverageComparison__drawerCloseButton").or(this.page.getByRole("button").first());
    }

    /** Item de un plan ya agregado en el drawer "Comparar coberturas", por código. */
    drawerItem(code: string): Locator {
        return this.page.locator(".CoverageComparison__drawerItem").filter({
            has: this.page.locator(".CoverageComparison__drawerCode", { hasText: new RegExp(`^${escapeRegExp(code)}$`) }),
        });
    }
}

export function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
