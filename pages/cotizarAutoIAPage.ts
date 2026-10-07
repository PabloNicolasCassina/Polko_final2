import { Page, Locator, expect } from "@playwright/test";
import path from "path";
import CommonButtons from "../components/commonButtons";
import CotizacionVehiculo from "../components/auto/cotizacionVehiculo";
import CotizacionPersona from "../components/auto/cotizacionPersona";
import EmisionDetalleAuto from "../components/auto/emisionDetalleAuto";
import EmisionInspeccion from "../components/auto/emisionInspeccion";
import EmisionInspeccionMercantilAndina from "../components/auto/emisionInspeccionMercantilAndina";
import EmisionFinal from "../components/emisionFinal";
import EmisionCliente from "../components/emisionCliente";
import EmisionFormaPago from "../components/emisionFormaPago";
import CtrowAutoTable from "../components/ctrowAutoTable";
import QuotationSidebar from "../components/quotationSidebar";
import { settleLocalidadIfPresent } from "../helpers/settleLocalidad";
import { reportarNumeroEmision } from "../helpers/reportePoliza";

/**
 * Page Object de /u/cotizar/automotor — cotización, config avanzada por
 * aseguradora y flujo completo de emisión hasta la pantalla de éxito.
 *
 * Verificado en vivo (RENAULT LOGAN II 1.6 16V INTENS L/19 - 2022, sesión
 * userPre) el 2026-09-21: planes + opciones de config avanzada de las 6
 * aseguradoras que cotizaron OK (Sancor, Rivadavia, Zurich, RUS, ATM, Triunfo).
 * Federación / Experta / Mercantil fallaron en cotización ese día (badge error);
 * siguen mapeadas en constantes por si vuelven.
 *
 * Tabla rediseñada `.ctrowAuto` — ver `components/ctrowAutoTable.ts`.
 */

/** Campos de "Configuración avanzada" por tile del sidebar (auto). */
export const CONFIG_AVANZADA_FIELDS_AUTO: Record<string, string[]> = {
    Sancor: [
        "applyExtraDiscount",
        "promoAntiquatyDiscount",
        "vigencia",
        "fechaCotizacion",
        "sumaAseguradaVehiculo",
        "usoVehiculo",
    ],
    Rivadavia: ["grua", "ajusteAutomatico", "fechaCotizacion", "facturacion", "cuotas", "usoVehiculo"],
    Zurich: ["formaDePago", "vigenciaDesde", "edad"],
    RUS: ["ajusteAutomatico", "sumaAseguradaVehiculo", "vigenciaDesde", "usoVehiculo"],
    Federación: [
        "applyDiscount",
        "interasegurado",
        "alarma",
        "multiFranquicia",
        "grua",
        "tipoVigencia",
        "vigenciaDesde",
        "tipoVehiculo",
        "asegura2",
        "productoModular",
    ],
    Experta: ["formaDePago", "vigenciaDesde", "usoVehiculo"],
    ATM: ["alarma", "tipoVigencia", "vigenciaDesde", "formaDePago", "facturacion", "cuotas", "ajusteAutomatico"],
    Triunfo: ["ajusteAutomatico", "usoVehiculo", "sumaAseguradaVehiculo", "facturacion", "cuotas", "formaDePago"],
    Mercantil: ["sumaAseguradaVehiculo", "ajusteAutomatico", "facturacion", "cuotas"],
};

/** @deprecated Preferí `CONFIG_AVANZADA_FIELDS_AUTO` (keys = label del tile). */
export const CONFIG_AVANZADA_FIELDS = CONFIG_AVANZADA_FIELDS_AUTO;

/**
 * Checkboxes editables dentro de config avanzada.
 * Labels vivos (mockUserDataATM, 2026-09-21):
 *   Sancor.applyExtraDiscount → "¿Necesitás un descuento adicional?"
 *   Federación.applyDiscount → "Descuento cliente nuevo"
 *   Federación.multiFranquicia → "Multiples franquicias"
 *
 * Sancor.promoAntiquatyDiscount ("Promo 20% OFF") NO entra: viene checked +
 * readOnly (clase `--readOnly`); no es toggleable en UI.
 */
export const CONFIG_AVANZADA_CHECKBOX_FIELDS_AUTO: Record<string, string[]> = {
    Sancor: ["applyExtraDiscount"],
    Rivadavia: ["grua"],
    Federación: ["applyDiscount", "multiFranquicia"],
};

/** Label accesible (role=checkbox) por company.field — preferido sobre el input crudo. */
export const CONFIG_AVANZADA_CHECKBOX_LABELS_AUTO: Record<string, Record<string, RegExp>> = {
    Sancor: {
        applyExtraDiscount: /descuento adicional/i,
    },
    Rivadavia: {
        grua: /Grúa/i,
    },
    Federación: {
        applyDiscount: /Descuento cliente nuevo/i,
        multiFranquicia: /Multiples franquicias/i,
    },
};

/** Campos presentes pero disabled/readOnly (no entran al pairwise). */
export const CONFIG_AVANZADA_DISABLED_FIELDS_AUTO: Record<string, string[]> = {
    Sancor: ["vigencia", "promoAntiquatyDiscount"],
    ATM: ["alarma", "tipoVigencia"],
    Triunfo: ["ajusteAutomatico"],
    Federación: ["interasegurado", "alarma", "grua", "asegura2", "productoModular"],
};

/**
 * Opciones de combobox por aseguradora (fuente pairwise).
 * Mapeado en vivo 2026-09-21. usoVehiculo Rivadavia acotado a 2 valores
 * (el listado completo tiene 5 y explota el covering array).
 */
export const CONFIG_AVANZADA_OPTIONS_BY_COMPANY_AUTO: Record<string, Record<string, string[]>> = {
    Sancor: {
        usoVehiculo: ["Particular", "Particular y/o Comercial"],
    },
    Rivadavia: {
        ajusteAutomatico: [
            "Aplicar 5%",
            "Aplicar 10%",
            "Aplicar 20%",
            "Aplicar 30%",
            "Aplicar 40%",
        ],
        facturacion: ["Mensual", "Trimestral", "Semestral"],
        usoVehiculo: ["Particular", "Transporte de Bienes"],
    },
    Zurich: {
        formaDePago: ["Medios electrónicos", "Efectivo"],
    },
    RUS: {
        ajusteAutomatico: ["No aplicar", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
        usoVehiculo: ["Particular", "Comercial"],
    },
    Experta: {
        formaDePago: ["Medios electrónicos", "Efectivo"],
        usoVehiculo: ["Particular", "Comercial"],
    },
    ATM: {
        formaDePago: ["Tarjeta de Crédito", "Débito por CBU", "Efectivo"],
        ajusteAutomatico: ["No aplicar", "Aplicar 10%", "Aplicar 20%"],
    },
    Triunfo: {
        usoVehiculo: ["Particular", "Comercial", "Especial"],
        // facturación/cuotas dependen de formaDePago — ver PAGO_FACTURACION_CUOTAS.
    },
    Mercantil: {
        ajusteAutomatico: ["No aplicar", "Aplicar 10%", "Aplicar 25%", "Aplicar 50%"],
        // facturación/cuotas → CUOTAS_BY_FACTURACION (no dependen de pago).
    },
    Federación: {
        tipoVigencia: ["Semestral", "Mensual"],
    },
};

/** Cuotas válidas por facturación (Rivadavia / Mercantil). Triunfo/ATM van por pago. */
export const CONFIG_AVANZADA_CUOTAS_BY_FACTURACION_AUTO: Record<string, Record<string, string[]>> = {
    Rivadavia: {
        Mensual: ["1"],
        Trimestral: ["1", "3"],
        Semestral: ["1", "6"],
    },
    Mercantil: {
        Mensual: ["1"],
        Cuatrimestral: ["1", "4"],
    },
};

/** Rivadavia: ajuste depende de facturación. */
export const CONFIG_AVANZADA_AJUSTE_BY_FACTURACION_AUTO: Record<string, Record<string, string[]>> = {
    Rivadavia: {
        Mensual: ["Aplicar 5%", "Aplicar 10%", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
        Trimestral: ["Aplicar 10%", "Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
        Semestral: ["Aplicar 20%", "Aplicar 30%", "Aplicar 40%"],
    },
};

/**
 * Cadena dependant formaDePago → facturación → cuotas.
 *
 * ATM (tiposFacturacion + misma regla que moto; el listbox a veces muestra
 * opciones stale — no confiar en un dump sin filtrar):
 *   Tarjeta / Débito CBU → Mensual(1) | Bimestral(1|2)
 *   Efectivo            → Bimestral(1|2) | Trimestral(1|3)  (NO Mensual)
 *
 * Triunfo (tiposFacturacion):
 *   Medios electrónicos → Mensual(1) | Trimestral(1|2|3)
 *   Efectivo            → Trimestral(1|2|3)  (NO Mensual)
 */
export const CONFIG_AVANZADA_PAGO_FACTURACION_CUOTAS_AUTO: Record<
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
 * Valores de la barra "Descuento extra" por aseguradora.
 * Sancor (mock ATM): sin check adicional marks 0/15/35; con check 0/35.
 * Pairwise itera [0, 15, 35] y `isConfigRowValid` exige applyExtraDiscount
 * para % > 15 (tope de pauta del mock = 15).
 */
export const CONFIG_AVANZADA_DESCUENTOS_AUTO: Record<string, number[]> = {
    Sancor: [0, 15, 35],
    Rivadavia: [0, 15],
    Zurich: [0, 15],
    RUS: [0, 20],
    ATM: [0, 30],
    Triunfo: [0, 30],
    Mercantil: [0, 25],
};

/** Tope de descuento sin "descuento adicional" (Sancor). */
export const SANCOR_DESCUENTO_SIN_EXTRA = 15;

/** Tile del sidebar → id interno en `configuracionAvanzada.<id>.*`. */
export const COMPANY_LABEL_TO_ID: Record<string, string> = {
    Sancor: "Sancor",
    Rivadavia: "Rivadavia",
    Zurich: "Zurich",
    RUS: "RUS",
    Federación: "Federacion_Patronal",
    Experta: "Experta",
    ATM: "ATM",
    Triunfo: "Triunfo",
    Mercantil: "Mercantil_Andina",
};

/** Códigos de plan por aseguradora (label del tile), confirmados en vivo 2026-09-21. */
export const PLAN_CODES_AUTO: Record<string, Record<string, string>> = {
    Sancor: {
        "Auto Max 1 (RC solo)": "1",
        "Auto Max 16 (RC/IP/IT c/asistencia)": "16",
        "Auto Max 3 (RC/IP/IT/RT/RP c/Asistencia)": "14",
        "Auto Max 6 (RC/AT/IP/IT/RP/RT c/Asistencia)": "5",
        "Auto Max 13 (RC/AT/IT/RT sin granizo c/Asistencia)": "17",
        "Auto Premium Max (c/Asistencia)": "12",
        "Auto Todo Riesgo 8% (c/deduc. $1.612.000 c/Asistencia)": "35",
        "Auto Todo Riesgo 5% (c/deduc. $1.007.500 c/Asistencia)": "33",
        "Auto Todo Riesgo 4% (c/deduc. $806.000 c/Asistencia)": "31",
        "Auto Todo Riesgo 3% (c/deduc. $604.500 c/Asistencia)": "30",
        "Auto Todo Riesgo 2% (c/deduc. $403.000 c/Asistencia)": "28",
        "Auto Todo Riesgo 1% (c/deduc. $201.500 c/Asistencia)": "26",
    },
    Rivadavia: {
        "Responsabilidad Civil": "A",
        "F (RC/IT/RT)": "F",
        "B (RC/IT/RT/DT)": "B",
        "G (RC/IT/IP/RT/RP)": "G",
        "Terceros Completo": "C",
        "Mega Plan": "M",
        "Mega Premium": "P",
        "Mega Max": "MX",
        "Todo Riesgo (Franquicia 5%)": "D F5",
        "Todo Riesgo (Franquicia 4%)": "D F4",
        "Todo Riesgo (Franquicia 3%)": "D F3",
        "D SF": "D SF",
    },
    Zurich: {
        "Responsabilidad Civil": "A",
        "Todo Total + Cristales y Granizo": "BG",
        "Terc.Comp. (Cris. Y Gra. Limitado)": "CM",
        "Terceros Completo Premium Granizo": "CG",
        "Todo Riesgo Franquicia Variable 6%": "D6",
        "Todo Riesgo Franquicia Variable 4%": "DV",
        "Todo Riesgo Franquicia Variable 2%": "D2",
        "Todo Riesgo Franquicia Variable 1%": "D1",
    },
    RUS: {
        "RC C/Grua (RC)": "RC-G",
        "B2 (RC/RT)": "B2",
        "B1 (RC/IT/RT)": "B1-80",
        "B (RC/IT/RT/DT)": "B-80",
        "C1 (RC/IT/IP/RT/RP)": "C1-80",
        "Sigma Cero": "S0",
        "C2 (RC/IT/IP/RT)": "C2-80",
        "Todo Riesgo (c/deduc. 10%)": "T44",
        "Todo Riesgo (c/deduc. 7%)": "T37",
        "Todo Riesgo (c/deduc. 5%)": "T31",
        "Todo Riesgo (c/deduc. 3%)": "T32",
        "Todo Riesgo (c/deduc. 2%)": "T34",
    },
    ATM: {
        "Responsabilidad Civil sin asistencia": "A1",
        "Responsabilidad Civil": "A0",
        "Tercero simple B5": "B5",
        "Tercero simple B4": "B4",
        "Tercero simple B1": "B1",
        "Tercero simple B": "B0",
        "C1 (C1)": "C1",
        "C clásica (C0)": "C0",
        "C Black (C4)": "C4",
        "C plus (C3)": "C3",
        "C Premium (C2)": "C2",
        "Todo Riesgo D3 (Franquicia 6%)": "D3",
        "Todo Riesgo D2 (Franquicia 3%)": "D2",
    },
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
        "Todo Riesgo D4 (Franquicia 4%)": "D4",
        "Todo Riesgo D3": "D3",
        "D2 Franquicia 2%": "D2",
        D: "D",
    },
    // Códigos vivos con mockUserDataATM (2026-09-21). Experta sigue fallando al cotizar.
    Federación: {
        "Responsabilidad Civil": "A4",
        "RC. PERD TOTAL INC.": "B2",
        "Terceros Básico": "B",
        "Terceros Completo": "C",
        "Terceros Completo Premium": "CF",
        "Todo Riesgo (Franquicia 4%)": "TD3-4",
        "Todo Riesgo (Sin Franquicia)": "TD1",
    },
    Experta: {
        "23": "23",
    },
    Mercantil: {
        A: "800",
        B3: "921",
        B0: "922",
        B1: "923",
        B: "925",
        "M BASICA": "977",
        "M PLUS": "976",
        "D2 0050": "930",
        "D2 0040": "929",
        "D2 0030": "944",
        "D2 0020": "942",
    },
};

const FIELD_TIMEOUT = 30000;
const SETTLE_TIMEOUT = 30000;
const QUOTE_TIMEOUT = 90000;
/** Form listo tras goto; si no aparece (shell blanco bajo carga), se recarga. */
const FORM_READY_TIMEOUT = 30000;
const GOTO_ATTEMPTS = 3;

/**
 * DNI 8 dígitos único por corrida. FedPat "Descuento cliente nuevo" exige un DNI
 * que no haya usado el beneficio; en pre alcanza con uno fresco.
 */
export function generarDniClienteNuevo(): string {
    const n = 35_000_000 + (Date.now() % 9_000_000) + Math.floor(Math.random() * 900);
    return String(n).slice(0, 8);
}

/** CUIT persona física (20/27 → 23/24 si DV=10) a partir de DNI. */
export function cuitFromDni(dni: string, genero: "M" | "F" = "M"): string {
    const dni8 = dni.replace(/\D/g, "").padStart(8, "0").slice(-8);
    const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const calcDv = (tipo: number): number => {
        const base = `${tipo}${dni8}`;
        const sum = [...base].reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
        const resto = sum % 11;
        return resto === 0 ? 0 : 11 - resto;
    };
    let tipo = genero === "F" ? 27 : 20;
    let dv = calcDv(tipo);
    if (dv === 10) {
        tipo = genero === "F" ? 24 : 23;
        dv = calcDv(tipo);
        if (dv === 10) dv = 9;
    }
    return `${tipo}${dni8}${dv}`;
}

export default class CotizarAutoIAPage {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly cotizacionVehiculo: CotizacionVehiculo;
    readonly cotizacionPersona: CotizacionPersona;
    readonly emisionDetalleAuto: EmisionDetalleAuto;
    readonly emisionInspeccion: EmisionInspeccion;
    readonly emisionFinal: EmisionFinal;
    readonly emisionCliente: EmisionCliente;
    readonly emisionFormaPago: EmisionFormaPago;
    readonly ctrowTable: CtrowAutoTable;
    readonly sidebar: QuotationSidebar;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.cotizacionVehiculo = new CotizacionVehiculo(page);
        this.cotizacionPersona = new CotizacionPersona(page);
        this.emisionDetalleAuto = new EmisionDetalleAuto(page);
        this.emisionInspeccion = new EmisionInspeccion(page);
        this.emisionFinal = new EmisionFinal(page);
        this.emisionCliente = new EmisionCliente(page);
        this.emisionFormaPago = new EmisionFormaPago(page);
        this.ctrowTable = new CtrowAutoTable(page);
        this.sidebar = new QuotationSidebar(page);
    }

    companyTile(label: string): Locator {
        return this.sidebar.companyTile(label);
    }

    get companyTileActive(): Locator {
        return this.sidebar.companyTileActive;
    }

    companyId(label: string): string {
        return COMPANY_LABEL_TO_ID[label] ?? label;
    }

    /**
     * Navega al cotizador auto y espera el form accionable.
     * Con varios workers el shell (nav + sidebar) a veces carga y el contenido
     * queda en blanco: subir timeout no ayuda. Recargar y reintentar sí.
     */
    async goto(): Promise<void> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= GOTO_ATTEMPTS; attempt++) {
            await this.page.goto("/u/cotizar/automotor", {
                waitUntil: "domcontentloaded",
                timeout: 120000,
            });
            await this.dismissAseguradorasModalIfPresent();
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
            this.cotizacionVehiculo.marcaSelector,
            "Formulario Automotor no cargó (select marca ausente — posible shell en blanco bajo carga)",
        ).toBeVisible({ timeout });
        await expect(this.cotizacionVehiculo.marcaSelector).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.loadingSpinner.waitFor({ state: "hidden", timeout: FIELD_TIMEOUT }).catch(() => {});
    }

    /** Modal inicial "Mis aseguradoras" / ACEPTAR (a veces aparece con el mock). */
    async dismissAseguradorasModalIfPresent(): Promise<void> {
        const aceptar = this.page.getByRole("button", { name: /^ACEPTAR$/i });
        if (!(await aceptar.isVisible({ timeout: 2000 }).catch(() => false))) return;
        for (let i = 1; i <= 9; i++) {
            const logo = this.page.locator(`#csm__logo-${i}`);
            if ((await logo.count()) > 0) {
                await logo.click({ force: true }).catch(() => {});
            }
        }
        await aceptar.click().catch(() => {});
        await expect(aceptar).toBeHidden({ timeout: FIELD_TIMEOUT }).catch(() => {});
    }

    /**
     * Abre un Mantine Select del vehículo, filtra si es editable y elige la opción.
     * Evita click ciego: espera accionable + scroll (el sidebar a veces tapa el form).
     */
    private async selectVehiculoOption(field: Locator, optionText: string): Promise<void> {
        await expect(field).toBeVisible({ timeout: FIELD_TIMEOUT });
        await expect(field).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await field.scrollIntoViewIfNeeded();
        await this.buttons.loadingSpinner
            .waitFor({ state: "hidden", timeout: FIELD_TIMEOUT })
            .catch(() => {});
        await field.click();
        if (await field.isEditable().catch(() => false)) {
            await field.fill(optionText);
        }
        const option = this.page.getByRole("option", { name: optionText, exact: true });
        await expect(option).toBeVisible({ timeout: SETTLE_TIMEOUT });
        await option.click();
    }

    /**
     * Completa "Datos del vehículo" + "Datos del titular" y cotiza.
     * userPre precarga persona; por defecto basta el código postal.
     * Opcional: `tipoPersona` / `sitImpositiva` (jurídica / RI) según autos.json.
     */
    async cotizarVehiculo(
        auto: {
            marca: string;
            año: string;
            modelo: string;
            version: string;
            c_postal: string;
            tipoPersona?: string;
            sitImpositiva?: string;
        },
        opts: { waitForResults?: boolean } = {},
    ): Promise<void> {
        const waitForResults = opts.waitForResults !== false;

        // Defensa si se llama sin goto() previo, o el form se desmontó a mitad.
        await this.waitForVehiculoFormReady(FORM_READY_TIMEOUT);

        await this.selectVehiculoOption(this.cotizacionVehiculo.marcaSelector, auto.marca);
        await this.selectVehiculoOption(this.cotizacionVehiculo.añoSelector, auto.año);
        await this.selectVehiculoOption(this.cotizacionVehiculo.modeloSelector, auto.modelo);
        await this.selectVehiculoOption(this.cotizacionVehiculo.versionSelector, auto.version);
        await this.buttons.siguienteBtn.click();

        await expect(this.cotizacionPersona.codPostal).toBeVisible({ timeout: FIELD_TIMEOUT });

        if (auto.tipoPersona) {
            await this.cotizacionPersona.tipoPersona.click();
            await this.cotizacionPersona.getTipoPersonaLocator(auto.tipoPersona).click();
        }
        if (auto.sitImpositiva) {
            await this.cotizacionPersona.sitImpositiva.click();
            await this.cotizacionPersona.getSitImpositivaLocator(auto.sitImpositiva).click();
            await expect(this.cotizacionPersona.getSitImpositivaLocator(auto.sitImpositiva)).toBeHidden({
                timeout: FIELD_TIMEOUT,
            });
        }

        await this.cotizacionPersona.codPostal.fill(auto.c_postal);
        await expect(this.cotizacionPersona.localidad).not.toHaveValue("", { timeout: SETTLE_TIMEOUT });
        await expect(this.buttons.cotizarBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.cotizarBtn.click();

        if (waitForResults) {
            await this.esperarResultadosCotizacion();
        }
    }

    async selectCompania(label: string): Promise<void> {
        await this.sidebar.seleccionarCompania(label);
        await expect(this.page.locator(".ctrowAuto").first()).toBeVisible({ timeout: QUOTE_TIMEOUT });
    }

    companySuccessBadge(label: string): Locator {
        return this.sidebar.companySuccessBadge(label);
    }

    async esperarResultadosCotizacion(timeout = QUOTE_TIMEOUT, company?: string): Promise<void> {
        if (company) {
            await this.sidebar.esperarCotizacionCompania(company, timeout);
            return;
        }
        await this.sidebar.esperarAlgunaCotizacion(timeout, ".ctrowAuto");
    }

    async assertEmisionExitosa(): Promise<void> {
        await expect(this.emisionExitosaHeading.or(this.emisionFinal.errorEmision)).toBeVisible({
            timeout: QUOTE_TIMEOUT * 2,
        });
        await expect(this.emisionFinal.errorEmision).not.toBeVisible();
        await this.assertNumeroEmision();
        await expect(this.anyDocumentoDescargarBtn.first()).toBeEnabled();
    }

    configField(companyLabel: string, field: string): Locator {
        const id = this.companyId(companyLabel);
        return this.page.locator(`[id*="configuracionAvanzada.${id}.${field}"]`);
    }

    async selectConfigOption(company: string, field: string, optionText: string): Promise<void> {
        await this.sidebar.abrirConfigAvanzada();
        await this.configField(company, field).click();
        const option = this.page.getByRole("option", { name: optionText, exact: true });
        await expect(
            option,
            `Opción "${optionText}" no visible en ${company}.${field}`,
        ).toBeVisible({ timeout: 5000 });
        await option.click();
    }

    get descuentoExtraLabel(): Locator {
        return this.page.getByText("Descuento extra", { exact: true });
    }

    get descuentoSlider(): Locator {
        return this.page.getByRole("slider");
    }

    get descuentoSliderTrack(): Locator {
        return this.page.locator(".mantine-Slider-root").first();
    }

    descuentoBarMark(percent: number): Locator {
        return this.page.getByText(`${percent}%`, { exact: true });
    }

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
            throw new Error("No se pudo obtener boundingBox del slider de descuento auto");
        }
        await this.page.mouse.click(box.x + box.width * ratio, box.y + box.height / 2);
    }

    async setConfigCheckbox(company: string, field: string, checked: boolean): Promise<void> {
        await this.sidebar.abrirConfigAvanzada();
        const labelRe = CONFIG_AVANZADA_CHECKBOX_LABELS_AUTO[company]?.[field];
        const byLabel = labelRe
            ? this.page.getByRole("checkbox", { name: labelRe })
            : this.configField(company, field);
        if ((await byLabel.count()) === 0) return;

        const isChecked = await byLabel.isChecked();
        if (isChecked === checked) return;

        // Mantine: el input suele ser readOnly / pointer-events none; el click
        // al role=checkbox lo intercepta `.mantine-Checkbox-inner` o el header.
        const className = (await byLabel.getAttribute("class")) ?? "";
        if (className.includes("readOnly") || className.includes("--readOnly")) {
            return;
        }
        const enabled = await byLabel.isEnabled().catch(() => false);
        if (!enabled) return;

        // Click en el label/wrapper (evita intercept del input oculto).
        const clickTarget = byLabel.locator("..").locator("..");
        if ((await clickTarget.count()) > 0) {
            await clickTarget.first().click({ timeout: 5000 });
        } else {
            await byLabel.click({ force: true });
        }

        // Sancor: tildar descuento adicional puede abrir modal "ACEPTAR Y HABILITAR".
        if (company === "Sancor" && field === "applyExtraDiscount" && checked) {
            const aceptar = this.page.getByRole("button", {
                name: /ACEPTAR Y HABILITAR|Aceptar/i,
            });
            if (await aceptar.isVisible({ timeout: 2000 }).catch(() => false)) {
                await aceptar.click();
            }
        }
    }

    async aplicarConfigCase(
        company: string,
        values: Record<string, string | boolean | number>,
    ): Promise<void> {
        const checkboxes = CONFIG_AVANZADA_CHECKBOX_FIELDS_AUTO[company] ?? [];
        const dependantOrder = (field: string): number => {
            if (field === "formaDePago") return 0;
            if (field === "facturacion") return 1;
            if (field === "cuotas") return 2;
            // Sancor: applyExtraDiscount debe ir antes del slider (habilita % > 15).
            if (field === "applyExtraDiscount") return 3;
            if (field === "descuento") return 4;
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
                await this.setConfigCheckbox(company, field, Boolean(value));
            } else {
                const enabled = await fieldLocator.isEnabled().catch(() => false);
                if (!enabled) continue;
                await this.selectConfigOption(company, field, String(value));
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

    async aplicarConfigAvanzada(): Promise<void> {
        await this.sidebar.aplicarConfig(FIELD_TIMEOUT);
        await expect(this.page.locator(".ctrowAuto").first()).toBeVisible({ timeout: QUOTE_TIMEOUT });
    }

    planCard(code: string): Locator {
        return this.ctrowTable.planCard(code);
    }

    agregarBtn(code: string): Locator {
        return this.ctrowTable.agregarBtn(code);
    }

    emitirBtn(code: string): Locator {
        return this.ctrowTable.emitirBtn(code);
    }

    get formaPagoSelect(): Locator {
        return this.page.locator('[id="select_infoDePago.formaDePago"]');
    }

    get emitirFinalBtn(): Locator {
        return this.buttons.emitirBtn;
    }

    get emisionExitosaHeading(): Locator {
        return this.page.getByRole("heading", { name: "¡Póliza emitida con éxito!" });
    }

    /**
     * Número de póliza en la pantalla de éxito (Rivadavia / RUS).
     * RUS también muestra "Número de propuesta": no unir ambos labels en un
     * filter (strict mode → 2 elements). Usá `assertNumeroEmision()`.
     */
    get numeroPolizaValue(): Locator {
        return this.page
            .locator(".EmissionSuccess__row")
            .filter({ has: this.page.getByText(/Número de p[oó]liza/i) })
            .locator(".EmissionSuccess__rowValue");
    }

    /** Número de propuesta (Sancor y otras que no muestran "póliza"). */
    get numeroPropuestaValue(): Locator {
        return this.page
            .locator(".EmissionSuccess__row")
            .filter({ has: this.page.getByText(/Número de propuesta/i) })
            .locator(".EmissionSuccess__rowValue");
    }

    /** Número de trámite (Triunfo y similares). */
    get numeroTramiteValue(): Locator {
        return this.page
            .locator(".EmissionSuccess__row")
            .filter({ has: this.page.getByText(/Número de [Tt]r[aá]mite/i) })
            .locator(".EmissionSuccess__rowValue");
    }

    /** Assert del número en éxito: póliza → propuesta → trámite. */
    async assertNumeroEmision(): Promise<void> {
        if ((await this.numeroPolizaValue.count()) > 0) {
            await reportarNumeroEmision(this.numeroPolizaValue);
            return;
        }
        if ((await this.numeroPropuestaValue.count()) > 0) {
            await reportarNumeroEmision(this.numeroPropuestaValue, "Número de propuesta");
            return;
        }
        await reportarNumeroEmision(this.numeroTramiteValue, "Número de trámite");
    }

    get anyDocumentoDescargarBtn(): Locator {
        return this.page
            .locator(".EmissionDocumentDownloadRow")
            .getByRole("button", { name: "Descargar" });
    }

    /**
     * Alta manual de cliente cuando Nosis no resuelve el DNI (cliente nuevo FedPat).
     * MantineInputField solo commitea a Formik en blur → fill + blur obligatorio.
     */
    async completarClienteManualFedPat(dni: string): Promise<void> {
        const cuit = cuitFromDni(dni, "M");
        const byId = (field: string) =>
            this.page.locator(
                `[id="clientes.0.${field}"], [id="input_clientes.0.${field}"], [id="number_clientes.0.${field}"], [id="select_clientes.0.${field}"], [id="dependant_clientes.0.${field}"]`,
            );

        const fillCommit = async (locator: Locator, value: string) => {
            const target = locator.first();
            if ((await target.count()) === 0) return;
            if (!(await target.isVisible().catch(() => false))) return;
            await target.click();
            await target.fill("");
            await target.pressSequentially(value, { delay: 15 });
            await target.blur();
        };

        await fillCommit(
            byId("nombre").or(this.page.getByRole("textbox", { name: /^Nombre$/i })),
            "QA",
        );
        await fillCommit(
            byId("apellido").or(this.page.getByRole("textbox", { name: /^Apellido$/i })),
            "FedPat",
        );

        const sexo = byId("sexo").or(this.page.getByRole("searchbox", { name: /^Sexo$/i }));
        if (await sexo.first().isVisible().catch(() => false)) {
            await sexo.first().click();
            const opt = this.page.getByRole("option", { name: /Masculino|Hombre/i }).first();
            if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
                await opt.click();
            } else if (await this.emisionCliente.masculinoRadio.isVisible().catch(() => false)) {
                await this.emisionCliente.masculinoRadio.click();
            }
        } else if (await this.emisionCliente.masculinoRadio.isVisible().catch(() => false)) {
            await this.emisionCliente.masculinoRadio.click();
        }

        await fillCommit(
            byId("dni").or(this.page.getByRole("textbox", { name: /^DNI$/i })),
            dni,
        );
        await fillCommit(
            byId("cuit").or(this.page.getByRole("textbox", { name: /CUIT\/CUIL/i })),
            cuit,
        );
        await fillCommit(this.emisionCliente.fechaNacimientoInput, "01011990");
        await fillCommit(
            byId("calle").or(this.page.getByRole("textbox", { name: /Direcci[oó]n de domicilio/i })),
            "San Martin",
        );
        await fillCommit(
            byId("numero").or(this.page.getByRole("textbox", { name: /N[uú]mero de domicilio/i })),
            "123",
        );

        const cp = byId("codigoPostal").or(
            this.page.getByRole("textbox", { name: /C[oó]digo postal/i }),
        );
        if (await cp.first().isVisible().catch(() => false)) {
            const current = await cp.first().inputValue().catch(() => "");
            if (!current) await fillCommit(cp, "5000");
        }

        await fillCommit(this.emisionCliente.emailInput, "cassinanico@gmail.com");
        await fillCommit(this.emisionCliente.telefonoInput, "3512334798");
    }

    /**
     * FedPat "Descuento cliente nuevo": al Emitir abre modal pidiendo DNI fresco.
     * Valida contra la aseguradora; si el DNI ya usó el beneficio, reintenta con otro.
     * @returns DNI usado, o `undefined` si el modal no apareció.
     */
    async completarModalDniClienteNuevoSiAparece(dniPreferido?: string): Promise<string | undefined> {
        // Nested h1 dentro de h2 en el popup → usar .first().
        const heading = this.page
            .getByRole("heading", { name: /Ingresá el DNI de tu cliente/i })
            .first();
        const input = this.page
            .locator('[id="configuracionAvanzada.Federacion_Patronal.dniCliente"]')
            .or(this.page.locator(".csm__popupBody input"))
            .or(this.page.getByLabel(/DNI del cliente/i))
            .first();
        const emitirModalBtn = this.page
            .locator(".csm__popupFooter")
            .getByRole("button", { name: /EMITIR/i });
        const beneficioError = this.page
            .locator(".csm__popupFooter, .csm__popupError, .csm__popupBody")
            .getByText(/no cuenta con [eé]ste beneficio/i);
        const continuarBtn = this.page
            .locator(".csm__popupFooter")
            .getByRole("button", { name: /^Continuar$/i });

        // Esperar modal O wizard: el popup puede tardar más que un poll corto.
        await expect(heading.or(this.formaPagoSelect)).toBeVisible({ timeout: QUOTE_TIMEOUT });
        if (await this.formaPagoSelect.isVisible().catch(() => false)) {
            return undefined;
        }
        await expect(heading).toBeVisible({ timeout: FIELD_TIMEOUT });

        let dni = dniPreferido ?? generarDniClienteNuevo();
        for (let attempt = 0; attempt < 4; attempt++) {
            if (attempt > 0) dni = generarDniClienteNuevo();
            // Mantine+Formik: onChange solo state local; setFieldValue ocurre en blur.
            await input.click();
            await input.fill("");
            await input.pressSequentially(dni, { delay: 20 });
            await input.blur();
            await expect(input).toHaveValue(dni);
            await emitirModalBtn.click();

            // Loading del check + recotización FedPat.
            await expect(
                this.formaPagoSelect.or(beneficioError).or(continuarBtn),
            ).toBeVisible({ timeout: QUOTE_TIMEOUT });

            if (await continuarBtn.isVisible().catch(() => false)) {
                await continuarBtn.click();
                await expect(this.formaPagoSelect).toBeVisible({ timeout: QUOTE_TIMEOUT });
            }
            if (await this.formaPagoSelect.isVisible().catch(() => false)) {
                return dni;
            }
            if (await beneficioError.isVisible().catch(() => false)) {
                continue;
            }
        }
        throw new Error(
            `FedPat cliente nuevo: no se pudo validar un DNI fresco tras reintentos (último=${dni})`,
        );
    }

    /**
     * Orquesta el asistente de emisión desde la tarjeta del plan hasta éxito/error.
     * Zurich no pide inspección. Si aparece "No se requiere inspección", solo Siguiente.
     * FedPat con applyDiscount: modal "Ingresá el DNI de tu cliente" antes del wizard.
     *
     * `clientesAdicionales`: tras el asegurado (índice 0), agrega "Nuevo cliente" con rol + Nosis.
     * `completarRolTab`: si existe un tab de rol adicional (p.ej. Titular de sociedad), lo completa.
     */
    async emitirPlan(
        code: string,
        opts: {
            formaPago?: string;
            dniCuit?: string;
            skipInspeccion?: boolean;
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
            completarRolTab?: { rol: string; dniCuit: string };
        } = {},
    ): Promise<void> {
        await this.emitirBtn(code).click();

        // FedPat "cliente nuevo": pide DNI fresco antes de abrir el wizard de emisión.
        const dniClienteNuevo = await this.completarModalDniClienteNuevoSiAparece(opts.dniCuit);
        const dniParaNosis = opts.dniCuit ?? dniClienteNuevo ?? "27381618426";

        await this.completarPasoPoliza(opts.formaPago);

        await this.completarPasoCliente(dniParaNosis, opts, dniClienteNuevo);

        await this.completarPasoDetalleVehiculo();

        if (!opts.skipInspeccion) {
            await this.completarPasoInspeccion();
        }

        await expect(this.emitirFinalBtn).toBeVisible({ timeout: FIELD_TIMEOUT });
        await this.emitirFinalBtn.click();

        await expect(this.buttons.loadingSpinner)
            .toBeHidden({ timeout: QUOTE_TIMEOUT })
            .catch(() => {});
        await expect(this.emisionExitosaHeading.or(this.emisionFinal.errorEmision)).toBeVisible({
            timeout: QUOTE_TIMEOUT * 2,
        });
    }

    /**
     * Paso "Póliza": forma de pago (preferida o la primera disponible) + CBU/tarjeta si
     * la forma lo pide, y Siguiente.
     */
    async completarPasoPoliza(formaPago?: string): Promise<void> {
        await expect(this.formaPagoSelect).toBeVisible({ timeout: QUOTE_TIMEOUT });
        if (await this.formaPagoSelect.isEnabled()) {
            await this.formaPagoSelect.click();
            await this.page
                .getByRole("option")
                .first()
                .waitFor({ state: "visible", timeout: FIELD_TIMEOUT });

            const preferred = formaPago
                ? this.page.getByRole("option", { name: formaPago, exact: true })
                : null;
            if (preferred && (await preferred.count()) > 0) {
                await preferred.click();
            } else {
                // Efectivo no existe en Zurich/Triunfo/Sancor: tomar la primera opción válida.
                await this.page.getByRole("option").first().click();
            }
            await expect(this.formaPagoSelect).not.toHaveValue("", { timeout: FIELD_TIMEOUT });
        }
        const visiblePago = await this.formaPagoSelect.inputValue().catch(() => "");
        const { formaDePago } = await this.emisionFormaPago.readPagoFieldValues();
        const formaNorm = (visiblePago || formaDePago || "").toLowerCase();
        if (formaNorm.includes("cbu")) {
            const cbuVisible = await this.emisionFormaPago.CBU.isVisible().catch(() => false);
            if (cbuVisible) await this.emisionFormaPago.fillCBU();
        } else if (formaNorm.includes("tarjeta") || formaNorm.includes("medios electr")) {
            // "Medios electrónicos" suele abrir marca/número de tarjeta.
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
    }

    /** Paso "Detalle del vehículo": patente, motor y chasis aleatorios si vienen vacíos, y Siguiente. */
    async completarPasoDetalleVehiculo(): Promise<void> {
        await expect(this.emisionDetalleAuto.patenteInput).toBeVisible({ timeout: QUOTE_TIMEOUT });
        if (!(await this.emisionDetalleAuto.patenteInput.inputValue())) {
            await this.emisionDetalleAuto.patenteInput.fill(
                this.emisionDetalleAuto.generarPatenteAleatoriaAuto(),
            );
            await this.emisionDetalleAuto.nroMotorInput.fill(
                this.emisionDetalleAuto.generarNroMotorAleatorio(),
            );
            await this.emisionDetalleAuto.nroChasisInput.fill(
                this.emisionDetalleAuto.generarNroChasisAleatorio(),
            );
        }
        await this.buttons.siguienteBtn.click();
    }

    /**
     * Paso "Cliente" del asistente: Nosis + datos faltantes según CUIT, y Siguiente.
     * `dniClienteNuevo` (FedPat) fuerza alta manual porque el DNI fresco no está en Nosis.
     */
    async completarPasoCliente(
        dniParaNosis: string,
        opts: {
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
            completarRolTab?: { rol: string; dniCuit: string };
        } = {},
        dniClienteNuevo?: string,
    ): Promise<void> {
        await expect(this.page.getByText("Buscar cliente")).toBeVisible({ timeout: FIELD_TIMEOUT });
        await this.emisionCliente.nosisInput.fill(dniParaNosis);
        await this.emisionCliente.buscarBtn.click();

        // Post-Nosis según CUIT (misma lógica que emisionAutoPage.emitirCliente / autos.json).
        if (dniParaNosis === "30711392404") {
            // Persona jurídica: a veces pide elegir localidad.
            const locOption = this.buttons.getOptionLocator(opts.localidad ?? "(5000) CORDOBA");
            await this.emisionCliente.localidadInput.click();
            await expect(locOption).toBeVisible({ timeout: SETTLE_TIMEOUT });
            await locOption.click();
        } else if (dniParaNosis === "23343180489" || dniParaNosis === "30615714158") {
            await this.emisionCliente.telefonoInput.fill(opts.telefono ?? "3512334798");
            await this.emisionCliente.emailInput.fill(opts.mail ?? "cassinanico@gmail.com");
        } else if (dniClienteNuevo != null) {
            // DNI fresco (FedPat cliente nuevo) casi nunca está en Nosis → alta manual.
            const completarManual = this.emisionCliente.completarBtn;
            if (await completarManual.isVisible({ timeout: 5000 }).catch(() => false)) {
                await completarManual.click();
            }
            await this.completarClienteManualFedPat(dniParaNosis);
        } else if (dniParaNosis === "27381618426") {
            await this.emisionCliente.fechaNacimientoInput.fill("010100").catch(() => {});
            await this.emisionCliente.telefonoInput.fill("3512334798").catch(() => {});
            await this.emisionCliente.fechaNacimientoInput.blur().catch(() => {});
        }

        await settleLocalidadIfPresent(this.page);

        if (opts.completarRolTab) {
            await this.emisionCliente.completarRolTabSiExiste(
                opts.completarRolTab.rol,
                opts.completarRolTab.dniCuit,
                {
                    localidad: opts.localidad,
                    mail: opts.mail,
                    telefono: opts.telefono,
                },
            );
        }

        for (const extra of opts.clientesAdicionales ?? []) {
            await this.emisionCliente.agregarClienteConRol(extra.rol, extra.dniCuit, {
                localidad: extra.localidad ?? opts.localidad,
                mail: extra.mail ?? opts.mail,
                telefono: extra.telefono ?? opts.telefono,
            });
        }

        await this.page.waitForTimeout(1000);
        await expect(this.buttons.siguienteBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
        await this.buttons.siguienteBtn.click();
    }

    /**
     * Paso "Inspección": dropzone con foto etiquetada, inspección digital de Mercantil
     * (popup) o "No se requiere inspección". `revision` es el CTA del paso siguiente,
     * para detectar que el asistente ya saltó la inspección.
     */
    async completarPasoInspeccion(revision: Locator = this.emitirFinalBtn): Promise<void> {
        // El <input type="file"> del Dropzone está oculto (Mantine): no usar toBeVisible
        // sobre él. Anclar en el heading / modal Mercantil / revisión.
        const inspeccionHeading = this.page.getByRole("heading", {
            name: /Inspección del vehículo/i,
        });
        const noInspeccion = this.emisionInspeccion.msgNoNecesitoInspeccion;
        const irInspeccion = this.emisionInspeccion.btnIrAInspeccion;
        const tituloMercantil = this.emisionInspeccion.tituloInspeccionVehicular;
        const dropzone = this.emisionInspeccion.inspecciondpzone;

        await expect(
            inspeccionHeading
                .or(noInspeccion)
                .or(irInspeccion)
                .or(tituloMercantil)
                .or(revision),
        ).toBeVisible({ timeout: FIELD_TIMEOUT });

        if (await noInspeccion.isVisible().catch(() => false)) {
            await this.buttons.siguienteBtn.click();
        } else if (await revision.isVisible().catch(() => false) && !(await inspeccionHeading.isVisible().catch(() => false))) {
            // Ya estamos en revisión (p.ej. Zurich skip).
        } else {
            // Race Mercantil: el heading del paso aparece ANTES que el modal
            // "Ir a la inspección". Esperar CTA digital o dropzone adjunto.
            let mode: "mercantil" | "dropzone" | "revision" | null = null;
            const deadline = Date.now() + FIELD_TIMEOUT;
            while (Date.now() < deadline && !mode) {
                if (await irInspeccion.isVisible().catch(() => false)) {
                    mode = "mercantil";
                    break;
                }
                if ((await dropzone.count()) > 0) {
                    mode = "dropzone";
                    break;
                }
                if (await revision.isVisible().catch(() => false)) {
                    mode = "revision";
                    break;
                }
                await this.page.waitForTimeout(400);
            }

            if (mode === "mercantil") {
                const filepath = path.join(__dirname, "..", "fixtures", "auto.jpeg");
                const [popup] = await Promise.all([
                    this.page.waitForEvent("popup"),
                    irInspeccion.click(),
                ]);
                await popup.waitForLoadState("domcontentloaded");
                const mercantilInspeccion = new EmisionInspeccionMercantilAndina(popup);
                await mercantilInspeccion.completarInspeccionDigital(filepath, false);
                await popup.close();
                await this.page.bringToFront();
                await expect(this.emisionInspeccion.tituloReencuentro).toBeVisible({
                    timeout: 30000,
                });
                await this.emisionInspeccion.btnSiYaComplete.click();
                await expect(this.emisionInspeccion.msgInspeccionConfirmada).toBeVisible({
                    timeout: 15000,
                });
                await this.buttons.siguienteBtn.click();
            } else if (mode === "dropzone") {
                const filepath = path.join(__dirname, "..", "fixtures", "auto.jpeg");
                await dropzone.setInputFiles(filepath);
                await expect(this.emisionInspeccion.imgInspeccion).toBeVisible({
                    timeout: FIELD_TIMEOUT,
                });
                await this.emisionInspeccion.etiquetaImg.click();
                await this.emisionInspeccion.etiquetaOption.click();
                await expect(this.buttons.siguienteBtn).toBeEnabled({ timeout: FIELD_TIMEOUT });
                await this.buttons.siguienteBtn.click();
            } else if (mode !== "revision") {
                const linkError = this.page.getByText(/No pudimos obtener el enlace de inspección/);
                const detalle = (await linkError.isVisible().catch(() => false))
                    ? ` — el front muestra: "${(await linkError.innerText()).trim()}"`
                    : "";
                throw new Error(
                    `Paso inspección: no apareció dropzone ni CTA 'Ir a la inspección' de Mercantil${detalle}`,
                );
            }
        }
    }
}
