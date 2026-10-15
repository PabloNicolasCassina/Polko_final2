import { expect, test, type Locator, type Page } from "@playwright/test";
import { isCompactViewport } from "./viewport";

const MAX_DESBORDES_REPORTADOS = 5;
/** Margen por redondeo subpíxel de fuentes/íconos (no es desborde visible). */
const TOLERANCIA_PX = 2;

/**
 * Elementos visibles de `container` que se salen horizontalmente de su caja o del viewport,
 * o cuyo contenido (texto sin wrap) excede su propio ancho.
 * Se ignora lo recortado a propósito por un ancestro con overflow-x distinto de visible
 * (carruseles, ellipsis, decoraciones) y lo fixed (drawers, FAB).
 */
async function buscarDesbordes(container: Locator): Promise<string[]> {
    return container.evaluate((root, { max, tolerancia }) => {
        const rootRect = root.getBoundingClientRect();
        const minX = Math.max(rootRect.left, 0) - tolerancia;
        const maxX = Math.min(rootRect.right, window.innerWidth) + tolerancia;

        const describir = (el: Element): string => {
            const clases =
                typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
            const texto = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
            return `<${el.tagName.toLowerCase()}${clases ? `.${clases}` : ""}> "${texto}"`;
        };

        const recortadoPorAncestro = (el: Element): boolean => {
            for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
                if (getComputedStyle(p).overflowX !== "visible") return true;
            }
            return false;
        };

        const desbordes: string[] = [];
        for (const el of [root, ...Array.from(root.querySelectorAll("*"))]) {
            const style = getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            if (el !== root && recortadoPorAncestro(el)) continue;

            const fueraDeCaja = el !== root && (rect.left < minX || rect.right > maxX);
            const contenidoDesbordado =
                style.overflowX === "visible" && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + tolerancia;
            if (fueraDeCaja || contenidoDesbordado) {
                desbordes.push(
                    `${describir(el)} [${Math.round(rect.left)}→${Math.round(rect.right)}px, ` +
                        `límite ${Math.round(minX + tolerancia)}→${Math.round(maxX - tolerancia)}px, ` +
                        `scrollWidth ${el.scrollWidth} / clientWidth ${el.clientWidth}]`,
                );
            }
            if (desbordes.length >= max) break;
        }
        return desbordes;
    }, { max: MAX_DESBORDES_REPORTADOS, tolerancia: TOLERANCIA_PX });
}

/**
 * Solo en viewport compacto (<= 1024px): la página no scrollea en horizontal y ninguna
 * de las zonas visibles desborda. Asserts soft: el flujo funcional sigue y el test queda en rojo.
 */
export async function verificarSinDesbordeHorizontal(page: Page, zonas: Record<string, Locator>): Promise<void> {
    if (!isCompactViewport(page)) return;
    await test.step("Layout mobile: sin desborde horizontal", async () => {
        let huboDesborde = false;

        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
        }));
        if (scrollWidth > innerWidth + 1) huboDesborde = true;
        expect
            .soft(scrollWidth, `La página scrollea en horizontal (${scrollWidth}px > viewport ${innerWidth}px)`)
            .toBeLessThanOrEqual(innerWidth + 1);

        for (const [nombre, zona] of Object.entries(zonas)) {
            const target = zona.first();
            if (!(await target.isVisible().catch(() => false))) continue;
            const desbordes = await buscarDesbordes(target);
            if (desbordes.length > 0) huboDesborde = true;
            expect.soft(desbordes, `Contenido desbordado horizontalmente en "${nombre}"`).toEqual([]);
        }

        if (huboDesborde) {
            await test.info().attach("layout-mobile-desborde", {
                body: await page.screenshot({ fullPage: true }),
                contentType: "image/png",
            });
        }
    });
}
