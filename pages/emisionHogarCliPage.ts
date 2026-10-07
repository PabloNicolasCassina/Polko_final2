import { Page, Locator, expect } from "@playwright/test";
import { setupReactErrorGuard } from "../helpers/reactErrorGuard";

export interface HogarCliDatos {
    codigoPostal: string;
    localidad: string;
    formaPago: "Débito por CBU" | "Tarjeta de Crédito";
    cbu?: string;
    dniCuit: string;
}

export interface ResultadoEmisionHogar {
    numeroTramite: string;
    numeroReferencia: string;
    numeroPoliza: string;
}

/**
 * Page Object que reproduce, paso a paso, el flujo de cotización + emisión
 * de Hogar tal como fue relevado manualmente con playwright-cli:
 * Dashboard -> Cotizar Hogar -> Información -> Coberturas -> Cotización -> Póliza -> Clientes -> Solicitud/Emitir.
 */
export default class EmisionHogarCliPage {
    readonly page: Page;

    // Dashboard
    readonly bienvenidaHeading: Locator;
    readonly navHogarBtn: Locator;

    // Paso 1: Información
    readonly codigoPostalInput: Locator;
    readonly localidadSearchbox: Locator;
    readonly siguienteBtn: Locator;

    // Paso 2: Coberturas
    readonly cotizarBtn: Locator;

    // Paso 3: Cotización (resultado)
    readonly cuotaMensualText: Locator;

    // Paso 4: Póliza (forma de pago)
    readonly formaPagoSearchbox: Locator;
    readonly cbuInput: Locator;

    // Paso 5: Clientes
    readonly dniCuitInput: Locator;
    readonly buscarClienteBtn: Locator;

    // Paso 6: Solicitud / Emisión
    readonly emitirBtn: Locator;
    readonly emisionExitosaText: Locator;
    readonly numeroTramiteValor: Locator;
    readonly numeroReferenciaValor: Locator;
    readonly numeroPolizaValor: Locator;

    constructor(page: Page) {
        this.page = page;
        setupReactErrorGuard(page);

        this.bienvenidaHeading = page.getByRole("heading", { name: "¡Bienvenido" });
        this.navHogarBtn = page.getByRole("button", { name: "HOGAR", exact: true });

        this.codigoPostalInput = page.getByRole("textbox", { name: "Código postal" });
        this.localidadSearchbox = page.getByRole("searchbox", { name: "Localidad" });
        this.siguienteBtn = page.getByRole("button", { name: "Siguiente" });

        // Sin exact: el botón se renderiza en mayúsculas ("COTIZAR") vía CSS text-transform,
        // y getByRole matchea el nombre accesible ya transformado.
        this.cotizarBtn = page.getByRole("button", { name: "Cotizar" });

        this.cuotaMensualText = page.getByText(/Cuota Mensual: \$/);

        this.formaPagoSearchbox = page.getByRole("searchbox", { name: "Forma De Pago" });
        this.cbuInput = page.locator('input[name="infoDePago.numeroCbu"]');

        this.dniCuitInput = page.getByRole("textbox", { name: "DNI o CUIT/CUIL" });
        this.buscarClienteBtn = page.getByRole("button", { name: "Buscar", exact: true });

        // Mismo caso que cotizarBtn: el botón se muestra como "EMITIR" en mayúsculas.
        this.emitirBtn = page.getByRole("button", { name: "Emitir" });
        this.emisionExitosaText = page.getByText("la operación se ha realizado con éxito");
        this.numeroTramiteValor = page.getByText("Número de trámite").locator("xpath=following-sibling::p[1]");
        this.numeroReferenciaValor = page.getByText("Número de referencia").locator("xpath=following-sibling::p[1]");
        this.numeroPolizaValor = page.getByText("Número de póliza").locator("xpath=following-sibling::p[1]");
    }

    /** Navega al dashboard autenticado y espera a que renderice contenido real (no la landing pública). */
    async irADashboard() {
        await this.page.goto("/u/dashboard", { waitUntil: "domcontentloaded" });
        await expect(this.bienvenidaHeading).toBeVisible({ timeout: 30000 });
    }

    /** Desde el dashboard, entra a la cotización de Hogar vía el nav "Cotizar". */
    async irACotizarHogar() {
        await this.navHogarBtn.click();
        await expect(this.page).toHaveURL(/\/u\/cotizar\/hogar/);
        await expect(this.codigoPostalInput).toBeVisible({ timeout: 30000 });
    }

    /**
     * Paso 1 (Información): completa código postal y selecciona localidad.
     * Tipo y tamaño de vivienda quedan con el valor por defecto que precarga el formulario (Casa / Mediana).
     */
    async completarInformacionVivienda(datos: Pick<HogarCliDatos, "codigoPostal" | "localidad">) {
        await this.codigoPostalInput.fill(datos.codigoPostal);

        await this.localidadSearchbox.click();
        const opcionLocalidad = this.page.getByRole("option", { name: new RegExp(datos.localidad, "i") }).first();
        await expect(opcionLocalidad).toBeVisible({ timeout: 30000 });
        await opcionLocalidad.click();

        await this.siguienteBtn.click();
    }

    /**
     * Paso 2 (Coberturas): acepta las sumas aseguradas y adicionales por defecto y cotiza.
     */
    async cotizarConCoberturasPorDefecto(): Promise<string> {
        await this.cotizarBtn.click();
        await expect(this.cuotaMensualText).toBeVisible({ timeout: 60000 });
        return this.leerCuotaMensual();
    }

    async leerCuotaMensual(): Promise<string> {
        const texto = await this.cuotaMensualText.innerText();
        return texto.replace("Cuota Mensual: ", "").trim();
    }

    /** Paso 3 (Cotización): avanza al armado de póliza. */
    async avanzarAPoliza() {
        await this.siguienteBtn.click();
        await expect(this.cbuInput).toBeVisible({ timeout: 30000 });
    }

    /**
     * Paso 4 (Póliza): completa forma de pago. "Débito por CBU" viene preseleccionada por defecto,
     * por lo que solo hace falta cargar el número de CBU.
     */
    async completarFormaDePago(datos: Pick<HogarCliDatos, "formaPago" | "cbu">) {
        if (datos.formaPago === "Débito por CBU") {
            if (!datos.cbu) {
                throw new Error("Falta el número de CBU para la forma de pago 'Débito por CBU'.");
            }
            await this.cbuInput.fill(datos.cbu);
        } else {
            await this.formaPagoSearchbox.click();
            await this.page.getByRole("option", { name: datos.formaPago }).click();
        }
        await this.siguienteBtn.click();
    }

    /**
     * Paso 5 (Clientes): busca al cliente por DNI/CUIT y espera a que el formulario
     * se autocomplete con sus datos personales antes de avanzar.
     */
    async buscarYSeleccionarCliente(dniCuit: string) {
        await this.dniCuitInput.fill(dniCuit);
        await this.buscarClienteBtn.click();

        // El buscador autocompleta el resto del formulario (nombre, domicilio, localidad, IVA, etc.)
        const localidadClienteSearchbox = this.page.getByRole("searchbox", { name: "Localidad" });
        await expect(localidadClienteSearchbox).toHaveValue(/.+/, { timeout: 30000 });

        await expect(this.siguienteBtn).toBeEnabled({ timeout: 30000 });
        await this.siguienteBtn.click();
    }

    /**
     * Paso 6 (Solicitud): emite la póliza y devuelve los identificadores de la emisión exitosa.
     */
    async emitir(): Promise<ResultadoEmisionHogar> {
        await expect(this.emitirBtn).toBeEnabled({ timeout: 30000 });
        await this.emitirBtn.click();

        await expect(this.emisionExitosaText).toBeVisible({ timeout: 120000 });

        return {
            numeroTramite: (await this.numeroTramiteValor.innerText()).trim(),
            numeroReferencia: (await this.numeroReferenciaValor.innerText()).trim(),
            numeroPoliza: (await this.numeroPolizaValor.innerText()).trim(),
        };
    }
}
