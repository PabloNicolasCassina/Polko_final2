import { Page, Locator } from "@playwright/test";
import { escapeRegExp } from "../../helpers/viewport";

/**
 * Cotizador de Asistencia al viajero rediseñado (frontend_general POL-2959): "Datos del viaje" con
 * destino, rango de fechas (DatePickerInput de Mantine) y una casilla de edad por pasajero; después
 * el listado por compañía (sidebar "Asistencias") con tarjetas `.ctrowAuto` (`--travel` solo si el plan
 * trae precio en USD: Universal no lo trae).
 */
export default class CotizarAsistenciaViajero {
    readonly page: Page;
    readonly datosViajeHeading: Locator;
    readonly paisDestinoSearchbox: Locator;
    readonly multiplesDestinosCheckbox: Locator;
    readonly fechasControl: Locator;
    readonly calendario: Locator;
    readonly calendarioMes: Locator;
    readonly calendarioSiguienteMes: Locator;
    readonly diasCobertura: Locator;
    readonly agregarPasajeroBtn: Locator;
    readonly edadesError: Locator;
    readonly cotizarBtn: Locator;
    readonly resultadoHeading: Locator;
    readonly volverDatosViajeBtn: Locator;
    readonly sidebarTiles: Locator;
    readonly companiaSeleccionadaHeader: Locator;
    readonly companiaSinCotizacion: Locator;
    /** La compañía respondió sin planes (regla de edad, duración o destino): no es un error. */
    readonly companiaSinPlanes: Locator;
    /** "Recotizar" del header cuando la compañía falló: vuelve a cotizar solo esa compañía. */
    readonly recotizarBtn: Locator;
    readonly planes: Locator;
    /** Popover (desktop) o bottom sheet (≤767px) de "Ver las N formas de pago": va por portal, fuera de la tarjeta. */
    readonly formasPagoPanel: Locator;
    readonly formasPagoItems: Locator;
    readonly formasPagoCerrarBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.datosViajeHeading = page.getByRole("heading", { name: "Datos del viaje", level: 1 });
        this.paisDestinoSearchbox = page.getByRole("searchbox", { name: "País de destino" });
        this.multiplesDestinosCheckbox = page.getByRole("checkbox", { name: "Múltiples destinos" });
        this.fechasControl = page.locator('button[data-dates-input="true"], button.mantine-DatePickerInput-input').first();
        this.calendario = page.getByRole("dialog");
        this.calendarioMes = this.calendario.locator(".mantine-CalendarHeader-calendarHeaderLevel");
        this.calendarioSiguienteMes = this.calendario.locator(".mantine-CalendarHeader-calendarHeaderControl").last();
        this.diasCobertura = page.locator(".EntradaCotizarForm__travelDaysCounter");
        this.agregarPasajeroBtn = page.getByRole("button", { name: "Agregar pasajero" });
        this.edadesError = page.locator(".PassengerAgesField").getByRole("alert");
        this.cotizarBtn = page.getByRole("button", { name: "Cotizar", exact: true });
        this.resultadoHeading = page.getByRole("heading", { level: 1 }).filter({ hasText: /pasajeros?$/ });
        this.volverDatosViajeBtn = page.getByRole("button", { name: "Volver a los datos del viaje" });
        this.sidebarTiles = page.locator("button.QuotationSidebar__companyTile");
        this.companiaSeleccionadaHeader = page.locator(".response__tab__selectedCompanyInfoHeader");
        this.companiaSinCotizacion = this.companiaSeleccionadaHeader.getByText("No se pudo obtener cotización");
        this.companiaSinPlanes = page.getByText(/no tiene planes para este viaje/);
        this.recotizarBtn = this.companiaSeleccionadaHeader.getByRole("button", { name: "Recotizar" });
        this.planes = page.locator(".ctrowAuto").filter({ has: page.locator("button[id^='emitirButton_']") });
        this.formasPagoPanel = page.locator(".ctrowPay__panel");
        this.formasPagoItems = this.formasPagoPanel.locator("li.ctrowPay__item");
        this.formasPagoCerrarBtn = this.formasPagoPanel.getByRole("button", { name: "Cerrar formas de pago" });
    }

    edadPasajeroInput(index: number): Locator {
        return this.page.getByRole("textbox", { name: `Edad del pasajero ${index + 1}`, exact: true });
    }

    opcionDestino(nombre: string): Locator {
        return this.page.getByRole("option", { name: nombre, exact: true });
    }

    diaCalendario(label: string): Locator {
        return this.calendario.getByRole("button", { name: label, exact: true });
    }

    /** Tile por nombre: el texto del botón arranca con el `<style>` inline del logo SVG. */
    companiaTile(tile: string): Locator {
        return this.sidebarTiles.filter({
            has: this.page.locator(".QuotationSidebar__companyName", { hasText: new RegExp(`^\\s*${escapeRegExp(tile)}`) }),
        });
    }

    companiaTileExito(tile: string): Locator {
        return this.companiaTile(tile).locator(".QuotationSidebar__statusBadge--success");
    }

    companiaTileError(tile: string): Locator {
        return this.companiaTile(tile).locator(".QuotationSidebar__statusBadge--error");
    }

    planNombre(plan: Locator): Locator {
        return plan.locator(".ctrowAuto__name");
    }

    planPrecio(plan: Locator): Locator {
        return plan.locator(".ctrowAuto__price");
    }

    planPrecioUsd(plan: Locator): Locator {
        return plan.locator(".ctrowAuto__price--usd");
    }

    /** "Ver las N formas de pago": solo está si el plan tiene más de una promoción de pago o transferencia. */
    planFormasPagoToggle(plan: Locator): Locator {
        return plan.getByRole("button", { name: /^Ver las \d+ formas de pago$/ });
    }

    formaPagoTitulo(item: Locator): Locator {
        return item.locator(".ctrowPay__itemTitle");
    }

    formaPagoPrecio(item: Locator): Locator {
        return item.locator(".ctrowPay__itemPrice");
    }

    /** Línea bajo el precio: "USD 33,68", "por cuota" o "en total". */
    formaPagoSecundario(item: Locator): Locator {
        return item.locator(".ctrowPay__itemAmount .ctrowPay__itemSub");
    }

    /** "Emitir" de la tarjeta: `#emitirButton_<id TerraWind>` o `#emitirButton_<code Snuggle>`. */
    planEmitirBtn(plan: Locator): Locator {
        return plan.locator("button[id^='emitirButton_']");
    }

    planAgregarBtn(plan: Locator): Locator {
        return plan.locator(".ctrowAuto__addButton");
    }
}
