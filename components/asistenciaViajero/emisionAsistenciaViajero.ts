import { Page, Locator } from "@playwright/test";
import { escapeRegExp } from "../../helpers/viewport";

/** Mensajes de `ageBands.constants.js` / `passengerChecks.js` (paso de pasajeros). */
export const MENSAJES_EDAD = {
    ningunoCotizado: "Ningún pasajero cotizado tiene esta edad. Corregí la fecha o volvé a cotizar.",
    masQueCotizados: "Hay más pasajeros con esta edad que los cotizados. Corregí la fecha o volvé a cotizar.",
    mayorQueCotizados: "Este pasajero es mayor que los cotizados. Corregí la fecha o volvé a cotizar.",
    documentoRepetido: "Este documento ya está cargado en otro pasajero.",
} as const;

/**
 * Pasos de emisión de Asistencia al viajero rediseñada: "Forma de pago" (solo TerraWind), "Datos de los
 * pasajeros" (buscador por DNI/CUIT, un formulario por pasajero y contacto de emergencia) y el resumen
 * con "Emitir" en la tarjeta lateral.
 */
export default class EmisionAsistenciaViajero {
    readonly page: Page;
    readonly emisionHeading: Locator;
    readonly formaPagoHeading: Locator;
    /** Select de Snuggle ("Tarjeta · $X" / "Transferencia · $Y"): solo en planes que aceptan transferencia. */
    readonly formaPagoSnuggleSelect: Locator;
    readonly pasajerosHeading: Locator;
    readonly siguienteBtn: Locator;
    readonly atrasBtn: Locator;
    readonly buscarClienteInput: Locator;
    readonly buscarClienteBtn: Locator;
    readonly buscarPasajeroBtn: Locator;
    readonly datosPasajeroTitle: Locator;
    readonly fechaNacimientoInput: Locator;
    readonly generoSelect: Locator;
    readonly localidadSelect: Locator;
    readonly emergenciaNombreInput: Locator;
    readonly emergenciaApellidoInput: Locator;
    readonly emergenciaCelularInput: Locator;
    readonly erroresEdad: Locator;
    readonly resumenHeading: Locator;
    readonly resumenPlan: Locator;
    readonly resumenPasajeros: Locator;
    readonly resumenPago: Locator;
    readonly resumenViaje: Locator;
    readonly sidebarTotalPesos: Locator;
    readonly footerCard: Locator;
    readonly footerTotalPesos: Locator;
    /** "Emitir" (TerraWind), "Generar link de pago" o "Contratar por transferencia" (Snuggle). */
    readonly emitirBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emisionHeading = page.getByRole("heading", { name: "Emisión", level: 1 });
        this.formaPagoHeading = page.getByRole("heading", { name: "Forma de pago", level: 2 });
        this.formaPagoSnuggleSelect = page.getByPlaceholder("Elegí cómo va a pagar tu asegurado");
        this.pasajerosHeading = page.getByRole("heading", { name: "Datos de los pasajeros", level: 2 });
        this.siguienteBtn = page.getByRole("button", { name: "Siguiente", exact: true });
        this.atrasBtn = page.getByRole("button", { name: "Atrás", exact: true });
        this.buscarClienteInput = page.getByRole("textbox", { name: "DNI o CUIT/CUIL" });
        this.buscarClienteBtn = page.getByRole("button", { name: "Buscar", exact: true });
        this.buscarPasajeroBtn = page.getByRole("button", { name: "Buscar pasajero" });
        this.datosPasajeroTitle = page.getByText("Datos del pasajero", { exact: true });
        this.fechaNacimientoInput = page.getByRole("textbox", { name: "Fecha de nacimiento*" });
        this.generoSelect = page.getByRole("searchbox", { name: "Género*" });
        this.localidadSelect = page.getByRole("searchbox", { name: "Localidad*" });
        this.emergenciaNombreInput = page.getByRole("textbox", { name: "Nombre del contacto de emergencia" });
        this.emergenciaApellidoInput = page.getByRole("textbox", { name: "Apellido del contacto de emergencia" });
        this.emergenciaCelularInput = page.getByRole("textbox", { name: "Celular del contacto de emergencia" });
        this.erroresEdad = page.getByText(
            new RegExp(
                [MENSAJES_EDAD.ningunoCotizado, MENSAJES_EDAD.masQueCotizados, MENSAJES_EDAD.mayorQueCotizados]
                    .map(escapeRegExp)
                    .join("|") + "|La asistencia cubre hasta los \\d+ años",
            ),
        );
        this.resumenHeading = page.getByRole("heading", { name: "Revisá y modificá antes de emitir" });
        this.resumenPlan = this.resumenSeccion("Plan");
        this.resumenPasajeros = this.resumenSeccion("Pasajeros");
        this.resumenPago = this.resumenSeccion("Pago");
        this.resumenViaje = this.resumenSeccion("Viaje");
        this.sidebarTotalPesos = page.locator(".SummaryCard__metric--price");
        this.footerCard = page.locator(".EmissionLayout__sidebarFooterCard");
        this.footerTotalPesos = this.footerCard.getByText(/^\$\s?[\d.,]+$/);
        this.emitirBtn = this.footerCard.getByRole("button", { name: /^(Emitir|Generar link de pago|Contratar por transferencia)$/ });
    }

    formaPagoRadio(medio: string): Locator {
        return this.page.getByRole("radio", { name: medio, exact: true });
    }

    /** Opción del select de Snuggle: "Tarjeta · $78.045" / "Transferencia · $62.436". */
    formaPagoSnuggleOpcion(medio: string): Locator {
        return this.page.getByRole("option", { name: new RegExp(`^${escapeRegExp(medio)} · \\$`) });
    }

    sexoRadio(genero: string): Locator {
        return this.page.getByRole("radio", { name: genero, exact: true });
    }

    opcion(nombre: string): Locator {
        return this.page.getByRole("option", { name: nombre, exact: true });
    }

    /** Inputs del formulario del pasajero `index` (`name="pasajeros.<index>.<campo>"`). */
    campoPasajero(index: number, campo: string): Locator {
        return this.page.locator(`input[name='pasajeros.${index}.${campo}']`);
    }

    /** Fila "Pasajero N · X años" del listado de pasajeros. */
    filaPasajero(index: number): Locator {
        return this.page
            .locator(".ClientStep__clientListLabel")
            .filter({ hasText: new RegExp(`^Pasajero ${index + 1} ·`) });
    }

    editarPasajeroBtn(index: number): Locator {
        return this.page.getByRole("button", { name: new RegExp(`^Editar Pasajero ${index + 1} ·`) });
    }

    error(mensaje: string): Locator {
        return this.page.getByText(mensaje, { exact: true });
    }

    resumenSeccion(titulo: string): Locator {
        return this.page.locator("article").filter({ has: this.page.getByRole("heading", { name: titulo, level: 2 }) });
    }
}
