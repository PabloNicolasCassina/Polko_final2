import { Page, expect } from "@playwright/test";
import path from "path";
import CommonButtons from "../components/commonButtons";
import CoberturasMicroseguros from "../components/microseguros/coberturasMicroseguros";
import DetalleBicicletaMicroseguros from "../components/microseguros/detalleBicicletaMicroseguros";
import EmisionCliente from "../components/emisionCliente";
import EmisionFormaPago from "../components/emisionFormaPago";
import EmisionFinal from "../components/emisionFinal";
import { setupReactErrorGuard } from "../helpers/reactErrorGuard";

export default class EmisionMicrosegurosPage {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly coberturas: CoberturasMicroseguros;
    readonly detalleBicicleta: DetalleBicicletaMicroseguros;
    readonly emisionCliente: EmisionCliente;
    readonly emisionFormaPago: EmisionFormaPago;
    readonly emisionFinal: EmisionFinal;

    constructor(page: Page) {
        this.page = page;
        setupReactErrorGuard(page);
        this.buttons = new CommonButtons(page);
        this.coberturas = new CoberturasMicroseguros(page);
        this.detalleBicicleta = new DetalleBicicletaMicroseguros(page);
        this.emisionCliente = new EmisionCliente(page);
        this.emisionFormaPago = new EmisionFormaPago(page);
        this.emisionFinal = new EmisionFinal(page);
    }

    async cotizar(microseguro: any) {
        await this.coberturas.codigoPostalInput.fill(microseguro.codigoPostal);
        await expect(this.coberturas.localidadSearchbox).toHaveValue(/.+/, { timeout: 60000 });

        for (const numeroCobertura of microseguro.coberturas) {
            await this.coberturas.coberturaCheckbox(numeroCobertura).click();
        }

        await this.buttons.cotizarBtn.click();
        await expect(this.buttons.siguienteBtn).toBeVisible({ timeout: 60000 });
        await this.buttons.siguienteBtn.click();
    }

    async completarDetalleBicicleta(descripcion: string) {
        await this.detalleBicicleta.descripcionInput.fill(descripcion);

        const fixturePath = path.join(__dirname, "..", "fixtures", "auto.jpeg");
        await this.detalleBicicleta.dropzoneFileInput.setInputFiles(fixturePath);
        await expect(this.detalleBicicleta.previewImg).toBeVisible();

        await this.buttons.siguienteBtn.click();
    }

    async completarFormaPago(formaPago: string) {
        await this.emisionFormaPago.selectPaymentOption(formaPago);

        if (formaPago === "Débito por CBU") {
            await this.emisionFormaPago.fillCBU();
        } else if (formaPago === "Tarjeta de crédito") {
            await this.emisionFormaPago.fillTarjetaCredito({ sancor: true });
        }
    }

    async volverACambiarFormaPago(nuevaFormaPago: string) {
        await this.buttons.siguienteBtn.click();
        await this.buttons.atrasBtn.click();
        await this.completarFormaPago(nuevaFormaPago);
    }

    async completarCliente(dni: string) {
        await this.emisionCliente.nosisInput.fill(dni);
        await this.emisionCliente.buscarBtn.click();

        const localidadSearchbox = this.page.getByRole("searchbox", { name: "Localidad" });
        await expect(localidadSearchbox).toHaveValue(/.+/, { timeout: 60000 });
        await expect(this.buttons.siguienteBtn).toBeEnabled({ timeout: 30000 });

        await this.buttons.siguienteBtn.click();
    }

    async emitirYVerificarDocumentacion(documentoEsperado: string) {
        await expect(this.buttons.emitirBtn).toBeEnabled({ timeout: 60000 });
        await this.buttons.emitirBtn.click();

        await expect(
            this.emisionFinal.emisionExitosaText.or(this.emisionFinal.errorEmision)
        ).toBeVisible({ timeout: 180000 });

        const errorVisible = await this.emisionFinal.errorEmision.isVisible();
        if (errorVisible) {
            throw new Error("Hubo un problema al emitir el microseguro.");
        }

        await expect(this.emisionFinal.descargaBtn).toBeEnabled({ timeout: 60000 });

        const documentacionCombobox = this.page.getByRole("combobox");
        await documentacionCombobox.click();
        await expect(this.page.getByRole("option", { name: documentoEsperado, exact: true })).toBeVisible();
        await this.page.keyboard.press("Escape");
    }
}
