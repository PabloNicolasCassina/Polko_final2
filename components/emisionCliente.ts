import { Page, Locator, expect } from "@playwright/test";
import { settleValueIfPresent } from "../helpers/settleLocalidad";

const FIELD_TIMEOUT = 30000;

export default class EmisionCliente {
    readonly page: Page;

    readonly nosisInput: Locator;
    readonly buscarBtn: Locator;
    readonly completarBtn: Locator;
    readonly buscarClienteBtn: Locator;
    readonly masculinoRadio: Locator;
    readonly femeninoRadio: Locator;
    readonly localidadInput: Locator;
    readonly emailInput: Locator;
    readonly telefonoInput: Locator;
    readonly fechaNacimientoInput: Locator;
    readonly situacionImpositivaInput: Locator;
    readonly nuevoClienteBtn: Locator;
    readonly editarClienteBtn: Locator;
    readonly selectorRolCliente: Locator;
    readonly checkLlenadoCliente: Locator;
    readonly warningLlenadoCliente: Locator;
    readonly tipoPersonaCombobox: Locator;
    readonly cuitDniInput: Locator;
    readonly errorMatriz: Locator;
    readonly cargaMatriz: Locator;
    readonly radioButtonOtro: Locator;

    constructor(page: Page) {
        this.page = page;
        this.nosisInput = page.getByRole("textbox", { name: "DNI o CUIT/CUIL" });
        this.buscarBtn = page.getByRole("button", { name: "Buscar" });
        this.completarBtn = page.getByRole("button", { name: "Completar datos manualmente" });
        this.masculinoRadio = page.getByRole("radio", { name: "Masculino" });
        this.femeninoRadio = page.getByRole("radio", { name: "Femenino" });
        this.localidadInput = page
            .locator('[id="select_clientes.0.codigosLocalidad"]')
            .or(page.getByRole("textbox", { name: "Código postal" }));
        this.emailInput = page.locator('[id="input_clientes.0.email"]');
        this.telefonoInput = page.locator('[id="phone_clientes.0.telefono"]');
        this.fechaNacimientoInput = page.getByRole("textbox", { name: "dd/mm/yyyy" });
        this.situacionImpositivaInput = page
            .locator('[id="select_clientes.0.situacionImpositiva"]')
            .or(page.locator('[id="dependant_clientes.0.situacionImpositiva"]'));
        this.nuevoClienteBtn = page.getByRole("button", { name: "Nuevo cliente" });
        this.editarClienteBtn = this.getEditarClienteBtn(1);
        this.selectorRolCliente = page.locator('[id="select_clientes.0.rol"]');
        this.checkLlenadoCliente = this.getCheckLlenadoCliente(1);
        this.warningLlenadoCliente = this.getWarningLlenadoCliente(1);
        this.tipoPersonaCombobox = page.locator('[id="select_clientes.0.tipoPersona"]');
        this.buscarClienteBtn = page.getByRole("button", { name: "Buscar cliente" });
        this.cuitDniInput = page.locator('[id="number_clientes.0.razonSocialCuit"]');
        this.errorMatriz = page.getByText("Hubo un problema al crear la");
        this.cargaMatriz = page.getByText("Generando alta de matriz con");
        this.radioButtonOtro = page.getByRole("radio", { name: "Otro" });
    }

    getEditarClienteBtn(index: number): Locator {
        return this.page.locator(
            `div:nth-child(${index}) > div:nth-child(2) > .autem__clientes__icon--edit`,
        );
    }

    getSelectorRolCliente(index: number): Locator {
        return this.page.locator(`[id="select_clientes.${index}.rol"]`);
    }

    getEmailInput(index: number): Locator {
        return this.page.locator(`[id="input_clientes.${index}.email"]`);
    }

    getTelefonoInput(index: number): Locator {
        return this.page.locator(`[id="phone_clientes.${index}.telefono"]`);
    }

    getLocalidadInput(index: number): Locator {
        return this.page
            .locator(`[id="select_clientes.${index}.codigosLocalidad"]`)
            .or(this.page.getByRole("searchbox", { name: "Localidad" }));
    }

    getFechaNacimientoInput(index: number): Locator {
        return this.page
            .locator(`[id="date_clientes.${index}.fechaNacimiento"]`)
            .or(this.page.getByRole("textbox", { name: "dd/mm/yyyy" }));
    }

    getCheckLlenadoCliente(index: number): Locator {
        return this.page.locator(
            `div:nth-child(${index}) > div:nth-child(3) > .autem__clientes__icon--check`,
        );
    }

    getWarningLlenadoCliente(index: number): Locator {
        return this.page.locator(
            `div:nth-child(${index}) > div:nth-child(3) > .autem__clientes__icon--exclamation`,
        );
    }

    getTipoPersonaOption(tipoPersona: string): Locator {
        return this.page.getByRole("option", { name: tipoPersona, exact: true });
    }

    /** Tab de rol en ClientStep (Asegurado, Tomador, Acreedor Prendario, …). */
    getRolTab(label: string): Locator {
        return this.page.locator(".ClientStep__clientRolTag", { hasText: label });
    }

    /**
     * Agrega un cliente top-level con "Nuevo cliente", setea el rol y lo busca en Nosis.
     * @returns índice Formik del cliente creado (0-based).
     */
    async agregarClienteConRol(
        rolLabel: string,
        dniCuit: string,
        opts: { localidad?: string; mail?: string; telefono?: string } = {},
    ): Promise<number> {
        await expect(this.nuevoClienteBtn).toBeVisible({ timeout: FIELD_TIMEOUT });
        const beforeCount = await this.page.locator('[id^="select_clientes."][id$=".rol"]').count();
        await this.nuevoClienteBtn.click();
        const index = beforeCount;
        const rolSelect = this.getSelectorRolCliente(index);
        await expect(rolSelect).toBeVisible({ timeout: FIELD_TIMEOUT });
        await rolSelect.click();
        await this.page.getByRole("option", { name: rolLabel, exact: true }).click();

        await expect(this.nosisInput).toBeVisible({ timeout: FIELD_TIMEOUT });
        await this.nosisInput.fill(dniCuit);
        await this.buscarBtn.click();
        await this.completarPostNosis(index, dniCuit, opts);
        return index;
    }

    /** Completa campos típicos post-Nosis según CUIT conocido (misma lógica que emitirPlan). */
    async completarPostNosis(
        index: number,
        dniCuit: string,
        opts: { localidad?: string; mail?: string; telefono?: string } = {},
    ): Promise<void> {
        if (dniCuit === "30711392404") {
            const loc = this.getLocalidadInput(index);
            await loc.click();
            const option = this.page.getByRole("option", {
                name: opts.localidad ?? "(5000) CORDOBA",
                exact: true,
            });
            await expect(option).toBeVisible({ timeout: FIELD_TIMEOUT });
            await option.click();
        } else if (dniCuit === "23343180489" || dniCuit === "30615714158") {
            await this.getTelefonoInput(index).fill(opts.telefono ?? "3512334798");
            await this.getEmailInput(index).fill(opts.mail ?? "cassinanico@gmail.com");
        } else if (dniCuit === "27381618426") {
            await this.getFechaNacimientoInput(index).fill("010100").catch(() => {});
            await this.getTelefonoInput(index).fill("3512334798").catch(() => {});
        } else {
            const mail = this.getEmailInput(index);
            if (await mail.isVisible().catch(() => false)) {
                const current = await mail.inputValue().catch(() => "");
                if (!current) await mail.fill(opts.mail ?? "cassinanico@gmail.com");
            }
            const tel = this.getTelefonoInput(index);
            if (await tel.isVisible().catch(() => false)) {
                const current = await tel.inputValue().catch(() => "");
                if (!current) await tel.fill(opts.telefono ?? "3512334798");
            }
        }

        const localidad = this.getLocalidadInput(index).and(this.page.locator(":visible"));
        await settleValueIfPresent(localidad);
    }

    /**
     * Si aparece el tab de un rol adicional (p.ej. Titular de sociedad), lo selecciona
     * y completa con Nosis. No falla si el tab no existe.
     */
    async completarRolTabSiExiste(
        rolLabel: string,
        dniCuit: string,
        opts: { localidad?: string; mail?: string; telefono?: string } = {},
    ): Promise<boolean> {
        const tab = this.getRolTab(rolLabel);
        if (!(await tab.isVisible({ timeout: 5000 }).catch(() => false))) {
            return false;
        }
        await tab.click();
        await expect(this.nosisInput.or(this.buscarClienteBtn)).toBeVisible({
            timeout: FIELD_TIMEOUT,
        });
        if (await this.buscarClienteBtn.isVisible().catch(() => false)) {
            await this.buscarClienteBtn.click();
        }
        await expect(this.nosisInput).toBeVisible({ timeout: FIELD_TIMEOUT });
        await this.nosisInput.fill(dniCuit);
        await this.buscarBtn.click();
        // El adicional suele ser índice 1 bajo el asegurado PJ.
        await this.completarPostNosis(1, dniCuit, opts);
        return true;
    }
}