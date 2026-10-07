import { Page, Locator } from "@playwright/test";

/**
 * Selectores remapeados del flujo de Motovehículo post-refactor (POL-2473).
 *
 * Verificados en vivo (localhost, backend activo, 2026-09-03):
 * cotización Sancor + emisión hasta "Datos del vehículo".
 *
 * CAMBIOS vs suite actual (emisionMoto / cotizacionMoto / cotizacionTablaMoto):
 * - URL: /u/cotizar/motovehiculo (sin popup de compañías ni #csm__logo-N).
 * - Compañías: tiles `.QuotationSidebar__companyTile` (activa = `is-active`).
 * - Combos sin aria-label: usar IDs `select_*` / `number_*` / `date_*` / `input_*`.
 * - Config avanzada inline por compañía (no modal).
 * - Filas de cobertura: `.ctrowAuto` (ya no `.ctrow__container`).
 * - Emitir: `#emitirButton_{id}` (Sancor visto: 1, 3, 17, 5).
 * - Extra: `.extraCoverages-container` + "Ver más" / "Solicitar".
 * - Pago CBU: `#input_infoDePago.numeroCbu` (igual que auto).
 * - Detalle moto: `#input_motovehiculo.patente|motor|chasis` (antes `#motovehiculo.*`).
 */
export default class NuevosSelectoresMoto {
    readonly page: Page;

    readonly sidebarProductos: Locator;
    readonly motoShowcaseCard: Locator;
    readonly sidebarMotoSubmenu: Locator;

    readonly sancorTile: Locator;
    readonly rusTile: Locator;
    readonly rivadaviaTile: Locator;
    readonly atmTile: Locator;

    readonly marcaSelector: Locator;
    readonly marcaHidden: Locator;
    readonly anioSelector: Locator;
    readonly anioHidden: Locator;
    readonly versionSelector: Locator;
    readonly versionHidden: Locator;
    readonly ceroKmSelector: Locator;
    readonly ceroKmHidden: Locator;
    readonly accesoriosInput: Locator;

    readonly tipoPersona: Locator;
    readonly sitImpositiva: Locator;
    readonly codPostal: Locator;
    readonly provincia: Locator;
    readonly localidad: Locator;
    readonly noSeCodigoLink: Locator;

    readonly sancorVigencia: Locator;
    readonly sancorFechaCotizacion: Locator;
    readonly sancorSumaAsegurada: Locator;
    readonly sancorUsoVehiculo: Locator;

    readonly atmAlarma: Locator;
    readonly atmVigencia: Locator;
    readonly atmFormaPago: Locator;
    readonly atmFacturacion: Locator;
    readonly atmCuotas: Locator;
    readonly atmAjusteAuto: Locator;

    readonly rivadaviaGrua: Locator;
    readonly rivadaviaAjusteAuto: Locator;
    readonly rivadaviaInicioVigencia: Locator;
    readonly rivadaviaFacturacion: Locator;
    readonly rivadaviaCuotas: Locator;
    readonly rivadaviaUsoVehiculo: Locator;

    readonly siguienteBtn: Locator;
    readonly atrasBtn: Locator;
    readonly cotizarBtn: Locator;
    readonly aplicarCambiosBtn: Locator;
    readonly configAvanzadaHeading: Locator;

    readonly volverCotizacionBtn: Locator;
    readonly vehicleTitle: Locator;
    readonly compararBtn: Locator;
    readonly coberturaRows: Locator;
    readonly extraCoverages: Locator;
    readonly extraCoveragesVerMas: Locator;
    readonly emitirButtons: Locator;
    readonly agregarBtn: Locator;
    readonly verDetallesBtn: Locator;

    readonly vigenciaDesde: Locator;
    readonly vigenciaHasta: Locator;
    readonly formaDePago: Locator;
    readonly numeroCbu: Locator;
    readonly resumenCoberturaBtn: Locator;
    readonly cambiarCoberturaBtn: Locator;

    readonly nosisInput: Locator;
    readonly buscarClienteBtn: Locator;
    readonly completarManualBtn: Locator;
    readonly nuevoClienteBtn: Locator;
    readonly clienteTipoPersona: Locator;
    readonly clienteNombre: Locator;
    readonly clienteApellido: Locator;
    readonly clienteSexo: Locator;
    readonly clienteDni: Locator;
    readonly clienteCuit: Locator;
    readonly clienteFechaNacimiento: Locator;
    readonly clienteCalle: Locator;
    readonly clienteNumero: Locator;
    readonly clienteCodigoPostal: Locator;
    readonly clienteProvincia: Locator;
    readonly clienteLocalidad: Locator;
    readonly clienteEmail: Locator;
    readonly clienteTelefono: Locator;
    readonly clienteSitImpositiva: Locator;
    readonly clienteRol: Locator;

    readonly patenteInput: Locator;
    readonly motorInput: Locator;
    readonly chasisInput: Locator;

    readonly inspeccionDropzone: Locator;
    readonly emitirFinalBtn: Locator;

    readonly recotizarBtn: Locator;
    readonly emitirDashboardBtn: Locator;

    constructor(page: Page) {
        this.page = page;

        this.sidebarProductos = page.locator('#Sidebar-products');
        this.motoShowcaseCard = page.locator('button.--showcase').filter({ hasText: 'MOTOVEHICULO' });
        this.sidebarMotoSubmenu = page.locator('#Sidebar-Motovehículo-container');

        this.sancorTile = page.locator('.QuotationSidebar__companyTile').filter({ hasText: 'Sancor' });
        this.rusTile = page.locator('.QuotationSidebar__companyTile').filter({ hasText: 'RUS' });
        this.rivadaviaTile = page.locator('.QuotationSidebar__companyTile').filter({ hasText: 'Rivadavia' });
        this.atmTile = page.locator('.QuotationSidebar__companyTile').filter({ hasText: 'ATM' });

        this.marcaSelector = page.locator('[id="select_motovehiculo.marca"]');
        this.marcaHidden = page.locator('input[name="motovehiculo.marca"]');
        this.anioSelector = page.locator('[id="select_motovehiculo.anio"]');
        this.anioHidden = page.locator('input[name="motovehiculo.anio"]');
        this.versionSelector = page.locator('[id="select_motovehiculo.version"]');
        this.versionHidden = page.locator('input[name="motovehiculo.version"]');
        this.ceroKmSelector = page.locator('[id="select_motovehiculo.esCeroKm"]');
        this.ceroKmHidden = page.locator('input[name="motovehiculo.esCeroKm"]');
        this.accesoriosInput = page.locator('[id="number_motovehiculo.sumaAseguradaAdicional"]');

        this.tipoPersona = page.locator('[id="select_tipoPersona"]');
        this.sitImpositiva = page.locator('[id="dependant_situacionImpositiva"]');
        this.codPostal = page.locator('[id="number_codigoPostal"]');
        this.provincia = page.locator('[id="select_idProvincia"]');
        this.localidad = page.locator('[id="select_codigosLocalidad"]');
        this.noSeCodigoLink = page.getByText('No sé mi código');

        this.sancorVigencia = page.locator('[id="select_configuracionAvanzada.Sancor.vigencia"]');
        this.sancorFechaCotizacion = page.locator('[id="date_configuracionAvanzada.Sancor.fechaCotizacion"]');
        this.sancorSumaAsegurada = page.locator('[id="number_configuracionAvanzada.Sancor.sumaAseguradaVehiculo"]');
        this.sancorUsoVehiculo = page.locator('[id="select_configuracionAvanzada.Sancor.usoVehiculo"]');

        this.atmAlarma = page.locator('[id="configuracionAvanzada.ATM.alarma"]');
        this.atmVigencia = page.locator('[id="select_configuracionAvanzada.ATM.tipoVigencia"]');
        this.atmFormaPago = page.locator('[id="dependant_configuracionAvanzada.ATM.formaDePago"]');
        this.atmFacturacion = page.locator('[id="dependant_configuracionAvanzada.ATM.facturacion"]');
        this.atmCuotas = page.locator('[id="dependant_configuracionAvanzada.ATM.cuotas"]');
        this.atmAjusteAuto = page.locator('[id="select_configuracionAvanzada.ATM.ajusteAutomatico"]');

        this.rivadaviaGrua = page.locator('[id="configuracionAvanzada.Rivadavia.grua"]');
        this.rivadaviaAjusteAuto = page.locator('[id="dependant_configuracionAvanzada.Rivadavia.ajusteAutomatico"]');
        this.rivadaviaInicioVigencia = page.locator('[id="date_configuracionAvanzada.Rivadavia.fechaCotizacion"]');
        this.rivadaviaFacturacion = page.locator('[id="select_configuracionAvanzada.Rivadavia.facturacion"]');
        this.rivadaviaCuotas = page.locator('[id="dependant_configuracionAvanzada.Rivadavia.cuotas"]');
        this.rivadaviaUsoVehiculo = page.locator('[id="select_configuracionAvanzada.Rivadavia.usoVehiculo"]');

        this.siguienteBtn = page.getByRole('button', { name: /siguiente/i });
        this.atrasBtn = page.getByRole('button', { name: /atrás/i });
        this.cotizarBtn = page.getByRole('button', { name: 'COTIZAR' });
        this.aplicarCambiosBtn = page.getByRole('button', { name: 'Aplicar cambios' });
        this.configAvanzadaHeading = page.getByRole('heading', { name: 'Configuración avanzada' });

        this.volverCotizacionBtn = page.getByRole('button', { name: 'Volver a la cotización' });
        this.vehicleTitle = page.getByRole('heading', { name: /BENELLI|Motovehículo/i }).first();
        this.compararBtn = page.locator('.CotizacionTable__compareButton');
        this.coberturaRows = page.locator('.ctrowAuto');
        this.extraCoverages = page.locator('.extraCoverages-container');
        this.extraCoveragesVerMas = page.locator('.extraCoverages__button');
        this.emitirButtons = page.locator('[id^="emitirButton_"]');
        this.agregarBtn = page.getByRole('button', { name: 'Agregar' });
        this.verDetallesBtn = page.getByRole('button', { name: 'Ver detalles' });

        this.vigenciaDesde = page.locator('[id="date_vigenciaDesde"]');
        this.vigenciaHasta = page.locator('[id="dependant_vigenciaHasta"]');
        this.formaDePago = page.locator('[id="select_infoDePago.formaDePago"]');
        this.numeroCbu = page.locator('[id="input_infoDePago.numeroCbu"]');
        this.resumenCoberturaBtn = page.getByRole('button', { name: 'Resumen de cobertura' });
        this.cambiarCoberturaBtn = page.getByRole('button', { name: 'Cambiar' });

        this.nosisInput = page.getByRole('textbox', { name: /DNI o CUIT/i });
        this.buscarClienteBtn = page.getByRole('button', { name: /^Buscar$/ });
        this.completarManualBtn = page.getByRole('button', { name: 'Completar datos manualmente' });
        this.nuevoClienteBtn = page.getByRole('button', { name: 'Nuevo cliente' });
        this.clienteTipoPersona = page.locator('[id="select_clientes.0.tipoPersona"]');
        this.clienteNombre = page.locator('[id="input_clientes.0.nombre"]');
        this.clienteApellido = page.locator('[id="input_clientes.0.apellido"]');
        this.clienteSexo = page.locator('[id="select_clientes.0.sexo"]');
        this.clienteDni = page.locator('[id="input_clientes.0.dni"]');
        this.clienteCuit = page.locator('[id="dependant_clientes.0.cuit"]');
        this.clienteFechaNacimiento = page.locator('[id="date_clientes.0.fechaNacimiento"]');
        this.clienteCalle = page.locator('[id="input_clientes.0.calle"]');
        this.clienteNumero = page.locator('[id="input_clientes.0.numero"]');
        this.clienteCodigoPostal = page.locator('[id="number_clientes.0.codigoPostal"]');
        this.clienteProvincia = page.locator('[id="select_clientes.0.idProvincia"]');
        this.clienteLocalidad = page.locator('[id="select_clientes.0.codigosLocalidad"]');
        this.clienteEmail = page.locator('[id="input_clientes.0.email"]');
        this.clienteTelefono = page.locator('[id="phone_clientes.0.telefono"]');
        this.clienteSitImpositiva = page.locator('[id="dependant_clientes.0.situacionImpositiva"]');
        this.clienteRol = page.locator('[id="select_clientes.0.rol"]');

        this.patenteInput = page.locator('[id="input_motovehiculo.patente"]');
        this.motorInput = page.locator('[id="input_motovehiculo.motor"]');
        this.chasisInput = page.locator('[id="input_motovehiculo.chasis"]');

        this.inspeccionDropzone = page.locator('.mantine-Dropzone-root input[type="file"]');
        this.emitirFinalBtn = page.getByRole('button', { name: /^Emitir$/ });

        this.recotizarBtn = page.getByText('RECOTIZAR').first();
        this.emitirDashboardBtn = page.getByText('EMITIR').first();
    }

    getOptionLocator(option: string): Locator {
        return this.page.getByRole('option', { name: option, exact: true });
    }

    getCompanyTile(company: string): Locator {
        const map: Record<string, Locator> = {
            sancor: this.sancorTile,
            rus: this.rusTile,
            rivadavia: this.rivadaviaTile,
            atm: this.atmTile,
        };
        const tile = map[company.toLowerCase()];
        if (!tile) throw new Error(`Compañía desconocida: ${company}`);
        return tile;
    }

    getEmitirButton(coverageId: string): Locator {
        return this.page.locator(`#emitirButton_${coverageId}`);
    }

    async selectDropdownOption(dropdown: Locator, optionText: string) {
        const current = await dropdown.inputValue().catch(() => '');
        if (current && current.toLowerCase() === optionText.toLowerCase()) return;

        await dropdown.click();
        if (await dropdown.isEditable().catch(() => false)) {
            await dropdown.fill(optionText);
        }
        await this.getOptionLocator(optionText).or(
            this.page.getByRole('option', { name: optionText })
        ).first().click();
    }
}
