import { Page, Locator, expect } from "@playwright/test";
import path from "path";
import CommonButtons from "../components/commonButtons";
import CotizacionMoto from "../components/moto/cotizacionMoto";
import CotizacionPersonaMoto from "../components/moto/cotizacionPersonaMoto";
import EmisionDetalleMoto from "../components/moto/emisionDetalleMoto";
import EmisionInspeccion from "../components/moto/emisionInspeccion";
import EmisionFinal from "../components/emisionFinal";
import EmisionCliente from "../components/emisionCliente";
import EmisionFormaPago from "../components/emisionFormaPago";
import CtrowAutoTable from "../components/ctrowAutoTable";
import QuotationSidebar from "../components/quotationSidebar";
import { settleLocalidadIfPresent } from "../helpers/settleLocalidad";
import { reportarNumeroEmision } from "../helpers/reportePoliza";

/**
 * Page Object de /u/cotizar/motovehiculo — cotización, config avanzada por
 * aseguradora y flujo completo de emisión hasta la pantalla de éxito.
 *
 * Verificado en vivo (BENELLI LEONCINO 250 - 2022, sesión userPre) el
 * 2026-09-14: clickeando las aseguradoras del sidebar, volcando el DOM del panel
 * `.QuotationLayout__sidebar` (config avanzada) y de la tabla de resultados,
 * y emitiendo Rivadavia "BASE PLUS" (código "F") de punta a punta.
 * Triunfo: config avanzada + planes mapeados 2026-09-22.
 *
 * NO reusa `components/moto/cotizacionTablaMoto.ts` — ese archivo depende
 * de la clase legacy `.ctrow__container`, que **ya no existe en el DOM**
 * (confirmado en vivo: `.ctrowAuto` = 5+ filas, `.ctrow__container` = 0).
 * Moto usa la misma tabla rediseñada `.ctrowAuto` que automotor — ver
 * `components/ctrowAutoTable.ts`, compartida entre ambos page objects.
 */

/**
 * Campos de "Configuración avanzada" por aseguradora (moto).
 * Mapeado en vivo 2026-09-15 con userPre + BENELLI LEONCINO 250 / CP 5000
 * (ver `docs/moto_config_avanzada_map.json`).
 * Triunfo: vivo 2026-09-22 (mismo vehículo/mock ATM) — sin `ajusteAutomatico`
 * (disabled fijo "Aplicar 20%", no entra al mapeo pairwise).
 */
export const CONFIG_AVANZADA_FIELDS_MOTO: Record<string, string[]> = {
    Sancor: ["vigencia", "fechaCotizacion", "sumaAseguradaVehiculo", "usoVehiculo"],
    RUS: ["ajusteAutomatico", "sumaAseguradaVehiculo", "vigenciaDesde"],
    Rivadavia: ["grua", "ajusteAutomatico", "fechaCotizacion", "facturacion", "cuotas", "usoVehiculo"],
    ATM: ["alarma", "tipoVigencia", "vigenciaDesde", "formaDePago", "facturacion", "cuotas", "ajusteAutomatico"],
    // ids: select_/number_/dependant_configuracionAvanzada.Triunfo.<field>
    Triunfo: ["usoVehiculo", "sumaAseguradaVehiculo", "facturacion", "cuotas", "formaDePago"],
};

/** Checkboxes dentro de `CONFIG_AVANZADA_FIELDS_MOTO` (label visible en UI). */
export const CONFIG_AVANZADA_CHECKBOX_FIELDS_MOTO: Record<string, string[]> = {
    Rivadavia: ["grua"], // UI: "Grúa (AP - plan D)" — id `configuracionAvanzada.Rivadavia.grua`
    ATM: ["alarma"], // en vivo viene checked + disabled
};

/**
 * Campos presentes pero no editables (disabled en UI).
 * No deben entrar al pairwise como ejes.
 */
export const CONFIG_AVANZADA_DISABLED_FIELDS_MOTO: Record<string, string[]> = {
    Sancor: ["vigencia"], // fijo "Anual"
    ATM: ["alarma", "tipoVigencia"], // alarma checked; tipoVigencia fijo "Anual"
};

/**
 * Opciones de combobox por aseguradora (fuente de verdad del pairwise).
 * Mapeado abriendo cada listbox en vivo el 2026-09-15.
 * Triunfo: vivo 2026-09-22 (usoVehiculo / formaDePago; facturación→cuotas vía PAGO_*).
 */
export const CONFIG_AVANZADA_OPTIONS_BY_COMPANY_MOTO: Record<string, Record<string, string[]>> = {
    Sancor: {
        usoVehiculo: ["Particular"],
    },
    RUS: {
        ajusteAutomatico: ["No aplicar", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
    },
    Rivadavia: {
        ajusteAutomatico: ["Aplicar 10%", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
        facturacion: ["Mensual", "Trimestral", "Semestral"],
        usoVehiculo: ["Particular"],
    },
    ATM: {
        formaDePago: ["Tarjeta de Crédito", "Débito por CBU", "Efectivo"],
        // facturación/cuotas dependen de formaDePago (ver PAGO_FACTURACION_CUOTAS).
        ajusteAutomatico: ["No aplicar", "Aplicar 10%", "Aplicar 20%"],
    },
    Triunfo: {
        usoVehiculo: ["Particular", "Comercial", "Especial"],
        // facturación/cuotas dependen de formaDePago — ver PAGO_FACTURACION_CUOTAS.
    },
};

/**
 * Cuotas válidas por tipo de facturación (campo dependant).
 * Rivadavia (vivo 2026-09-15): Mensual→[1], Trimestral→[1,3], Semestral→[1,6].
 * ATM: no usar solo esto — facturación también depende de formaDePago
 * (ver CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_MOTO).
 */
export const CONFIG_AVANZADA_CUOTAS_BY_FACTURACION_MOTO: Record<string, Record<string, string[]>> = {
    Rivadavia: {
        Mensual: ["1"],
        Trimestral: ["1", "3"],
        Semestral: ["1", "6"],
    },
    ATM: {
        Mensual: ["1"],
        Bimestral: ["1", "2"],
        Trimestral: ["1", "3"],
    },
};

/**
 * Rivadavia: ajuste automático depende de facturación (Semestral sin 10%).
 */
export const CONFIG_AVANZADA_AJUSTE_BY_FACTURACION_MOTO: Record<string, Record<string, string[]>> = {
    Rivadavia: {
        Mensual: ["Aplicar 10%", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
        Trimestral: ["Aplicar 10%", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
        Semestral: ["Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
    },
};

/**
 * Cadena dependant formaDePago → facturación → cuotas.
 *
 * ATM:
 *   Tarjeta / Débito CBU → Mensual(1) | Bimestral(1|2)
 *   Efectivo            → Bimestral(1|2) | Trimestral(1|3)
 *
 * Triunfo (vivo 2026-09-22 + TriunfoAdvanceConfig; el listbox a veces deja
 * opciones stale — no confiar en dump sin filtrar):
 *   Medios electrónicos → Mensual(1) | Trimestral(1|2|3)
 *   Efectivo            → Trimestral(1|2|3)  (NO Mensual)
 */
export const CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_MOTO: Record<
    string,
    Record<string, Record<string, string[]>>
> = {
    ATM: {
        "Tarjeta de Crédito": {
            Mensual: ["1"],
            Bimestral: ["1", "2"],
        },
        "Débito por CBU": {
            Mensual: ["1"],
            Bimestral: ["1", "2"],
        },
        Efectivo: {
            Bimestral: ["1", "2"],
            Trimestral: ["1", "3"],
        },
    },
    Triunfo: {
        "Medios electrónicos": {
            Mensual: ["1"],
            Trimestral: ["1", "2", "3"],
        },
        Efectivo: {
            Trimestral: ["1", "2", "3"],
        },
    },
};

/**
 * Valores de la barra "Descuento extra" (slider Mantine) por aseguradora.
 * Tope = `aria-valuemax` del role=slider (NO el markLabel visible: puede
 * mostrar menos que el max real). Pairwise itera [0, max].
 * Mapeado en vivo 2026-09-21/22 con userPre + BENELLI LEONCINO 250 / CP 5000:
 *   RUS / Rivadavia → aria-valuemax=15
 *   ATM / Triunfo   → aria-valuemax=30
 *   Sancor          → tope 0 en userPre (sin ejes útiles; no entra)
 */
export const CONFIG_AVANZADA_DESCUENTOS_MOTO: Record<string, number[]> = {
    RUS: [0, 15],
    Rivadavia: [0, 15],
    ATM: [0, 30],
    Triunfo: [0, 30],
};

/**
 * @deprecated Preferí `CONFIG_AVANZADA_OPTIONS_BY_COMPANY_MOTO`.
 * Se mantiene como fallback vacío de ejes compartidos.
 */
export const CONFIG_AVANZADA_OPTIONS_MOTO: Record<string, string[]> = {};


/** Códigos de plan por aseguradora (para `planCard`/`agregarBtn`/`emitirBtn`), confirmados en vivo. */
export const PLAN_CODES_MOTO: Record<string, Record<string, string>> = {
    Sancor: {
        "Moto Base (RC)": "1",
        "Moto Plus": "3",
        "Moto Premium": "17",
        "Moto Gold": "5",
    },
    RUS: {
        RCM: "RCM",
        "RCM c/grúa": "RCM-G",
        "B1-80 Moto": "B1-80 MOTO AG",
        "B-80 Moto": "B-80 MOTO AG",
    },
    Rivadavia: {
        Base: "A",
        "Base Plus": "F",
        Total: "B",
        Max: "C",
    },
    ATM: {
        "RC sin asistencia": "A1",
        RC: "A0",
        "Robo Total Clásico sin asistencia": "B3",
        "Robo Total Clásico": "B2",
        "Robo Premium": "C",
    },
    // Mismos ids/nombres que SSE Triunfo moto (logs products); UI muestra el código.
    Triunfo: {
        A: "A",
        B4: "B4",
        B1: "B1",
        B3: "B3",
        B: "B",
        C1: "C1",
        C2: "C2",
        C: "C",
        C8: "C8",
        "C2 Full": "C2Full",
        D4: "D4",
        D3: "D3",
        D2: "D2",
        D: "D",
    },
};

/**
 * Nombres exactos de los 5 documentos descargables en la pantalla de éxito,
 * verificados en vivo el 2026-09-14 (Rivadavia BASE PLUS, forma de pago
 * Efectivo) — cada uno matcheó exactamente 1 botón "Descargar" vía
 * `documentoDescargarBtn(nombre)`.
 */
export const DOCUMENTOS_DESCARGABLES = [
    "Póliza completa",
    "Certificado de cobertura",
    "Factura",
    "Frente póliza / cuponera Pago Fácil",
    "Comprobante de emisión",
] as const;

/**
 * Timeouts de este page object. Bajados respecto a los "peor caso" que usa
 * el resto del repo (ej. auto tolera hasta 180000ms por cotización) para que,
 * durante desarrollo/debugging, un selector roto falle en segundos y no
 * cuelgue el test varios minutos. Si el backend local está genuinamente
 * lento (no roto), subí `QUOTE_TIMEOUT` en vez de tocar cada `expect()`.
 */
const FIELD_TIMEOUT = 15000; // aparece un campo/botón puntual
const SETTLE_TIMEOUT = 20000; // termina un lookup async (localidad, etc.)
const QUOTE_TIMEOUT = 45000; // respuesta real de backend (cotizar/aplicar/emitir)
/** Form listo tras goto; si no aparece (shell blanco bajo carga), se recarga. */
const FORM_READY_TIMEOUT = 30000;
const GOTO_ATTEMPTS = 3;

export default class CotizarMotoIAPage {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly cotizacionMoto: CotizacionMoto;
    readonly cotizacionPersona: CotizacionPersonaMoto;
    readonly emisionDetalleMoto: EmisionDetalleMoto;
    readonly emisionInspeccion: EmisionInspeccion;
    readonly emisionFinal: EmisionFinal;
    readonly emisionCliente: EmisionCliente;
    readonly emisionFormaPago: EmisionFormaPago;
    readonly ctrowTable: CtrowAutoTable;
    readonly sidebar: QuotationSidebar;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.cotizacionMoto = new CotizacionMoto(page);
        this.cotizacionPersona = new CotizacionPersonaMoto(page);
        this.emisionDetalleMoto = new EmisionDetalleMoto(page);
        this.emisionInspeccion = new EmisionInspeccion(page);
        this.emisionFinal = new EmisionFinal(page);
        this.emisionCliente = new EmisionCliente(page);
        this.emisionFormaPago = new EmisionFormaPago(page);
        this.ctrowTable = new CtrowAutoTable(page);
        this.sidebar = new QuotationSidebar(page);
    }

    /** Tile de "Aseguradoras" por nombre visible (sidebar en desktop, item del drawer en compacto). */
    companyTile(label: string): Locator {
        return this.sidebar.companyTile(label);
    }

    /** Compañía seleccionada (tile `.is-active` en desktop, nombre en la barra mobile en compacto). */
    get companyTileActive(): Locator {
        return this.sidebar.companyTileActive;
    }

    /**
     * Navega al cotizador moto y espera el form accionable.
     * Con varios workers el shell (nav + sidebar) a veces carga y el contenido
     * queda en blanco: subir timeout no ayuda. Recargar y reintentar sí.
     */
    async goto(): Promise<void> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= GOTO_ATTEMPTS; attempt++) {
            await this.page.goto("/u/cotizar/motovehiculo", {
                waitUntil: "domcontentloaded",
                timeout: 120000,
            });
            try {
                await this.waitForVehiculoFormReady(FORM_READY_TIMEOUT);
                return;
            } catch (error) {
                lastError = error;
                if (attempt === GOTO_ATTEMPTS) break;
            }
        }
        throw lastError;
    }

    /** Marca visible + enabled (form hidratado, no solo el shell). */
    private async waitForVehiculoFormReady(timeout = FORM_READY_TIMEOUT): Promise<void> {
        await expect(
            this.cotizacionMoto.marcaSelector,
            "Formulario Motovehículo no cargó (select marca ausente — posible shell en blanco bajo carga)",
        ).toBeVisible({ timeout });
        await expect(this.cotizacionMoto.marcaSelector).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.loadingSpinner.waitFor({ state: "hidden", timeout: FIELD_TIMEOUT }).catch(() => {});
    }

    /**
     * Abre un Mantine Select del vehículo y elige la opción.
     * Espera accionable + scroll (mismo patrón que auto: evita click ciego).
     */
    private async selectVehiculoOption(field: Locator, optionText: string): Promise<void> {
        await expect(field).toBeVisible({ timeout: FIELD_TIMEOUT });
        await expect(field).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await field.scrollIntoViewIfNeeded();
        await this.buttons.loadingSpinner.waitFor({ state: "hidden", timeout: FIELD_TIMEOUT }).catch(() => {});
        await field.click();
        const option = this.page.getByRole("option", { name: optionText, exact: true });
        await expect(option).toBeVisible({ timeout: SETTLE_TIMEOUT });
        await option.click();
    }

    /**
     * Completa "Datos del vehículo" + "Datos del titular" y cotiza. Sesión userPre
     * ya trae el resto de los datos de persona precargados (código postal alcanza).
     * Opcional: `esCeroKm`, `tipoPersona` / `sitImpositiva` (jurídica / RI).
     *
     * @param opts.waitForResults Si false, termina en el click de Cotizar (no espera
     *   resultados). Útil solo para seed de Últimas cotizaciones.
     */
    async cotizarVehiculo(
        moto: {
            marca: string;
            año: string;
            version: string;
            c_postal: string;
            esCeroKm?: boolean;
            tipoPersona?: string;
            sitImpositiva?: string;
        },
        opts: { waitForResults?: boolean } = {}
    ): Promise<void> {
        const waitForResults = opts.waitForResults !== false;

        // Defensa si se llama sin goto() previo, o el form se desmontó a mitad.
        await this.waitForVehiculoFormReady(FORM_READY_TIMEOUT);

        await this.selectVehiculoOption(this.cotizacionMoto.marcaSelector, moto.marca);
        await this.selectVehiculoOption(this.cotizacionMoto.añoSelector, moto.año);
        await this.selectVehiculoOption(this.cotizacionMoto.versionSelector, moto.version);
        if (moto.esCeroKm) {
            await this.cotizacionMoto.ceroKmSelector.click();
            await this.buttons.siOptionLocator.click();
        }
        await this.buttons.siguienteBtn.click();

        await expect(this.cotizacionPersona.codPostal).toBeVisible({ timeout: FIELD_TIMEOUT });

        if (moto.tipoPersona) {
            await this.cotizacionPersona.tipoPersona.click();
            await this.cotizacionPersona.getTipoPersonaLocator(moto.tipoPersona).click();
        }
        if (moto.sitImpositiva) {
            await this.cotizacionPersona.sitImpositiva.click();
            await this.cotizacionPersona.getSitImpositivaLocator(moto.sitImpositiva).click();
            await expect(this.cotizacionPersona.getSitImpositivaLocator(moto.sitImpositiva)).toBeHidden({
                timeout: FIELD_TIMEOUT,
            });
        }

        await this.cotizacionPersona.codPostal.fill(moto.c_postal);
        // El código postal dispara un lookup async de provincia/localidad; el botón
        // "Cotizar" puede quedar habilitado ANTES de que ese lookup termine (carrera
        // de condición confirmada en vivo: clickear ya es prematuro y la cotización
        // nunca vuelve). Esperar a que la localidad se autocomplete de verdad.
        await expect(this.cotizacionPersona.localidad).not.toHaveValue("", { timeout: SETTLE_TIMEOUT });
        await expect(this.buttons.cotizarBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.cotizarBtn.click();

        if (waitForResults) {
            await this.esperarResultadosCotizacion();
        }
    }

    /**
     * Click en el tile de la aseguradora en el sidebar.
     * Espera primero el tilde verde de ESA compañía: el primer success global
     * puede ser otra (Sancor/RUS/…) mientras Triunfo sigue cotizando.
     */
    async selectCompania(label: string): Promise<void> {
        await this.esperarResultadosCotizacion(120000, label);
        await this.sidebar.seleccionarCompania(label);
        await expect(this.page.locator(".ctrowAuto").first()).toBeVisible({ timeout: QUOTE_TIMEOUT });
    }

    /** Tilde verde (`.statusBadge--success`) en el tile de la aseguradora. */
    companySuccessBadge(label: string): Locator {
        return this.sidebar.companySuccessBadge(label);
    }

    /**
     * Espera cotización lista. Preferir `company` (tilde verde de esa aseguradora):
     * `.ctrowAuto` puede no aparecer si otra compañía (ej. Sancor) sigue cargando
     * o falló, aunque la bajo prueba ya haya respondido.
     */
    async esperarResultadosCotizacion(timeout = QUOTE_TIMEOUT, company?: string): Promise<void> {
        if (company) {
            await this.sidebar.esperarCotizacionCompania(company, timeout);
            return;
        }
        await this.sidebar.esperarAlgunaCotizacion(timeout, ".ctrowAuto");
    }

    /**
     * Continúa el flujo abierto por RECOTIZAR desde Últimas cotizaciones:
     * el form viene precargado en "Datos del vehículo" → Siguiente → COTIZAR →
     * tilde verde de `company`.
     */
    async avanzarRecotizacionHastaResultados(company: string): Promise<void> {
        await expect(this.page.getByRole("heading", { name: "Datos del vehículo" })).toBeVisible({
            timeout: FIELD_TIMEOUT,
        });
        await expect(this.buttons.siguienteBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.siguienteBtn.click();

        await expect(this.page.getByRole("heading", { name: "Datos del titular" })).toBeVisible({
            timeout: FIELD_TIMEOUT,
        });
        await expect(this.cotizacionPersona.localidad).not.toHaveValue("", { timeout: SETTLE_TIMEOUT });
        await expect(this.buttons.cotizarBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.cotizarBtn.click();
        await this.esperarResultadosCotizacion(QUOTE_TIMEOUT, company);
    }

    /** Asserts de éxito de emisión (happy path / regresión). */
    async assertEmisionExitosa(): Promise<void> {
        await expect(this.emisionExitosaHeading.or(this.emisionFinal.errorEmision)).toBeVisible({
            timeout: QUOTE_TIMEOUT * 2,
        });
        await expect(this.emisionFinal.errorEmision).not.toBeVisible();
        await reportarNumeroEmision(this.numeroPolizaValue);
        await expect(this.anyDocumentoDescargarBtn.first()).toBeEnabled();
    }

    /**
     * Locator genérico de un campo de "Configuración avanzada" para una aseguradora,
     * robusto a los distintos prefijos de id (select_/dependant_/number_/date_/ninguno)
     * — el prefijo varía por campo/aseguradora (ej. RUS usa "select_" para
     * ajusteAutomatico, Rivadavia usa "dependant_").
     */
    configField(company: string, field: string): Locator {
        return this.page.locator(`[id*="configuracionAvanzada.${company}.${field}"]`);
    }

    /** Selecciona una opción de un campo combobox de config avanzada (ej. `usoVehiculo`, `facturacion`). */
    async selectConfigOption(company: string, field: string, optionText: string): Promise<void> {
        await this.sidebar.abrirConfigAvanzada();
        await this.configField(company, field).click();
        const option = this.page.getByRole("option", { name: optionText, exact: true });
        // Fail-fast si la opción no existe para el estado actual (ej. Semestral sin 10%).
        await expect(
            option,
            `Opción "${optionText}" no visible en ${company}.${field}`,
        ).toBeVisible({ timeout: 5000 });
        await option.click();
    }

    /** Label visible "Descuento extra" del specialComponent discountSlider. */
    get descuentoExtraLabel(): Locator {
        return this.page.getByText("Descuento extra", { exact: true });
    }

    /** Thumb del slider Mantine de descuento (role=slider). */
    get descuentoSlider(): Locator {
        return this.page.getByRole("slider");
    }

    /** Track del slider (para click por ratio si no hay mark). */
    get descuentoSliderTrack(): Locator {
        return this.page.locator(".mantine-Slider-root").first();
    }

    /** Mark label del % en la barra (ej. `0%`, `15%`, `30%`). */
    descuentoBarMark(percent: number): Locator {
        return this.page.getByText(`${percent}%`, { exact: true });
    }

    /**
     * Setea la barra "Descuento extra" al %. Preferir click en mark label;
     * fallback: click en la fracción percent/max del track.
     */
    async setDescuento(percent: number): Promise<void> {
        await this.sidebar.abrirConfigAvanzada();
        await expect(this.descuentoSlider).toBeVisible({ timeout: FIELD_TIMEOUT });
        const mark = this.descuentoBarMark(percent);
        if ((await mark.count()) > 0) {
            await mark.first().click();
            return;
        }
        const maxAttr = await this.descuentoSlider.getAttribute("aria-valuemax");
        const max = maxAttr ? Number(maxAttr) : 100;
        const ratio = Math.min(Math.max(percent / max, 0), 1);
        const box = await this.descuentoSliderTrack.boundingBox();
        if (!box) {
            throw new Error("No se pudo obtener boundingBox del slider de descuento moto");
        }
        await this.page.mouse.click(box.x + box.width * ratio, box.y + box.height / 2);
    }

    /** Marca/desmarca un campo checkbox de config avanzada (ej. `grua`, `alarma`). */
    async setConfigCheckbox(company: string, field: string, checked: boolean): Promise<void> {
        await this.sidebar.abrirConfigAvanzada();
        // Preferir role+nombre visible (Mantine: el input puede ser tricky de clickear).
        // Rivadavia grua = "Grúa (AP - plan D) Más información".
        if (company === "Rivadavia" && field === "grua") {
            const byLabel = this.page.getByRole("checkbox", { name: /Grúa \(AP - plan D\)/i });
            if ((await byLabel.count()) > 0) {
                const isChecked = await byLabel.isChecked();
                if (isChecked !== checked) {
                    await byLabel.click();
                }
                return;
            }
        }
        const box = this.configField(company, field);
        const isChecked = await box.isChecked();
        if (isChecked !== checked) {
            await box.click({ force: true });
        }
    }

    /**
     * Aplica una fila pairwise de config avanzada: setea cada campo presente y
     * habilitado en el DOM, luego "Aplicar cambios". Ausentes o disabled se
     * saltean (Sancor.vigencia viene disabled fijo en "Anual").
     * `descuento` es el specialComponent slider (no tiene id configuracionAvanzada.*).
     */
    async aplicarConfigCase(company: string, values: Record<string, string | boolean | number>): Promise<void> {
        const checkboxes = CONFIG_AVANZADA_CHECKBOX_FIELDS_MOTO[company] ?? [];
        // Cadena dependant: formaDePago → facturación → cuotas.
        const dependantOrder = (field: string): number => {
            if (field === "formaDePago") return 0;
            if (field === "facturacion") return 1;
            if (field === "cuotas") return 2;
            if (field === "descuento") return 3;
            return 10;
        };
        const entries = Object.entries(values).sort(
            ([a], [b]) => dependantOrder(a) - dependantOrder(b),
        );

        await this.sidebar.abrirConfigAvanzada();
        for (const [field, value] of entries) {
            if (field === "descuento") {
                await this.setDescuento(Number(value));
                continue;
            }

            const fieldLocator = this.configField(company, field);
            if ((await fieldLocator.count()) === 0) continue;

            if (checkboxes.includes(field) || typeof value === "boolean") {
                const enabled = await fieldLocator.isEnabled().catch(() => true);
                // Rivadavia grua se clickea por role; el input puede reportar rarezas.
                if (company === "Rivadavia" && field === "grua") {
                    await this.setConfigCheckbox(company, field, Boolean(value));
                    continue;
                }
                if (!enabled) continue;
                await this.setConfigCheckbox(company, field, Boolean(value));
            } else {
                const enabled = await fieldLocator.isEnabled().catch(() => false);
                if (!enabled) continue;
                await this.selectConfigOption(company, field, String(value));
                // Tras cambiar pago/facturación, el dependant siguiente se re-renderiza.
                if (field === "formaDePago" || field === "facturacion") {
                    await this.page.waitForTimeout(800);
                }
            }
        }
        await this.aplicarConfigAvanzada();
    }

    /** "Aplicar cambios" (desktop) o "Aplicar configuración" del drawer (compacto). */
    get aplicarCambiosBtn(): Locator {
        return this.sidebar.applyBtn;
    }

    /** Aplica la config avanzada y espera a que la tabla de cotización termine de refrescar. */
    async aplicarConfigAvanzada(): Promise<void> {
        await this.sidebar.aplicarConfig(FIELD_TIMEOUT);
        await expect(this.page.locator(".ctrowAuto").first()).toBeVisible({ timeout: QUOTE_TIMEOUT });
    }

    /** Tarjeta de un plan en la tabla de cotización, por código exacto (ver `PLAN_CODES_MOTO`). */
    planCard(code: string): Locator {
        return this.ctrowTable.planCard(code);
    }

    /**
     * Código de plan preferido si está en la tabla; si no, el de la primera tarjeta
     * (`.ctrowAuto`). Útil cuando una moto/config no ofrece el plan del happy path.
     */
    async resolvePlanCodeOrFirst(preferredCode: string): Promise<string> {
        const preferred = this.planCard(preferredCode);
        if ((await preferred.count()) > 0) {
            const visible = await preferred.first().isVisible().catch(() => false);
            if (visible) return preferredCode;
        }
        const firstCard = this.page.locator(".ctrowAuto").first();
        await expect(firstCard).toBeVisible({ timeout: QUOTE_TIMEOUT });
        const code = (await firstCard.locator(".ctrowAuto__code").innerText()).trim();
        if (!code) {
            throw new Error("No hay coberturas en la tabla de cotización para usar de fallback");
        }
        return code;
    }

    /** Botón "Agregar" de un plan (dentro de su tarjeta), por código. */
    agregarBtn(code: string): Locator {
        return this.ctrowTable.agregarBtn(code);
    }

    /** Botón "Emitir" de un plan, por código (id global `emitirButton_<code>`). */
    emitirBtn(code: string): Locator {
        return this.ctrowTable.emitirBtn(code);
    }

    /** Botón "COMPARAR (n)" que abre el drawer de coberturas agregadas. */
    get compararBtn(): Locator {
        return this.ctrowTable.compararBtn;
    }

    /** Botón "X" que cierra el drawer "Comparar coberturas". */
    get cerrarDrawerComparar(): Locator {
        return this.ctrowTable.cerrarDrawerComparar;
    }

    /** Item de un plan ya agregado en el drawer "Comparar coberturas", por código. */
    drawerItem(code: string): Locator {
        return this.ctrowTable.drawerItem(code);
    }

    // ------------------------------------------------------------------
    // Flujo de emisión (después de clickear "Emitir" en una tarjeta de plan)
    // ------------------------------------------------------------------
    //
    // Verificado en vivo el 2026-09-14 emitiendo Rivadavia "BASE PLUS"
    // (código "F") con forma de pago Efectivo, con sesión userPre (ya trae
    // cliente/vehículo precargados, por eso los pasos de cliente/detalle no
    // requirieron completar nada — solo Siguiente). Pasos, en orden:
    //   1. "Datos de la póliza"    -> vigenciaDesdeInput, formaPagoSelect
    //   2. "Datos del cliente"     -> precargado con userPre, solo Siguiente
    //   3. "Datos del vehículo"    -> patente/motor/chasis precargados, solo Siguiente
    //   4. "Inspección del vehículo" -> sube fixtures/moto.jpg, etiqueta "FRENTE"
    //   5. "Revisá y modificá antes de emitir" -> editarBloque(nombre), emitirFinalBtn (NUEVO,
    //      no estaba mapeado en emisionMotoPage.ts — pantalla intermedia de
    //      revisión con los 4 bloques de arriba, cada uno con su botón "Editar")
    //   6. Pantalla de éxito "¡Póliza emitida con éxito!" -> ver helpers debajo

    /** Paso "Datos de la póliza": fecha de inicio de vigencia (id `date_vigenciaDesde`). */
    get vigenciaDesdeInput(): Locator {
        return this.page.locator("#date_vigenciaDesde");
    }

    /** Paso "Datos de la póliza": combobox de forma de pago (mismo id en auto/moto/hogar). */
    get formaPagoSelect(): Locator {
        return this.page.locator('[id="select_infoDePago.formaDePago"]');
    }

    /**
     * Paso "Revisá y modificá antes de emitir": botón "Editar" del bloque dado.
     * Bloques confirmados: "Póliza", "Cliente", "Detalles del vehículo", "Inspección".
     */
    editarBloque(bloque: string): Locator {
        return this.page
            .locator("article")
            .filter({ has: this.page.getByRole("heading", { name: bloque, exact: true }) })
            .getByRole("button", { name: "Editar" });
    }

    /** Botón "Emitir" final, en la pantalla de revisión (distinto del "Emitir" de la tarjeta de plan). */
    get emitirFinalBtn(): Locator {
        return this.buttons.emitirBtn;
    }

    /** Heading de la pantalla de éxito ("¡Póliza emitida con éxito!"). */
    get emisionExitosaHeading(): Locator {
        return this.page.getByRole("heading", { name: "¡Póliza emitida con éxito!" });
    }

    /**
     * Valor de una fila de datos en la pantalla de éxito (ej. "Número de presupuesto",
     * "Número de Póliza"), por label exacto. DOM: `.EmissionSuccess__row` contiene
     * dos <p> hermanos, el label y `.EmissionSuccess__rowValue`.
     */
    successRowValue(label: string): Locator {
        return this.page
            .locator(".EmissionSuccess__row")
            .filter({ has: this.page.getByText(label, { exact: true }) })
            .locator(".EmissionSuccess__rowValue");
    }

    /**
     * Número de póliza en la pantalla de éxito. El label varía por aseguradora:
     * Rivadavia usa "Número de Póliza"; RUS usa "Número de poliza" (sin tilde).
     */
    get numeroPolizaValue(): Locator {
        return this.page
            .locator(".EmissionSuccess__row")
            .filter({ has: this.page.getByText(/Número de p[oó]liza/i) })
            .locator(".EmissionSuccess__rowValue");
    }

    /** Cualquier botón "Descargar" de la sección de documentación (nombres varían por compañía). */
    get anyDocumentoDescargarBtn(): Locator {
        return this.page.locator(".EmissionDocumentDownloadRow").getByRole("button", { name: "Descargar" });
    }

    /**
     * Botón "Descargar" de un documento puntual en "Documentación disponible", por nombre
     * exacto (ver `DOCUMENTOS_DESCARGABLES`). Usar esto en vez de `EmisionFinal.descargaBtn`
     * (que da `.first()`) cuando se necesita un documento específico.
     */
    documentoDescargarBtn(nombreDocumento: string): Locator {
        return this.page
            .locator(".EmissionDocumentDownloadRow")
            .filter({ hasText: nombreDocumento })
            .getByRole("button", { name: "Descargar" });
    }

    /** Botón "Volver al inicio" de la pantalla de éxito. */
    get volverAlInicioBtn(): Locator {
        return this.page.getByRole("button", { name: "Volver al inicio" });
    }

    /** Botón "Ir a Mi Cartera" de la pantalla de éxito. */
    get irAMiCarteraBtn(): Locator {
        return this.page.getByRole("button", { name: "Ir a Mi Cartera" });
    }

    /**
     * Orquesta el asistente de emisión completo desde la tarjeta del plan hasta la
     * pantalla de éxito (o el error, si lo hay). El detalle del vehículo (patente/
     * motor/chasis) viene precargado con la sesión userPre, pero el cliente NO —
     * hay que buscarlo por DNI/CUIT en cada emisión (mismo DNI que usa
     * `emisionMotoPage.ts`: "27381618426"), si no "Siguiente" no avanza.
     */
    async emitirPlan(
        code: string,
        opts: {
            formaPago?: string;
            dniCuit?: string;
            localidad?: string;
            mail?: string;
            telefono?: string;
            clientesAdicionales?: Array<{
                rol: string;
                dniCuit: string;
                localidad?: string;
                mail?: string;
                telefono?: string;
            }>;
        } = {},
    ): Promise<void> {
        await this.emitirBtn(code).click();

        // Paso 1: Datos de la póliza. El default de "Forma de pago" varía por
        // corrida y por aseguradora (a veces Efectivo, a veces Débito por CBU;
        // en ATM viene deshabilitado y forzado a Tarjeta de crédito — regla de
        // negocio, no bug). En vez de forzar `opts.formaPago` a ciegas (rompe si
        // esa opción no existe para la aseguradora activa), se intenta
        // (best-effort, vía el helper ya existente `selectPaymentOption` que
        // maneja el caso deshabilitado) y luego se completa el campo
        // complementario que corresponda a lo que haya quedado seleccionado.
        await expect(this.formaPagoSelect).toBeVisible({ timeout: FIELD_TIMEOUT });
        if (opts.formaPago && (await this.formaPagoSelect.isEnabled())) {
            // No usar EmisionFormaPago.selectPaymentOption() a ciegas acá: si la
            // opción pedida no existe para esta aseguradora (confirmado en vivo:
            // Sancor solo ofrece Tarjeta de crédito / Débito por CBU, sin
            // Efectivo), ese helper intenta clickearla igual y el intento cuelga
            // ~30s (el `actionTimeout` global de playwright.config.ts) antes de
            // recuperarse. Acá se abre el combobox, se espera a que el listbox
            // renderice, y solo se clickea si la opción realmente está.
            await this.formaPagoSelect.click();
            await this.page
                .getByRole("option")
                .first()
                .waitFor({ state: "visible", timeout: FIELD_TIMEOUT })
                .catch(() => {});
            const option = this.page.getByRole("option", { name: opts.formaPago, exact: true });
            if ((await option.count()) > 0) {
                await option.click();
            } else {
                // Efectivo no existe en Triunfo/Sancor (y a veces otras): Escape
                // deja el combo vacío → "Debe seleccionar una opción" y no avanza
                // a "Buscar cliente". Misma fallback que cotizarAutoIA.emitirPlan.
                await this.page.getByRole("option").first().click();
            }
            await expect(this.formaPagoSelect).not.toHaveValue("", { timeout: FIELD_TIMEOUT });
        }
        // Preferir el searchbox visible: el input#select_infoDePago.formaDePago
        // a veces queda stale (sigue diciendo "Débito por CBU" después de
        // elegir Efectivo) y entonces fillCBU cuelga 30s sin campo en pantalla
        // (Rivadavia PW1 config avanzada 2026-09-15).
        const visiblePago = await this.formaPagoSelect.inputValue().catch(() => "");
        const { formaDePago } = await this.emisionFormaPago.readPagoFieldValues();
        const formaNorm = (visiblePago || formaDePago || "").toLowerCase();
        if (formaNorm.includes("cbu")) {
            const cbuVisible = await this.emisionFormaPago.CBU.isVisible().catch(() => false);
            if (cbuVisible) {
                await this.emisionFormaPago.fillCBU();
            }
        } else if (formaNorm.includes("tarjeta") || formaNorm.includes("medios electr")) {
            const tarjetaVisible = await this.emisionFormaPago.nroTarjeta
                .isVisible()
                .catch(() => false);
            if (tarjetaVisible) {
                await this.emisionFormaPago.fillTarjetaCredito({ atm: true, sancor: true });
            } else {
                const cbuVisible = await this.emisionFormaPago.CBU.isVisible().catch(() => false);
                if (cbuVisible) await this.emisionFormaPago.fillCBU();
            }
        }
        await this.buttons.siguienteBtn.click();

        // Paso 2: Datos del cliente — buscar por DNI/CUIT y esperar a que la
        // localidad se autocomplete (misma carrera de condición que en
        // cotizarVehiculo: "Siguiente" queda "enabled" en el DOM antes de que el
        // lookup async de localidad/teléfono termine; clickear ya es prematuro y
        // "Siguiente" no avanza aunque no tire ningún error visible).
        await expect(this.page.getByText("Buscar cliente")).toBeVisible({ timeout: FIELD_TIMEOUT });
        const dniParaNosis = opts.dniCuit ?? "27381618426";
        await this.emisionCliente.nosisInput.fill(dniParaNosis);
        await this.emisionCliente.buscarBtn.click();

        // Post-Nosis según CUIT (autos.json / emisionAutoPage.emitirCliente).
        if (dniParaNosis === "30711392404") {
            const locOption = this.buttons.getOptionLocator(opts.localidad ?? "(5000) CORDOBA");
            await this.emisionCliente.localidadInput.click();
            await expect(locOption).toBeVisible({ timeout: SETTLE_TIMEOUT });
            await locOption.click();
        } else if (dniParaNosis === "23343180489" || dniParaNosis === "30615714158") {
            await this.emisionCliente.telefonoInput.fill(opts.telefono ?? "3512334798");
            await this.emisionCliente.emailInput.fill(opts.mail ?? "cassinanico@gmail.com");
        }

        // El formulario que devuelve la búsqueda re-renderiza varias veces
        // (nombre/domicilio primero, localidad/teléfono después, de forma
        // asincrónica) — si "Localidad" aparece, esperar su valor real; si no
        // aparece en esta variante del formulario, seguir igual (probe corto,
        // sin quemar FIELD_TIMEOUT). En ambos casos el "Siguiente" habilitado
        // no basta para saber que el form asentó, así que queda un margen fijo.
        await settleLocalidadIfPresent(this.page);

        for (const extra of opts.clientesAdicionales ?? []) {
            await this.emisionCliente.agregarClienteConRol(extra.rol, extra.dniCuit, {
                localidad: extra.localidad ?? opts.localidad,
                mail: extra.mail ?? opts.mail,
                telefono: extra.telefono ?? opts.telefono,
            });
        }

        await this.page.waitForTimeout(3000);
        await expect(this.buttons.siguienteBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.siguienteBtn.click();

        // Paso 3: Datos del vehículo — NO viene precargado (verificado en vivo:
        // a veces sí, a veces no, según el cliente encontrado en el paso previo),
        // así que se completa siempre con datos aleatorios válidos.
        await expect(this.emisionDetalleMoto.patenteInput).toBeVisible({ timeout: FIELD_TIMEOUT });
        if (!(await this.emisionDetalleMoto.patenteInput.inputValue())) {
            await this.emisionDetalleMoto.patenteInput.fill(this.emisionDetalleMoto.generarPatenteAleatoriaAuto());
            await this.emisionDetalleMoto.nroMotorInput.fill(this.emisionDetalleMoto.generarNroMotorAleatorio());
            await this.emisionDetalleMoto.nroChasisInput.fill(this.emisionDetalleMoto.generarNroChasisAleatorio());
        }
        await this.buttons.siguienteBtn.click();

        // Paso 4: Inspección — el <input type="file"> del Dropzone está oculto a
        // propósito (Mantine), no hay que esperar visibilidad, solo setInputFiles.
        const filepath = path.join(__dirname, "..", "fixtures", "moto.jpg");
        await this.emisionInspeccion.inspecciondpzone.setInputFiles(filepath);
        await expect(this.emisionInspeccion.imgInspeccion).toBeVisible({ timeout: FIELD_TIMEOUT });
        await this.emisionInspeccion.etiquetaImg.click();
        await this.emisionInspeccion.etiquetaOption.click();
        await expect(this.buttons.siguienteBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.siguienteBtn.click();

        // Paso 5: "Revisá y modificá antes de emitir"
        await expect(this.emitirFinalBtn).toBeVisible({ timeout: FIELD_TIMEOUT });
        await this.emitirFinalBtn.click();

        // Paso 6: resultado — la emisión real (generación de póliza/documentos)
        // puede ser más lenta que una simple cotización, por eso usa el doble
        // de QUOTE_TIMEOUT en vez de FIELD_TIMEOUT.
        await expect(this.buttons.loadingSpinner)
            .toBeHidden({ timeout: QUOTE_TIMEOUT })
            .catch(() => {});
        await expect(this.emisionExitosaHeading.or(this.emisionFinal.errorEmision)).toBeVisible({ timeout: QUOTE_TIMEOUT * 2 });
    }
}
