import { Page, Locator, expect } from "@playwright/test";
import CotizacionAsistenciaViajero from "../components/ap/cotizacionAsistenciaViajero";
import CommonButtons from "../components/commonButtons";

export type DestinoAsistenciaViajero = "argentina" | "estados_unidos" | "multiples";

export type ClienteAv = {
    cuitDni: string;
    sexo: "Femenino" | "Masculino";
    calle?: string;
    numero?: string;
    telefono?: string;
    email?: string;
    emergenciaNombre: string;
    emergenciaApellido: string;
    emergenciaTelefono: string;
};

/** Rangos ya usados en la corrida (evita solapar entre tests / reintentos 520). */
const rangosFechasUsados = new Set<string>();

const PERIODO_DIAS_DEFAULT = 5;
const MAX_REINTENTOS_FECHA = 6;

export default class EmisionAsistenciaViajeroPage {
    readonly page: Page;
    readonly cotizacion: CotizacionAsistenciaViajero;
    readonly buttons: CommonButtons;
    readonly formaPagoSelect: Locator;
    readonly dniCuitInput: Locator;
    readonly buscarClienteBtn: Locator;
    readonly emitirPlanBtn: Locator;
    readonly emitirFinalBtn: Locator;
    readonly successText: Locator;
    readonly errorFechaDuplicada: Locator;
    readonly errorEmisionGenerico: Locator;

    constructor(page: Page) {
        this.page = page;
        this.cotizacion = new CotizacionAsistenciaViajero(page);
        this.buttons = new CommonButtons(page);
        this.formaPagoSelect = page.locator(".mantine-Select-input").first();
        this.dniCuitInput = page.getByRole("textbox", { name: /DNI o CUIT\/CUIL/i });
        this.buscarClienteBtn = page.getByRole("button", { name: /^Buscar$/i });
        this.emitirPlanBtn = page.getByRole("button", { name: /^Emitir$/i }).first();
        this.emitirFinalBtn = page.getByRole("button", { name: /^Emitir$/i }).last();
        this.successText = page.getByText(
            /Felicitaciones|operaci[oó]n se ha realizado|N[uú]mero de voucher/i
        );
        this.errorFechaDuplicada = page.getByText(
            /voucher emitido en ese rango|ya tiene\s+un voucher|TERRAWIND_API_ERROR[\s\S]{0,80}520/i
        );
        this.errorEmisionGenerico = page.getByText(
            /Parece que hubo un inconveniente|Too Many Requests|REQUEST_ERROR|Error de la aseguradora/i
        );
    }

    async cerrarModalCompanias() {
        const aceptar = this.cotizacion.aceptarButton;
        await expect(aceptar).toBeVisible({ timeout: 30000 });
        // El overlay `.customModal__container` / `.pcmodal__container` a veces intercepta el click.
        await aceptar.click({ force: true });
        const modal = this.page
            .locator(".pcmodal__container, .customModal__container")
            .filter({ hasText: /Asistencia al viajero/i });
        if (await modal.first().isVisible().catch(() => false)) {
            await aceptar.click({ force: true }).catch(() => {});
            await this.page.keyboard.press("Escape").catch(() => {});
        }
        await expect(modal.first()).toBeHidden({ timeout: 20000 }).catch(async () => {
            await this.page.evaluate(() => {
                document
                    .querySelectorAll(".pcmodal__container, .customModal__container")
                    .forEach((el) => el.remove());
            });
        });
        await expect(this.cotizacion.paisDestinoSearchbox).toBeVisible({ timeout: 30000 });
    }

    async seleccionarDestino(destino: DestinoAsistenciaViajero) {
        if (destino === "multiples") {
            await this.cotizacion.multiplesDestinosCheckbox.check({ force: true });
            await expect(this.cotizacion.multiplesDestinosCheckbox).toBeChecked();
            return;
        }

        const query = destino === "argentina" ? "Argentina" : "Estados Unidos";
        await this.cotizacion.paisDestinoSearchbox.click();
        await this.cotizacion.paisDestinoSearchbox.fill(query);
        const optionName =
            destino === "argentina" ? /^Argentina$/i : /Estados Unidos/i;
        const option = this.page.getByRole("option", { name: optionName }).first();
        await expect(option).toBeVisible({ timeout: 15000 });
        await option.click();
    }

    async completarEdadPasajero(edad: string = "30") {
        await this.cotizacion.edadPasajero1Textbox.fill(edad);
    }

    /**
     * Elige un rango aleatorio de exactamente `diasPeriodo` días (salida → salida+N-1).
     * No reutiliza rangos ya usados en la corrida.
     */
    async seleccionarRangoFechasAleatorio(diasPeriodo: number = PERIODO_DIAS_DEFAULT) {
        const span = Math.max(1, diasPeriodo - 1);

        for (let attempt = 0; attempt < 12; attempt++) {
            await this.cotizacion.salidaRegresoControl.click();
            const calendar = this.page.getByRole("dialog");
            await expect(calendar).toBeVisible({ timeout: 10000 });

            // 1–6 meses adelante para dispersar fechas entre corridas.
            const monthsAhead = 1 + Math.floor(Math.random() * 6);
            for (let i = 0; i < monthsAhead; i++) {
                const next = calendar.locator(".mantine-CalendarHeader-calendarHeaderControl").last();
                await expect(next).toBeVisible({ timeout: 5000 });
                await next.click();
            }

            const enabledDays = calendar
                .getByRole("button", { name: /\d+\s+\w+\s+\d{4}/ })
                .and(this.page.locator(":not([disabled])"));
            await expect(enabledDays.first()).toBeVisible({ timeout: 10000 });
            const count = await enabledDays.count();
            if (count <= span) {
                await this.page.keyboard.press("Escape").catch(() => {});
                continue;
            }

            const maxStart = count - span - 1;
            const idx1 = Math.floor(Math.random() * (maxStart + 1));
            const idx2 = idx1 + span;

            const startLabel = (await enabledDays.nth(idx1).getAttribute("aria-label")) || `s${idx1}`;
            const endLabel = (await enabledDays.nth(idx2).getAttribute("aria-label")) || `e${idx2}`;
            const key = `${startLabel}|${endLabel}`;
            if (rangosFechasUsados.has(key)) {
                await this.page.keyboard.press("Escape").catch(() => {});
                continue;
            }

            await enabledDays.nth(idx1).click();
            await enabledDays.nth(idx2).click();
            await this.page.keyboard.press("Escape").catch(() => {});
            rangosFechasUsados.add(key);
            return key;
        }

        throw new Error(
            `No se pudo elegir un rango aleatorio de ${diasPeriodo} días sin repetir fechas usadas`
        );
    }

    async cotizar() {
        await expect(this.cotizacion.cotizarButton).toBeEnabled({ timeout: 15000 });
        await this.cotizacion.cotizarButton.click();
        await expect(this.emitirPlanBtn).toBeVisible({ timeout: 180000 });
    }

    async emitirDesdePlan() {
        // Preferir plan con tag Nacional/Regional si aparece en la tarjeta.
        const planPreferido = this.page
            .locator("div, article, section, li")
            .filter({ hasText: /Nacional|Regional/i })
            .filter({ has: this.page.getByRole("button", { name: /^Emitir$/i }) })
            .getByRole("button", { name: /^Emitir$/i })
            .first();
        if (await planPreferido.isVisible().catch(() => false)) {
            await planPreferido.click();
        } else {
            await this.emitirPlanBtn.click();
        }
        await expect(this.formaPagoSelect).toBeVisible({ timeout: 60000 });
    }

    async completarFormaPago(formaPago: string = "Transferencia") {
        await this.formaPagoSelect.click();
        await this.page.getByRole("option", { name: new RegExp(formaPago, "i") }).first().click();
        await this.page.getByRole("button", { name: /SIGUIENTE/i }).click();
        await expect(this.dniCuitInput).toBeVisible({ timeout: 60000 });
    }

    async completarCliente(cliente: ClienteAv) {
        const radio = this.page.getByRole("radio", { name: new RegExp(cliente.sexo, "i") });
        if (await radio.isVisible().catch(() => false)) {
            await radio.check({ force: true }).catch(async () => {
                await radio.click({ force: true });
            });
        }

        await this.dniCuitInput.fill(cliente.cuitDni);
        await this.buscarClienteBtn.click();
        await expect(this.page.getByText(/Datos personales/i)).toBeVisible({ timeout: 30000 });

        const fillIfEmpty = async (locator: Locator, value?: string) => {
            if (!value) return;
            if (!(await locator.first().isVisible().catch(() => false))) return;
            const current = await locator.first().inputValue().catch(() => "");
            if (!current?.trim()) {
                await locator.first().fill(value);
            }
        };

        await fillIfEmpty(
            this.page.locator("input[name='pasajeros[0].calle']").or(
                this.page.getByRole("textbox", { name: /Dirección de domicilio/i })
            ),
            cliente.calle ?? "Calle Falsa"
        );
        await fillIfEmpty(
            this.page.locator("input[name='pasajeros[0].numero']").or(
                this.page.getByRole("textbox", { name: /Número de domicilio/i })
            ),
            cliente.numero ?? "123"
        );
        await fillIfEmpty(
            this.page.getByRole("textbox", { name: /^Email/i }),
            cliente.email
        );

        const phones = this.page.locator("input.PhoneInputInput, input[type='tel']");
        if ((await phones.count()) >= 1) {
            const p0 = phones.nth(0);
            const v0 = await p0.inputValue().catch(() => "");
            if (!v0 || v0.replace(/\D/g, "").length < 10) {
                await p0.fill(cliente.telefono ?? "+543512334798");
            }
        }

        const locSearch = this.page.getByRole("searchbox", { name: /^Localidad$/i });
        await expect(locSearch).toBeVisible({ timeout: 15000 });
        const locVal = await locSearch.inputValue().catch(() => "");
        if (!locVal?.trim()) {
            await locSearch.click();
            const opt = this.page.getByRole("option").first();
            await expect(opt).toBeVisible({ timeout: 10000 });
            await opt.click();
            await expect(locSearch).not.toHaveValue("", { timeout: 10000 });
        }

        await this.page.locator("input[name='nombre_contacto_emergencia']").fill(cliente.emergenciaNombre);
        await this.page.locator("input[name='apellido_contacto_emergencia']").fill(cliente.emergenciaApellido);
        await this.page.locator("input[name='telefono_contacto_emergencia']").fill(cliente.emergenciaTelefono);

        await this.page.getByRole("button", { name: /SIGUIENTE/i }).click();
        await expect(this.page.getByText(/Detalles de p[oó]liza/i)).toBeVisible({ timeout: 60000 });
    }

    async cerrarModalErrorEmision() {
        const closeBtn = this.page
            .getByRole("button", { name: /cerrar|close|×/i })
            .or(this.page.locator(".errorModal button, [class*='ErrorModal'] button, .mantine-Modal-close"))
            .first();
        if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click({ force: true }).catch(() => {});
        } else {
            await this.page.keyboard.press("Escape").catch(() => {});
        }
        await this.page.waitForTimeout(500);
    }

    /** Vuelve al form de cotización (País / Multiples + COTIZAR). */
    async volverAFormularioCotizacion() {
        for (let i = 0; i < 6; i++) {
            if (await this.cotizacion.cotizarButton.isVisible().catch(() => false)) {
                return;
            }
            const atras = this.page.getByRole("button", { name: /ATR[AÁ]S/i });
            if (await atras.isVisible().catch(() => false)) {
                await atras.click();
                await this.page.waitForTimeout(400);
            } else {
                break;
            }
        }
        await expect(this.cotizacion.cotizarButton).toBeVisible({ timeout: 30000 });
    }

    /**
     * Click Emitir final y clasifica resultado.
     * - success: Felicitaciones
     * - date_conflict: TerraWind 520 (voucher ya emitido en el rango)
     * - other_error: otro error de aseguradora
     */
    async emitirFinalResultado(): Promise<"success" | "date_conflict" | "other_error"> {
        await expect(this.emitirFinalBtn).toBeVisible({ timeout: 30000 });
        await expect(this.emitirFinalBtn).toBeEnabled({ timeout: 90000 });
        await this.emitirFinalBtn.click();

        const deadline = Date.now() + 300000;
        while (Date.now() < deadline) {
            if (await this.successText.first().isVisible().catch(() => false)) {
                return "success";
            }
            if (await this.errorFechaDuplicada.first().isVisible().catch(() => false)) {
                return "date_conflict";
            }
            if (await this.errorEmisionGenerico.first().isVisible().catch(() => false)) {
                const body = await this.page.locator("body").innerText();
                if (/voucher emitido en ese rango|ya tiene\s+un voucher|520/i.test(body)) {
                    return "date_conflict";
                }
                return "other_error";
            }
            await this.page.waitForTimeout(1000);
        }
        return "other_error";
    }

    async emitirFinal() {
        const result = await this.emitirFinalResultado();
        if (result !== "success") {
            throw new Error(`Emisión AV no exitosa: ${result}`);
        }
    }

    /**
     * Cotiza + emite con fechas random de 5 días.
     * Si TerraWind 520 (rango ocupado), cambia fechas y reintenta el flujo desde cotización.
     */
    async cotizarYEmitirConFechasAleatorias(opts: {
        destino: DestinoAsistenciaViajero;
        edad?: string;
        formaPago?: string;
        cliente: ClienteAv;
        diasPeriodo?: number;
        maxReintentos?: number;
    }) {
        const diasPeriodo = opts.diasPeriodo ?? PERIODO_DIAS_DEFAULT;
        const maxReintentos = opts.maxReintentos ?? MAX_REINTENTOS_FECHA;
        const formaPago = opts.formaPago ?? "Transferencia";

        await this.seleccionarDestino(opts.destino);
        await this.completarEdadPasajero(opts.edad ?? "30");

        let lastError = "";
        for (let attempt = 1; attempt <= maxReintentos; attempt++) {
            const rango = await this.seleccionarRangoFechasAleatorio(diasPeriodo);
            await this.cotizar();
            await this.emitirDesdePlan();
            await this.completarFormaPago(formaPago);
            await this.completarCliente(opts.cliente);

            const result = await this.emitirFinalResultado();
            if (result === "success") {
                return { rango, attempt };
            }

            lastError = result;
            if (result === "date_conflict") {
                await this.cerrarModalErrorEmision();
                await this.volverAFormularioCotizacion();
                // Reafirmar destino/edad por si el form se reseteó parcialmente.
                await this.seleccionarDestino(opts.destino);
                await this.completarEdadPasajero(opts.edad ?? "30");
                continue;
            }

            const body = (await this.page.locator("body").innerText()).slice(0, 500);
            throw new Error(`Emisión AV falló (${result}) en intento ${attempt}. UI: ${body}`);
        }

        throw new Error(
            `Agotados ${maxReintentos} reintentos por conflicto de fechas TerraWind 520. Último: ${lastError}`
        );
    }
}
