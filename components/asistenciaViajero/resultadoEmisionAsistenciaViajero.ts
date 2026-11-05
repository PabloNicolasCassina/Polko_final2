import { Page, Locator } from "@playwright/test";

/**
 * Resultado de "Emitir" en Asistencia al viajero:
 * - TerraWind: `EmissionSuccess` ("¡Vouchers emitidos con éxito!") con un "Número de voucher N" por pasajero.
 * - Snuggle: `SnuggleHireResult` con el estado de la contratación; si queda "Pago pendiente" muestra el
 *   total y "Ir a pagar" (abre el checkout en otra pestaña); emitida, una fila por voucher.
 * - Error: `EmissionFailure` ("Error en la emisión") o "Esta cotización ya se contrató".
 */
export default class ResultadoEmisionAsistenciaViajero {
    readonly page: Page;
    readonly exitoTerraWindTitle: Locator;
    readonly identificadores: Locator;
    readonly snuggleResultado: Locator;
    readonly snuggleTitulo: Locator;
    readonly snuggleEstado: Locator;
    readonly snuggleTotal: Locator;
    readonly snuggleMedioPago: Locator;
    readonly snuggleLinkPago: Locator;
    readonly snuggleIrAPagarBtn: Locator;
    readonly snuggleLinkNoDisponible: Locator;
    readonly snuggleConsultarEstadoBtn: Locator;
    readonly snuggleVouchers: Locator;
    readonly snuggleCodigos: Locator;
    /** Universal en tarifa sugerida entrega el link después de contratar ("Estamos generando el link de pago"). */
    readonly snuggleLinkGenerando: Locator;
    readonly snuggleLinkFallido: Locator;
    readonly snuggleLinkNoGenera: Locator;
    /** Contratación por transferencia pendiente: importe exacto y cuentas de destino para pasarle al asegurado. */
    readonly transferenciaMonto: Locator;
    readonly transferenciaCuentas: Locator;
    readonly errorTitle: Locator;
    readonly errorDetalle: Locator;
    readonly cotizacionYaContratada: Locator;

    constructor(page: Page) {
        this.page = page;
        this.exitoTerraWindTitle = page.getByText("¡Vouchers emitidos con éxito!", { exact: true });
        this.identificadores = page.locator(".EmissionSuccess__row");
        this.snuggleResultado = page.locator(".SnuggleHireResult");
        this.snuggleTitulo = this.snuggleResultado.getByRole("heading", { level: 1 });
        this.snuggleEstado = this.snuggleResultado.locator(".OperationStatusBadge").first();
        this.snuggleTotal = this.snuggleResultado.locator(".PaymentSummary__totalAmount");
        this.snuggleMedioPago = this.snuggleResultado.locator(".PaymentSummary__paymentMethod");
        this.snuggleLinkPago = this.snuggleResultado.locator(".PaymentActions__link");
        this.snuggleIrAPagarBtn = this.snuggleResultado.locator(".PaymentActions__payButton");
        this.snuggleLinkNoDisponible = this.snuggleResultado.getByText(/El link de pago todavía no está disponible/);
        this.snuggleConsultarEstadoBtn = this.snuggleResultado.getByRole("button", { name: /Consultar estado|Verificar|Consultando/ });
        this.snuggleVouchers = this.snuggleResultado.locator(".VoucherDownloads .EmissionDocumentDownloadRow");
        this.snuggleCodigos = this.snuggleResultado.locator(".OperationCodes__item");
        this.snuggleLinkGenerando = this.snuggleResultado.locator(".ProviderPaymentLinkStatus--loading");
        this.snuggleLinkFallido = this.snuggleResultado.locator(".ProviderPaymentLinkStatus--failed");
        this.snuggleLinkNoGenera = this.snuggleResultado.locator(".ProviderPaymentLinkStatus--unavailable");
        this.transferenciaMonto = this.snuggleResultado.locator(".TransferPaymentActions__amountValue");
        this.transferenciaCuentas = this.snuggleResultado.getByRole("region", { name: "Cuenta de destino" });
        this.errorTitle = page.getByRole("heading", { name: "Error en la emisión" });
        this.errorDetalle = page.locator(".EmissionResultLayout__panel").filter({ has: this.errorTitle });
        this.cotizacionYaContratada = page.getByText("Esta cotización ya se contrató");
    }

    /** "Número de voucher" o "Número de voucher N" del éxito de TerraWind. */
    numerosVoucher(): Locator {
        return this.identificadores.filter({
            has: this.page.locator(".EmissionSuccess__rowLabel", { hasText: /^Número de voucher/ }),
        });
    }

    /** Código completo de "Cotización" o "Código interno de Polko" (en pantalla se ve truncado al medio). */
    codigoOperacion(label: "Cotización" | "Código interno de Polko"): Locator {
        return this.snuggleCodigos
            .filter({ has: this.page.locator(".OperationCodes__label", { hasText: new RegExp(`^${label}$`) }) })
            .locator(".OperationCodes__value .SnuggleHireResult__visuallyHidden");
    }

    valorIdentificador(fila: Locator): Locator {
        return fila.locator(".EmissionSuccess__rowValue");
    }

    voucherDescargarBtn(fila: Locator): Locator {
        return fila.getByRole("button", { name: "Descargar" });
    }

    /** Cualquier desenlace de "Emitir" (para esperar sin asumir el circuito). */
    get cualquierDesenlace(): Locator {
        return this.exitoTerraWindTitle
            .or(this.snuggleResultado)
            .or(this.errorTitle)
            .or(this.cotizacionYaContratada);
    }
}
