import { type Locator, type Page } from "@playwright/test";

/**
 * POL-3076 — Operación por fuera (OPF) post-error de emisión auto:
 * sección "Solicitar emisión" de EmissionFailure, popup de confirmación y popup de éxito.
 * También la entrada `catalogExtra`: "¿Necesitás una cobertura diferente? Ver más" →
 * "Solicitar" → popup "Solicitud de cotización" → asistente → pantalla de éxito con ID.
 */
export default class OperacionPorFuera {
    readonly page: Page;
    readonly failureSection: Locator;
    readonly failureSectionText: Locator;
    readonly solicitarEmisionBtn: Locator;
    readonly confirmTitle: Locator;
    readonly confirmActions: Locator;
    readonly confirmSolicitarBtn: Locator;
    readonly confirmCancelarBtn: Locator;
    readonly confirmError: Locator;
    readonly successTitle: Locator;
    readonly successSolicitudId: Locator;

    readonly extraCoverages: Locator;
    readonly extraVerMasBtn: Locator;
    readonly extraTitle: Locator;
    readonly extraRows: Locator;
    readonly entryPopupTitle: Locator;
    readonly outStandardPopupTitle: Locator;
    readonly entryContinuarBtn: Locator;
    readonly solicitarCotizacionBtn: Locator;
    readonly cotizacionSuccessTitle: Locator;
    readonly successIdValue: Locator;
    readonly submitErrorTitle: Locator;

    readonly completarSolicitarEmisionBtn: Locator;
    readonly completarSuccessTitle: Locator;
    readonly successDescargarPdfBtn: Locator;
    readonly descargaErrorTitle: Locator;

    constructor(page: Page) {
        this.page = page;
        this.failureSection = page.locator(".EmissionFailure__operaciones");
        this.failureSectionText = this.failureSection.getByText(
            "Podés enviar esta solicitud a Operaciones.",
        );
        this.solicitarEmisionBtn = this.failureSection.getByRole("button", {
            name: "Solicitar emisión",
            exact: true,
        });
        this.confirmTitle = page.getByText("Estás a punto de solicitar una emisión", { exact: true });
        // Los CTAs viven en el footer del PopUp, fuera de `.operacionPorFueraConfirmModal`.
        this.confirmActions = page.locator(".operacionPorFueraConfirmModal__actions");
        this.confirmSolicitarBtn = this.confirmActions.getByRole("button", { name: "Solicitar", exact: true });
        this.confirmCancelarBtn = this.confirmActions.getByRole("button", { name: "Cancelar", exact: true });
        this.confirmError = page.locator(".operacionPorFueraConfirmModal__error");
        this.successTitle = page.getByText("Iniciamos tu solicitud de emisión", { exact: true });
        this.successSolicitudId = page.getByText(/ID de solicitud:/);

        this.extraCoverages = page.locator(".extraCoverages-container");
        this.extraVerMasBtn = this.extraCoverages
            .locator(".extraCoverages__button")
            .getByRole("button", { name: /Ver más/ });
        this.extraTitle = this.extraCoverages.getByText("Coberturas fuera de pauta", { exact: true });
        this.extraRows = this.extraCoverages.locator(".extraCoverages__content .ctrowAuto");
        this.entryPopupTitle = page.getByText("Solicitud de cotización", { exact: true });
        this.outStandardPopupTitle = page.getByText("Solicitud de emisión", { exact: true });
        this.entryContinuarBtn = page.locator(".csm__popupFooter").getByRole("button", { name: /^continuar$/i });
        this.solicitarCotizacionBtn = page.getByRole("button", { name: "Solicitar cotización", exact: true });
        this.cotizacionSuccessTitle = page.getByText("Iniciamos tu solicitud de cotización", { exact: true });
        this.successIdValue = page.locator(".OperacionPorFueraSuccessResult__idRow .EmissionSuccess__rowValue");
        this.submitErrorTitle = page.getByText("No pudimos registrar la solicitud", { exact: true });

        // Paso Solicitud de "completar" (Cotizada) y de cobertura cotizada fuera de pauta.
        this.completarSolicitarEmisionBtn = page.getByRole("button", { name: "Solicitar emisión", exact: true });
        this.completarSuccessTitle = page.getByText("Completaste los datos de la solicitud", { exact: true });
        this.successDescargarPdfBtn = page.getByText("Descargar pdf de cotización", { exact: true });
        this.descargaErrorTitle = page.getByText("No pudimos descargar la cobertura", { exact: true });
    }

    /** Botón Emitir/Solicitar de una fila de la cotización (`emitirButton_<id>`). */
    filaEmitirBtn(row: Locator): Locator {
        return row.locator('[id^="emitirButton_"]');
    }

    filaEtiquetaFueraDePauta(row: Locator): Locator {
        return row.getByText("Fuera de pauta", { exact: true });
    }

    extraSolicitarBtn(row: Locator): Locator {
        return row.getByRole("button", { name: "Solicitar", exact: true });
    }
}
