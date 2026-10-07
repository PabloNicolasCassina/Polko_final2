import { Page, Locator, Request, expect } from "@playwright/test";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionCobertura from "../components/ap/cotizacionCobertura";
import CotizacionInformacion from "../components/ap/cotizacionInformacion";
import CotizacionTitular from "../components/ap/cotizacionTitular";
import EmisionCliente from "../components/emisionCliente";
import EmisionFinal from "../components/emisionFinal";
import EmisionFormaPago from "../components/emisionFormaPago";
import { escapeRegExp } from "../components/ctrowAutoTable";
import { reportarNumeroEmision } from "../helpers/reportePoliza";
import { clickEvenIfOffscreen, isMobileViewport } from "../helpers/viewport";

/**
 * Page Object de /u/cotizar/accidentes_personales — cotización, config avanzada
 * (cobertura personalizada) y flujo completo de emisión hasta el modal de éxito.
 *
 * Verificado en vivo el 2026-09-29 (sesión userPre + mock mockUserDataATM,
 * frontend en rama feat/POL-2897-ap-integro), emitiendo Sancor "Personalizada"
 * OCASION DE TRABAJO de punta a punta (póliza 13585987).
 *
 * Diferencias con auto/moto (cotizarAutoIA / cotizarMotoIA):
 *   - Única aseguradora: Sancor. No hay sidebar `.QuotationSidebar__companyTile`;
 *     la compañía se elige en el modal "Elegí tus compañías…" (solo la primera
 *     vez por sesión — después el modal no vuelve a aparecer).
 *   - Wizard de cotización en 3 pasos: Cobertura → Información → Titular.
 *   - Tabla de resultados LEGACY `.ctrow` (no `.ctrowAuto`). Dos productos,
 *     cada uno con sus planes; el id de "Emitir" identifica el PRODUCTO, no el
 *     plan (`emitirButton_OCASION DE TRABAJO` / `emitirButton_INTEGRO`), así que
 *     el plan se resuelve filtrando la fila por el texto con que empieza.
 *   - Pantalla de éxito = modal legacy `.SEmission__popup`
 *     ("¡Felicitaciones, la operación se realizó exitosamente!"), no
 *     `.EmissionSuccess__row`.
 */

/** Productos AP de Sancor (sufijo del id `emitirButton_<producto>`). */
export const PRODUCTOS_AP = {
    ocasion: "OCASION DE TRABAJO",
    integro: "INTEGRO",
} as const;

export type ProductoAP = (typeof PRODUCTOS_AP)[keyof typeof PRODUCTOS_AP];

/** Planes estándar que devuelve la cotización para ambos productos (vivo 2026-09-29). */
export const PLANES_AP = ["Intermedio", "Sugerido"] as const;

/** Fila que aparece tras aplicar la config avanzada. */
export const PLAN_PERSONALIZADO_AP = "Personalizada";

export type PlanAP = (typeof PLANES_AP)[number] | typeof PLAN_PERSONALIZADO_AP;

export type VigenciaAP = "Por día" | "+30 días";

/**
 * Ids de los campos de "Configuración avanzada" (vivo 2026-09-29).
 * `rentaDiariaInternacion` ya no se renderiza para Sancor.
 */
export const CONFIG_AVANZADA_FIELD_IDS_AP: Record<string, string> = {
    rangoEdad: "select_rangoEdad",
    coberturaMuerte: "select_coberturaMuerte",
    asistenciaMedica: "select_asistenciaMedica",
    deducible: "dependant_deducible",
    subsidioFallecimiento: "select_subsidioFallecimiento",
};

/** Orden de aplicación: `deducible` depende de `asistenciaMedica`. */
export const CONFIG_AVANZADA_FIELDS_AP = [
    "rangoEdad",
    "coberturaMuerte",
    "asistenciaMedica",
    "deducible",
    "subsidioFallecimiento",
] as const;

/** Default de `rangoEdad` al abrir la config avanzada (código 3 del catálogo 1–5). */
export const RANGO_EDAD_DEFAULT_AP = "Entre 16 y 70 años";

/**
 * Opciones por campo. `rangoEdad` completo; montos = extremos + un valor medio
 * del listbox real (MEI: 10.25M…250M, AMF: 6M…100M). `subsidioFallecimiento`
 * tiene una sola opción.
 */
export const CONFIG_AVANZADA_OPTIONS_AP: Record<string, string[]> = {
    rangoEdad: [
        "Menor de 14 años",
        "Entre 14 y 15 años",
        "Entre 16 y 70 años",
        "Entre 71 y 75 años",
        "Mayor de 75 años",
    ],
    coberturaMuerte: ["$10.250.000", "$55.000.000", "$250.000.000"],
    asistenciaMedica: ["$6.000.000", "$8.000.000", "$100.000.000"],
    subsidioFallecimiento: ["$2.071.300"],
};

/**
 * `deducible` es dependant de `asistenciaMedica` (AMF 6M → $40.000|$60.000;
 * 50M/100M → $80.000|$100.000). Se elige por posición en el listbox para no
 * atar el test a cada tramo de AMF.
 */
export const DEDUCIBLE_POSICIONES_AP = ["min", "max"] as const;
export type DeduciblePosicionAP = (typeof DEDUCIBLE_POSICIONES_AP)[number];

/** Barra "Descuento extra": aria-valuemax=30. */
export const CONFIG_AVANZADA_DESCUENTOS_AP = [0, 30];

/** Combobox "Tipo de facturación" (fuera del panel de config avanzada). */
export const FACTURACION_AP = ["Mensual", "Anual"];

/**
 * Facturación válida por vigencia. La UI ofrece "Anual" también en "Por día",
 * pero el alta de matriz responde 422 ("Si facturacion es ANUAL, la vigencia
 * debe ser un año") y la UI solo muestra "Hubo un problema al crear la matriz".
 */
export const FACTURACION_BY_VIGENCIA_AP: Record<VigenciaAP, string[]> = {
    "+30 días": ["Mensual", "Anual"],
    "Por día": ["Mensual"],
};

export const FORMAS_PAGO_AP = ["Tarjeta de crédito", "Débito por CBU", "Efectivo"] as const;

/**
 * AP Integro no admite estos valores — si la config los incluye, la UI avisa
 * "Se cotizará solo ocasión de trabajo" y no hay fila Personalizada de INTEGRO.
 */
export const AP_INTEGRO_RANGOS_NO_SOPORTADOS = ["Menor de 14 años", "Entre 14 y 15 años"];
export const AP_INTEGRO_AMF_MINIMO = 8000000;

export function integroSoportaConfig(values: { rangoEdad?: string; asistenciaMedica?: string }): boolean {
    if (values.rangoEdad && AP_INTEGRO_RANGOS_NO_SOPORTADOS.includes(values.rangoEdad)) return false;
    if (values.asistenciaMedica) {
        const amf = Number(values.asistenciaMedica.replace(/\D/g, ""));
        if (amf < AP_INTEGRO_AMF_MINIMO) return false;
    }
    return true;
}

export function montoAP(monto: string): number {
    return Number(monto.replace(/\D/g, ""));
}

/**
 * Sancor rechaza asistencia médica > muerte e invalidez (400 "El valor de
 * asistencia médica no puede ser mayor que el de muerte/invalidez"). Devuelve
 * la menor cobertura de muerte válida para la AMF dada.
 */
export function coberturaMuerteParaAmf(coberturaMuerte: string, asistenciaMedica: string): string {
    if (montoAP(asistenciaMedica) <= montoAP(coberturaMuerte)) return coberturaMuerte;
    const valida = CONFIG_AVANZADA_OPTIONS_AP.coberturaMuerte.find(
        (mei) => montoAP(mei) >= montoAP(asistenciaMedica),
    );
    if (!valida) throw new Error(`Ninguna cobertura de muerte cubre la asistencia médica ${asistenciaMedica}`);
    return valida;
}

/**
 * Fecha de nacimiento (ddmmyyyy, para tipear en el DateInput) coherente con el
 * rango de edad cotizado (default: `RANGO_EDAD_DEFAULT_AP`). Se setea siempre:
 * la búsqueda de cliente devuelve la última fecha guardada en Polko para ese
 * CUIT, que cambia entre corridas. Sancor rechaza la certificación si la edad
 * no coincide con el rango ("La aseguradora detectó errores en la
 * certificación de este cliente").
 */
export function fechaNacimientoParaRango(rangoEdad: string = RANGO_EDAD_DEFAULT_AP): string {
    const edadPorRango: Record<string, number> = {
        "Menor de 14 años": 10,
        "Entre 14 y 15 años": 15,
        "Entre 16 y 70 años": 30,
        "Entre 71 y 75 años": 73,
        "Mayor de 75 años": 80,
    };
    const edad = edadPorRango[rangoEdad];
    if (edad === undefined) throw new Error(`Rango de edad AP desconocido: ${rangoEdad}`);
    const d = new Date();
    d.setFullYear(d.getFullYear() - edad);
    d.setMonth(d.getMonth() - 3);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}${mm}${d.getFullYear()}`;
}

const FIELD_TIMEOUT = 15000;
const SETTLE_TIMEOUT = 20000;
/** Cotizar/aplicar tarda 5–15s en local; margen para Sancor pre lento. */
const QUOTE_TIMEOUT = 60000;
/** "Generando alta de matriz con Sancor" + emisión real (~65s medidos). */
const EMIT_TIMEOUT = 180000;
const FORM_READY_TIMEOUT = 30000;
const GOTO_ATTEMPTS = 3;
const AP_URL = "/u/cotizar/accidentes_personales";
const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export type DatosCotizacionAP = {
    vigencia: VigenciaAP;
    cantPersonas: string;
    actividad: string;
    clasificacion: string;
    tarea: string;
    c_postal: string;
    situacionImpositiva?: string;
    /** Solo "Por día": días desde hoy para el fin de vigencia (default 5). */
    diasVigencia?: number;
};

export type ConfigCaseAP = {
    rangoEdad?: string;
    coberturaMuerte?: string;
    asistenciaMedica?: string;
    deducible?: DeduciblePosicionAP;
    subsidioFallecimiento?: string;
    facturacion?: string;
    descuento?: number;
};

/**
 * Roles de cliente Sancor AP (`ACCIDENTES_PERSONALES_COMPANIES_DATA.Sancor.roles`).
 * Tomador y Beneficiario son únicos y vienen precargados (filas 1 y 2);
 * "Nuevo cliente" ofrece Asegurado (default) + subrogación + terceros.
 */
export const ROLES_AP = {
    tomador: "Tomador",
    beneficiario: "Beneficiario",
    asegurado: "Asegurado",
    beneficiarioSubrogacion: "Beneficiario de subrogación",
    terceroNoAnulacionModificacion: "Tercero c/claus. no anulación/modificación",
    terceroNoAnulacion: "Tercero c/claus. no anulación",
    terceroNoRepeticion: "Tercero c/claus. no repetición",
} as const;

export type RolAP = (typeof ROLES_AP)[keyof typeof ROLES_AP];

/** Radios `clientes.N.apply` del Beneficiario (default "herederosLegales"). */
export const BENEFICIARIO_APPLY_AP = {
    herederosLegales: "Herederos legales",
    tomador: "Tomador",
    otro: "Otro",
} as const;

export type BeneficiarioApplyAP = keyof typeof BENEFICIARIO_APPLY_AP;

export type BeneficiarioAP = {
    apply: BeneficiarioApplyAP;
    /** Solo `apply: "otro"`: CUIT a buscar en Nosis (debe traer domicilio completo). */
    dniCuit?: string;
};

export type EmitirOptsAP = {
    formaPago?: string;
    cbu?: string;
    tomador: string;
    asegurados: string[];
    /** Rango cotizado: ajusta la fecha de nacimiento de los asegurados. */
    rangoEdad?: string;
    localidad?: string;
    mail?: string;
    telefono?: string;
    /** Beneficiario principal (fila 2). Default: herederos legales. */
    beneficiario?: BeneficiarioAP;
    /**
     * Si un asegurado coincide con el beneficiario principal (y hay >1
     * asegurado), al pasar de paso la UI genera un beneficiario adicional
     * para ese asegurado y bloquea hasta completarlo.
     */
    beneficiarioAdicional?: BeneficiarioAP;
    clientesAdicionales?: Array<{ rol: string; dniCuit: string }>;
};

export default class CotizarAPIAPage {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly companias: Companias;
    readonly cotizacionCobertura: CotizacionCobertura;
    readonly cotizacionInformacion: CotizacionInformacion;
    readonly cotizacionTitular: CotizacionTitular;
    readonly emisionCliente: EmisionCliente;
    readonly emisionFinal: EmisionFinal;
    readonly emisionFormaPago: EmisionFormaPago;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.companias = new Companias(page);
        this.cotizacionCobertura = new CotizacionCobertura(page);
        this.cotizacionInformacion = new CotizacionInformacion(page);
        this.cotizacionTitular = new CotizacionTitular(page);
        this.emisionCliente = new EmisionCliente(page);
        this.emisionFinal = new EmisionFinal(page);
        this.emisionFormaPago = new EmisionFormaPago(page);
    }

    // ------------------------------------------------------------------
    // Navegación + selección de compañía
    // ------------------------------------------------------------------

    /** Logo Sancor del modal "Elegí tus compañías para el producto Accidentes personales". */
    get sancorLogoModal(): Locator {
        return this.page.locator("#csm__logo-1");
    }

    get aceptarCompaniasBtn(): Locator {
        return this.page.getByRole("button", { name: "ACEPTAR" });
    }

    /** Error boundary de React ("Algo salió mal") — fail-fast en vez de esperar timeouts. */
    get errorBoundary(): Locator {
        return this.page.getByText("Algo salió mal", { exact: true });
    }

    /**
     * Navega al cotizador AP y deja el paso "Cobertura" accionable. El modal de
     * compañías aparece solo la primera vez por sesión; si está, elige Sancor.
     */
    async goto(): Promise<void> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= GOTO_ATTEMPTS; attempt++) {
            await this.page.goto(AP_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
            try {
                await expect(
                    this.sancorLogoModal.or(this.cotizacionCobertura.radioPorDia).first(),
                    "Cotizador AP no cargó (ni modal de compañías ni paso Cobertura)",
                ).toBeVisible({ timeout: FORM_READY_TIMEOUT });
                if (await this.sancorLogoModal.isVisible()) {
                    await this.sancorLogoModal.click();
                    await this.aceptarCompaniasBtn.click();
                }
                await expect(this.cotizacionCobertura.radioPorDia).toBeVisible({ timeout: FIELD_TIMEOUT });
                return;
            } catch (error) {
                lastError = error;
                if (attempt === GOTO_ATTEMPTS) break;
            }
        }
        throw lastError;
    }

    // ------------------------------------------------------------------
    // Wizard de cotización: Cobertura → Información → Titular
    // ------------------------------------------------------------------

    /** `#clasificacionActividad_clasificacionActividad` (el componente viejo usa `#select_clasificacionActividad`, ya no existe). */
    get clasificacionCombobox(): Locator {
        return this.page.locator('[id="clasificacionActividad_clasificacionActividad"]');
    }

    /** Botón del rango de vigencia (solo "Por día"). */
    get vigenciaRangoBtn(): Locator {
        return this.cotizacionInformacion.finVigenciaInput;
    }

    /** Día del calendario Mantine por aria-label ("4 octubre 2026"). */
    diaCalendario(fecha: Date): Locator {
        const label = `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
        return this.page.getByRole("button", { name: label, exact: true });
    }

    /** Botón de nivel del calendario abierto ("septiembre 2026"). */
    get calendarioMesBtn(): Locator {
        return this.page.getByRole("button", { name: new RegExp(`^(${MESES.join("|")}) \\d{4}$`, "i") });
    }

    /** El calendario muestra un solo mes: avanza con la flecha ">" hasta el mes de `fecha`. */
    async irAMesCalendario(fecha: Date): Promise<void> {
        const objetivo = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
        for (let i = 0; i < 24; i++) {
            const actual = (await this.calendarioMesBtn.innerText()).trim().toLowerCase();
            if (actual === objetivo) return;
            await this.calendarioMesBtn.locator("xpath=following-sibling::button[1]").click();
        }
        throw new Error(`El calendario no llegó a ${objetivo}`);
    }

    /**
     * Abre un Mantine Select y elige la opción, salvo que ya esté seleccionada
     * (re-elegirla la deselecciona). Los montos de config avanzada cargan async
     * al abrir el panel: si el listbox muestra "Sin resultados", se cierra y se
     * reabre.
     */
    private async selectOption(field: Locator, optionText: string, attempts = 4): Promise<void> {
        await expect(field).toBeEnabled({ timeout: FIELD_TIMEOUT });
        if ((await field.inputValue().catch(() => "")) === optionText) return;
        await field.scrollIntoViewIfNeeded();
        const option = this.page.getByRole("option", { name: optionText, exact: true });
        for (let attempt = 1; attempt <= attempts; attempt++) {
            await field.click();
            const found = await option
                .waitFor({ state: "visible", timeout: attempt === attempts ? SETTLE_TIMEOUT : 5000 })
                .then(() => true)
                .catch(() => false);
            if (found) break;
            if (attempt === attempts) {
                await expect(option, `Opción "${optionText}" no disponible`).toBeVisible({ timeout: 1000 });
            }
            await this.page.keyboard.press("Escape");
            await this.page.waitForTimeout(1500);
        }
        await option.click();
        await expect(field).toHaveValue(optionText, { timeout: FIELD_TIMEOUT });
    }

    async seleccionarCobertura(vigencia: VigenciaAP): Promise<void> {
        if (vigencia === "Por día") {
            await this.cotizacionCobertura.seleccionarPorDia();
        } else {
            await this.cotizacionCobertura.seleccionarMasTreintaDias();
        }
        await this.buttons.siguienteBtn.click();
        await expect(this.cotizacionInformacion.cantPersonasInput).toBeVisible({ timeout: FIELD_TIMEOUT });
    }

    async completarInformacion(datos: DatosCotizacionAP): Promise<void> {
        await this.cotizacionInformacion.cantPersonasInput.fill(datos.cantPersonas);
        await this.selectOption(this.cotizacionInformacion.actividadCombobox, datos.actividad);
        await this.selectOption(this.clasificacionCombobox, datos.clasificacion);
        await this.selectOption(this.cotizacionInformacion.tareaCombobox, datos.tarea);

        if (datos.vigencia === "Por día") {
            const fin = new Date();
            fin.setDate(fin.getDate() + (datos.diasVigencia ?? 5));
            await this.vigenciaRangoBtn.click();
            await this.irAMesCalendario(fin);
            await this.diaCalendario(fin).click();
        }
        await this.buttons.siguienteBtn.click();
        await expect(this.cotizacionTitular.codigoPostalInput).toBeVisible({ timeout: FIELD_TIMEOUT });
    }

    async completarTitular(datos: { c_postal: string; situacionImpositiva?: string }): Promise<void> {
        if (datos.situacionImpositiva) {
            await this.selectOption(this.cotizacionTitular.situacionImpositivaCombobox, datos.situacionImpositiva);
        }
        await this.cotizacionTitular.ingresarCodigoPostal(datos.c_postal);
        // Mismo race que auto/moto: COTIZAR queda enabled antes de que el lookup
        // async de localidad termine.
        await expect(this.cotizacionTitular.localidadCombobox).not.toHaveValue("", { timeout: SETTLE_TIMEOUT });
    }

    /** Wizard completo + COTIZAR + espera la tabla de resultados. */
    async cotizarAP(datos: DatosCotizacionAP): Promise<void> {
        await this.seleccionarCobertura(datos.vigencia);
        await this.completarInformacion(datos);
        await this.completarTitular(datos);
        await expect(this.buttons.cotizarBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        const finCotizacion = this.esperarFinStreamCotizacion();
        finCotizacion.catch(() => {});
        await this.buttons.cotizarBtn.click();
        await this.esperarResultadosCotizacion();
        await finCotizacion;
    }

    /**
     * El `idCotizar` llega en el último evento del SSE (`finFlag`), después de
     * que aparecen las primeras filas. Si "APLICAR CAMBIOS" sin descuento sale
     * antes, viaja sin `idCotizar` y products responde 400 "Numero de
     * cotizacion no indicado".
     */
    private async esperarFinStreamCotizacion(): Promise<void> {
        // Al recibir `finFlag` el front hace `eventSource.close()`: el request termina en
        // `requestfailed` (ERR_ABORTED) y `response.finished()` no resuelve nunca.
        const esSse = (r: Request) => r.url().includes("/cotizacion/sse");
        const fin = [
            this.page.waitForEvent("requestfinished", { predicate: esSse, timeout: QUOTE_TIMEOUT }),
            this.page.waitForEvent("requestfailed", { predicate: esSse, timeout: QUOTE_TIMEOUT }),
        ];
        fin.forEach((promise) => promise.catch(() => {}));
        await Promise.race(fin);
    }

    // ------------------------------------------------------------------
    // Tabla de resultados (legacy `.ctrow`)
    // ------------------------------------------------------------------

    get errorCotizacion(): Locator {
        return this.page.getByText(/Hubo un problema al cotizar/i);
    }

    async esperarResultadosCotizacion(timeout = QUOTE_TIMEOUT): Promise<void> {
        const rows = this.page.locator(".ctrow, .newCoverageCard__container").first();
        await expect(
            rows.or(this.errorCotizacion).or(this.errorBoundary).first(),
            "La cotización AP no devolvió resultados",
        ).toBeVisible({ timeout });
        await expect(this.errorBoundary, "Crash de React tras cotizar").not.toBeVisible();
        await expect(this.errorCotizacion, "Sancor devolvió error al cotizar AP").not.toBeVisible();
    }

    /** Botón "Emitir" de un producto (hay uno por plan; se filtra con `planRow`). */
    productoEmitirSelector(producto: ProductoAP): string {
        return `[id="emitirButton_${producto}"]`;
    }

    /**
     * Fila `.ctrow` del plan dentro del producto (el texto arranca con el nombre del plan).
     * Mobile (<= 480px, `UserContext.isMobile`): tarjeta `.newCoverageCard__container` del carrusel.
     */
    planRow(producto: ProductoAP, plan: PlanAP): Locator {
        const emitir = this.page.locator(this.productoEmitirSelector(producto));
        if (isMobileViewport(this.page)) {
            return this.page
                .locator(".newCoverageCard__container")
                .filter({
                    has: this.page.locator(".newCoverageCard__name", {
                        hasText: new RegExp(`^\\s*${escapeRegExp(plan)}\\b`),
                    }),
                })
                .filter({ has: emitir });
        }
        return this.page
            .locator(".ctrow")
            .filter({ hasText: new RegExp(`^${escapeRegExp(plan)}\\b`) })
            .filter({ has: emitir });
    }

    emitirBtn(producto: ProductoAP, plan: PlanAP): Locator {
        return this.planRow(producto, plan).locator(this.productoEmitirSelector(producto));
    }

    /**
     * Espera la fila de un plan. Los productos llegan por SSE en paralelo y en
     * cualquier orden: la primera `.ctrow` no garantiza que el otro producto
     * ya esté.
     */
    async esperarPlan(producto: ProductoAP, plan: PlanAP): Promise<Locator> {
        const row = this.planRow(producto, plan);
        await expect(row, `No llegó la fila ${producto} / ${plan}`).toBeVisible({ timeout: QUOTE_TIMEOUT });
        return row;
    }

    /**
     * Prima de una fila. El texto es "Plan (MEI $X - AMF $Y) | $prima | …":
     * se descartan los montos de cobertura entre paréntesis.
     */
    async planPrecio(producto: ProductoAP, plan: PlanAP): Promise<number> {
        const row = this.planRow(producto, plan);
        const source = isMobileViewport(this.page) ? row.locator(".newCoverageCard__premium").first() : row;
        const text = (await source.innerText()).replace(/\([^)]*\)/g, "");
        const match = text.match(/\$\s?([\d.]+)/);
        return match ? Number(match[1].replace(/\./g, "")) : 0;
    }

    /** Aviso "Se cotizará solo ocasión de trabajo — AP Integro no admite: …". */
    get avisoIntegroNoDisponible(): Locator {
        return this.page.getByText("Se cotizará solo ocasión de trabajo");
    }

    // ------------------------------------------------------------------
    // Descuento / facturación / configuración avanzada
    // ------------------------------------------------------------------

    get descuentoSlider(): Locator {
        return this.page.getByRole("slider");
    }

    descuentoBarMark(percent: number): Locator {
        return this.page.getByText(`${percent}%`, { exact: true });
    }

    async setDescuento(percent: number): Promise<void> {
        await expect(this.descuentoSlider).toBeVisible({ timeout: FIELD_TIMEOUT });
        await this.descuentoSlider.focus();
        await this.descuentoSlider.press("Home");
        for (let i = 0; i < percent; i++) await this.descuentoSlider.press("ArrowRight");
        await expect(this.descuentoSlider).toHaveAttribute("aria-valuenow", String(percent));
    }

    get facturacionSelect(): Locator {
        return this.page.getByRole("searchbox", { name: "Tipo de facturación" });
    }

    async setFacturacion(tipo: string): Promise<void> {
        await this.selectOption(this.facturacionSelect, tipo);
    }

    get configAvanzadaBtn(): Locator {
        return this.page.getByRole("button", { name: /configuraci[oó]n avanzada/i });
    }

    configField(field: string): Locator {
        const id = CONFIG_AVANZADA_FIELD_IDS_AP[field];
        if (!id) throw new Error(`Campo de config avanzada AP desconocido: ${field}`);
        return this.page.locator(`[id="${id}"]`);
    }

    /**
     * Contenedor de los campos. Siempre está en el DOM (los inputs reportan
     * visible aunque esté colapsado con height 0); el modificador indica si
     * está abierto.
     */
    get configAvanzadaPanelAbierto(): Locator {
        return this.page.locator(".advancedForm__inputFieldsContainer--true");
    }

    async abrirConfigAvanzada(): Promise<void> {
        if ((await this.configAvanzadaPanelAbierto.count()) > 0) return;
        await this.configAvanzadaBtn.click();
        await expect(this.configAvanzadaPanelAbierto).toHaveCount(1, { timeout: FIELD_TIMEOUT });
    }

    async selectConfigOption(field: string, optionText: string): Promise<void> {
        await this.selectOption(this.configField(field), optionText);
    }

    /** Deducible por posición en el listbox (depende de la asistencia médica elegida). */
    async selectDeducible(posicion: DeduciblePosicionAP): Promise<void> {
        const field = this.configField("deducible");
        await expect(field).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await field.click();
        const options = this.page.getByRole("option");
        await expect(options.first()).toBeVisible({ timeout: SETTLE_TIMEOUT });
        const option = posicion === "min" ? options.first() : options.last();
        const text = (await option.innerText()).trim();
        if ((await field.inputValue()) === text) {
            await this.page.keyboard.press("Escape");
            return;
        }
        await option.click();
        await expect(field).toHaveValue(text, { timeout: FIELD_TIMEOUT });
    }

    get aplicarCambiosBtn(): Locator {
        return this.buttons.aplicarCambiosBtn;
    }

    /** "APLICAR CAMBIOS" + espera recotización (spinner + tabla). */
    async aplicarCambios(): Promise<void> {
        await expect(this.aplicarCambiosBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.aplicarCambiosBtn.click();
        await this.buttons.loadingSpinner.waitFor({ state: "hidden", timeout: QUOTE_TIMEOUT }).catch(() => {});
        await this.esperarResultadosCotizacion();
    }

    /**
     * Aplica una fila de config: descuento + facturación + campos de la
     * cobertura personalizada, luego "APLICAR CAMBIOS" y espera la fila
     * "Personalizada" de OCASION DE TRABAJO (siempre cotiza; INTEGRO solo si
     * `integroSoportaConfig`).
     */
    async aplicarConfigCase(values: ConfigCaseAP): Promise<void> {
        if (values.descuento !== undefined) await this.setDescuento(values.descuento);
        if (values.facturacion) await this.setFacturacion(values.facturacion);

        await this.abrirConfigAvanzada();
        for (const field of CONFIG_AVANZADA_FIELDS_AP) {
            const value = values[field];
            if (value === undefined) continue;
            if (field === "deducible") {
                await this.selectDeducible(value as DeduciblePosicionAP);
            } else {
                await this.selectConfigOption(field, String(value));
            }
        }
        await this.aplicarCambios();
        await expect(
            this.planRow(PRODUCTOS_AP.ocasion, PLAN_PERSONALIZADO_AP),
            "No apareció la fila Personalizada tras aplicar la config avanzada",
        ).toBeVisible({ timeout: QUOTE_TIMEOUT });
    }

    // ------------------------------------------------------------------
    // Emisión: Póliza → Cliente → Solicitud → modal de éxito
    // ------------------------------------------------------------------

    get formaPagoSelect(): Locator {
        return this.page.locator('[id="select_infoDePago.formaDePago"]');
    }

    /** Fila de la matriz de clientes (Tomador / Beneficiario / Asegurado…), 1-based. */
    clienteRow(n: number): Locator {
        return this.page
            .locator('[class^="autem__clientes__list__row"]')
            .filter({ has: this.editarClienteBtn(n) });
    }

    /** Lápiz "Editar cliente N" (aria-label estable; reemplaza los nth-child de EmisionCliente). */
    editarClienteBtn(n: number): Locator {
        return this.page.getByRole("button", { name: `Editar cliente ${n}`, exact: true });
    }

    clienteCheck(n: number): Locator {
        return this.clienteRow(n).locator(".autem__clientes__icon--check");
    }

    clienteWarning(n: number): Locator {
        return this.clienteRow(n).locator(".autem__clientes__icon--exclamation");
    }

    get altaMatrizConfirmada(): Locator {
        return this.page.getByText("Alta matriz confirmada");
    }

    get errorCertificacionCliente(): Locator {
        return this.page.getByText(/detectó errores en la certificación/i);
    }

    /** Pantalla "Detalles de póliza" (paso Solicitud). */
    get detallesPolizaHeading(): Locator {
        return this.page.getByText("Detalles de póliza", { exact: true });
    }

    get emitirFinalBtn(): Locator {
        return this.buttons.emitirBtn;
    }

    /** Modal de éxito legacy de AP (+ heading del rediseño si AP migra). */
    get emisionExitosaHeading(): Locator {
        return this.page
            .getByText("¡Felicitaciones, la operación se realizó exitosamente!")
            .or(this.page.getByRole("heading", { name: "¡Póliza emitida con éxito!" }));
    }

    successIdentifier(label: RegExp): Locator {
        return this.page
            .locator(".SEmission__identifierItem")
            .filter({ has: this.page.locator(".successModal__subtitle", { hasText: label }) })
            .locator(".successModal__text");
    }

    get numeroPolizaValue(): Locator {
        return this.successIdentifier(/N[uú]mero de p[oó]liza/i).or(
            this.page
                .locator(".EmissionSuccess__row")
                .filter({ has: this.page.getByText(/Número de p[oó]liza/i) })
                .locator(".EmissionSuccess__rowValue"),
        );
    }

    get numeroTramiteValue(): Locator {
        return this.successIdentifier(/N[uú]mero de tr[aá]mite/i);
    }

    get anyDocumentoDescargarBtn(): Locator {
        return this.page
            .locator(".SEmission__documentacionSection")
            .getByRole("button", { name: /^descargar$/i })
            .or(this.page.locator(".EmissionDocumentDownloadRow").getByRole("button", { name: "Descargar" }));
    }

    /** Radio del beneficiario del cliente activo (principal o adicional). */
    beneficiarioApplyRadio(apply: BeneficiarioApplyAP): Locator {
        return this.page.getByRole("radio", { name: BENEFICIARIO_APPLY_AP[apply], exact: true });
    }

    /** Flash del beneficiario adicional generado al pasar de paso. */
    get beneficiarioAdicionalFlash(): Locator {
        return this.page.getByText(/ya cumple el rol de beneficiario/);
    }

    /** Flash con un solo asegurado que coincide con el beneficiario (pestañas Asegurado y Beneficiario). */
    get aseguradoPropioBeneficiarioFlash(): Locator {
        return this.page.getByText(/Un asegurado no puede ser su propio beneficiario/);
    }

    /**
     * Busca en Nosis el cliente activo y espera a que el form se complete. El
     * primer click en "Buscar cliente" a veces se pierde por el re-layout del
     * flash de matriz: se reintenta hasta que aparece el input.
     */
    private async buscarClienteNosis(index: number, dniCuit: string): Promise<void> {
        const { nosisInput, buscarClienteBtn } = this.emisionCliente;
        await expect(nosisInput.or(buscarClienteBtn).first()).toBeVisible({ timeout: FIELD_TIMEOUT });
        // "Buscar cliente" es toggle: esperar lo suficiente antes de reclickear para no cerrarlo.
        await expect(async () => {
            if (!(await nosisInput.isVisible())) await buscarClienteBtn.click();
            await expect(nosisInput).toBeVisible({ timeout: 5000 });
        }).toPass({ timeout: FIELD_TIMEOUT });
        await nosisInput.fill(dniCuit);
        await this.emisionCliente.buscarBtn.click();
        const cuit = this.page.locator(
            `[id="dependant_clientes.${index}.cuit"], [id="number_clientes.${index}.razonSocialCuit"]`,
        );
        await expect(cuit.first()).toHaveValue(/\d/, { timeout: SETTLE_TIMEOUT });
    }

    /** Header de la pestaña del cliente activo ("Tomador", "Asegurado", …) en el panel izquierdo. */
    panelActivo(rol: RolAP): Locator {
        return this.page.getByRole("button", { name: rol, exact: true });
    }

    /**
     * Tipear la fecha solo navega el calendario al mes: la fecha recién se
     * confirma en Formik al clickear el día (Escape la descarta).
     */
    private async setFechaNacimiento(index: number, ddmmyyyy: string): Promise<void> {
        const [dd, mm, yyyy] = [ddmmyyyy.slice(0, 2), ddmmyyyy.slice(2, 4), ddmmyyyy.slice(4)];
        const input = this.page.locator(`[id="date_clientes.${index}.fechaNacimiento"]`);
        await expect(input).toBeVisible({ timeout: FIELD_TIMEOUT });
        await input.click();
        await input.fill("");
        await input.pressSequentially(ddmmyyyy);
        await this.diaCalendario(new Date(Number(yyyy), Number(mm) - 1, Number(dd))).click();
        await expect(input).toHaveValue(`${dd}/${mm}/${yyyy}`);
    }

    /**
     * Elige la opción del beneficiario activo; con "otro" lo busca en Nosis
     * (sin `completarPostNosis`: pisa la fecha de nacimiento de algunos CUITs).
     */
    private async completarBeneficiario(index: number, beneficiario: BeneficiarioAP): Promise<void> {
        const radio = this.beneficiarioApplyRadio(beneficiario.apply);
        await radio.click();
        await expect(radio).toBeChecked();
        if (beneficiario.apply === "otro") {
            if (!beneficiario.dniCuit) throw new Error("Beneficiario 'otro' requiere dniCuit");
            await this.buscarClienteNosis(index, beneficiario.dniCuit);
        }
    }

    /**
     * Asistente de emisión desde el botón "Emitir" del plan hasta el modal de
     * éxito (o error). Matriz de clientes AP: fila 1 Tomador (activa al entrar),
     * fila 2 Beneficiario (herederos legales por default), fila 3 Asegurado;
     * cada asegurado extra se agrega con "Nuevo cliente" (rol default Asegurado).
     */
    async emitirPlan(producto: ProductoAP, plan: PlanAP, opts: EmitirOptsAP): Promise<void> {
        await this.completarPasoPoliza(producto, plan, opts);
        await this.completarClientes(opts);
        await this.continuarASolicitud(opts);
        await this.emitirSolicitud();
    }

    /** Paso Póliza: vigencia viene fija de la cotización; solo forma de pago. */
    async completarPasoPoliza(producto: ProductoAP, plan: PlanAP, opts: EmitirOptsAP): Promise<void> {
        await clickEvenIfOffscreen(this.page, this.emitirBtn(producto, plan));
        await expect(this.formaPagoSelect).toBeVisible({ timeout: FIELD_TIMEOUT });
        const formaPago = opts.formaPago ?? "Efectivo";
        await this.selectOption(this.formaPagoSelect, formaPago);
        if (formaPago === "Débito por CBU") {
            await this.emisionFormaPago.fillCBU(opts.cbu);
        } else if (formaPago === "Tarjeta de crédito") {
            await this.emisionFormaPago.fillTarjetaCredito({ sancor: true });
        }
        await this.buttons.siguienteBtn.click();
    }

    /** Paso Cliente: completa la matriz y espera el alta de matriz de Sancor. */
    async completarClientes(opts: EmitirOptsAP): Promise<void> {
        await expect(this.editarClienteBtn(1)).toBeVisible({ timeout: FIELD_TIMEOUT });
        await this.buscarClienteNosis(0, opts.tomador);
        await this.emisionCliente.completarPostNosis(0, opts.tomador, opts);
        // useAltaMatriz solo dispara la matriz al salir del tomador si Formik ya lo validó.
        await expect(this.clienteCheck(1)).toBeVisible({ timeout: FIELD_TIMEOUT });

        if (opts.beneficiario && opts.beneficiario.apply !== "herederosLegales") {
            await this.editarClienteBtn(2).click();
            await expect(this.panelActivo(ROLES_AP.beneficiario)).toBeVisible({ timeout: FIELD_TIMEOUT });
            await this.completarBeneficiario(1, opts.beneficiario);
        }

        // Asegurados: el primero ocupa la fila 3 (índice Formik 2).
        const fechaNac = fechaNacimientoParaRango(opts.rangoEdad);
        for (const [i, dniCuit] of opts.asegurados.entries()) {
            const index = 2 + i;
            if (i === 0) {
                await this.editarClienteBtn(3).click();
                await expect(this.panelActivo(ROLES_AP.asegurado)).toBeVisible({ timeout: FIELD_TIMEOUT });
            } else {
                await this.emisionCliente.nuevoClienteBtn.click();
                await expect(this.emisionCliente.getSelectorRolCliente(index)).toHaveValue("Asegurado", {
                    timeout: FIELD_TIMEOUT,
                });
            }
            await this.buscarClienteNosis(index, dniCuit);
            await this.setFechaNacimiento(index, fechaNac);
        }

        for (const extra of opts.clientesAdicionales ?? []) {
            await this.emisionCliente.agregarClienteConRol(extra.rol, extra.dniCuit, opts);
        }

        await expect(
            this.altaMatrizConfirmada.or(this.emisionCliente.errorMatriz).first(),
            "Sancor no confirmó el alta de matriz",
        ).toBeVisible({ timeout: EMIT_TIMEOUT });
        await expect(this.emisionCliente.errorMatriz).not.toBeVisible();
    }

    /** SIGUIENTE del paso Cliente (resolviendo el beneficiario adicional si se pidió) hasta "Detalles de póliza". */
    async continuarASolicitud(opts: EmitirOptsAP): Promise<void> {
        await this.buttons.siguienteBtn.click();

        if (opts.beneficiarioAdicional) {
            await expect(
                this.beneficiarioAdicionalFlash,
                "No se generó el beneficiario adicional (validación de clientes: ver fecha de nacimiento vs rango de edad)",
            ).toBeVisible({ timeout: FIELD_TIMEOUT });
            // El adicional no tiene select de rol: su índice Formik es el siguiente al último cliente.
            const index = await this.page.locator('[id^="select_clientes."][id$=".rol"]').count();
            await this.completarBeneficiario(index, opts.beneficiarioAdicional);
            await this.buttons.siguienteBtn.click();
        }

        await expect(
            this.detallesPolizaHeading,
            "No avanzó a 'Detalles de póliza' (validación de clientes: ver fecha de nacimiento vs rango de edad)",
        ).toBeVisible({ timeout: FIELD_TIMEOUT });
    }

    /** Paso Solicitud: EMITIR y espera éxito o error. */
    async emitirSolicitud(): Promise<void> {
        await this.emitirFinalBtn.click();

        await expect(
            this.emisionExitosaHeading
                .or(this.emisionFinal.errorEmision)
                .or(this.errorCertificacionCliente)
                .first(),
        ).toBeVisible({ timeout: EMIT_TIMEOUT });
    }

    async assertEmisionExitosa(): Promise<void> {
        await expect(this.errorCertificacionCliente, "Sancor rechazó la certificación del cliente").not.toBeVisible();
        await expect(this.emisionFinal.errorEmision).not.toBeVisible();
        await expect(this.emisionExitosaHeading).toBeVisible();
        await reportarNumeroEmision(this.numeroPolizaValue);
        await expect(this.anyDocumentoDescargarBtn.first()).toBeEnabled();
    }
}
