import { Page, Locator } from "@playwright/test";

export default class CotizacionAsistenciaViajero {
    readonly page: Page;
    readonly misAseguradorasButton: Locator;
    readonly productoCombobox: Locator;
    readonly paisDestinoSearchbox: Locator;
    readonly multiplesDestinosCheckbox: Locator;
    readonly salidaRegresoButton: Locator;
    /** Control clickeable del date range (el label "Salida/Regreso" no está en el botón). */
    readonly salidaRegresoControl: Locator;
    readonly edadPasajero1Textbox: Locator;
    readonly cotizarButton: Locator;
    readonly aceptarButton: Locator;
    /** Tags TerraWind (release-51.0): Nacional / Regional / Receptivo. */
    readonly tagNacional: Locator;
    readonly tagRegional: Locator;
    readonly tagReceptivo: Locator;

    constructor(page: Page) {
        this.page = page;
        this.misAseguradorasButton = page.getByRole("button", { name: "MIS ASEGURADORAS" });
        this.productoCombobox = page.getByRole("combobox");
        this.paisDestinoSearchbox = page.getByRole("searchbox", { name: "País de destino" });
        this.multiplesDestinosCheckbox = page.getByRole("checkbox", { name: "Multiples destinos" });
        this.salidaRegresoButton = page.getByRole("button").filter({ hasText: "Salida/Regreso" });
        // DatePickerInput de Mantine (aria-haspopup=dialog); evita matchear "Mis Aseguradoras".
        this.salidaRegresoControl = page.locator(
            'button[data-dates-input="true"], button.mantine-DatePickerInput-input'
        ).first();
        this.edadPasajero1Textbox = page.getByRole("textbox", { name: "Edad pasajero 1" });
        this.cotizarButton = page.getByRole("button", { name: "COTIZAR" });
        this.aceptarButton = page.getByRole("button", { name: "ACEPTAR" });
        this.tagNacional = page.getByText("Nacional", { exact: true });
        this.tagRegional = page.getByText("Regional", { exact: true });
        this.tagReceptivo = page.getByText("Receptivo", { exact: true });
    }
}

