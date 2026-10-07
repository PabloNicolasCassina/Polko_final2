import { test, expect } from "@playwright/test";
import CotizarMotoIAPage from "../pages/cotizarMotoIAPage";
import { reportarNumeroEmision } from "../helpers/reportePoliza";

/**
 * Smoke test de motovehículo: el camino feliz mínimo, sin combinatoria.
 * Corre en cada PR — si esto rompe, algo fundamental del flujo de
 * cotización/emisión de moto está roto (no un detalle de una aseguradora
 * puntual). Debe ser rápido: 1 sola cotización, 1 sola emisión.
 *
 * Verificado en vivo el 2026-09-14 con exactamente este mismo camino
 * (BENELLI LEONCINO 250 - 2022, Rivadavia "Base Plus", Efectivo) —
 * terminó en "¡Póliza emitida con éxito!" con número de póliza real.
 */

const VEHICULO = { marca: "BENELLI", año: "2022", version: "LEONCINO 250", c_postal: "5000" };

test.describe("Moto - Smoke @smoke", () => {
    test("cotizar y emitir Rivadavia Base Plus con Efectivo llega a la pantalla de éxito", async ({ page }) => {
        // Presupuesto ajustado a propósito (no los 180s+ que tolera el resto del
        // repo): en debugging, un selector roto debe fallar en segundos.
        test.setTimeout(120000); // bajado de 240000: fallar rápido si algo se clava
        const cotizarMotoIA = new CotizarMotoIAPage(page);

        await cotizarMotoIA.goto();
        await cotizarMotoIA.cotizarVehiculo(VEHICULO);

        await cotizarMotoIA.selectCompania("Rivadavia");
        await expect(cotizarMotoIA.planCard("F")).toBeVisible();

        await cotizarMotoIA.emitirPlan("F", { formaPago: "Efectivo" });

        await expect(cotizarMotoIA.emisionExitosaHeading).toBeVisible();
        await expect(cotizarMotoIA.emisionFinal.errorEmision).not.toBeVisible();
        await reportarNumeroEmision(cotizarMotoIA.successRowValue("Número de Póliza"));
        await expect(cotizarMotoIA.documentoDescargarBtn("Póliza completa")).toBeEnabled();
    });
});
