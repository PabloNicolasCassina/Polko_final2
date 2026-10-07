import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Si "Localidad" está visible, espera a que tenga valor.
 * Si no aparece en `probeMs`, sigue sin demorar el timeout largo (evita
 * quemar 15–30s en el `.catch()` cuando el campo no aplica).
 */
export async function settleLocalidadIfPresent(
    page: Page,
    probeMs = 3000,
    settleMs = 15000,
): Promise<void> {
    const loc = page.getByRole("searchbox", { name: "Localidad" }).and(page.locator(":visible"));
    await settleValueIfPresent(loc, probeMs, settleMs);
}

/** Misma idea para un locator concreto (p.ej. clientes.N.codigosLocalidad). */
export async function settleValueIfPresent(
    locator: Locator,
    probeMs = 3000,
    settleMs = 15000,
): Promise<void> {
    try {
        await locator.waitFor({ state: "visible", timeout: probeMs });
    } catch {
        return;
    }
    await expect(locator)
        .toHaveValue(/.+/, { timeout: settleMs })
        .catch(() => {});
}
