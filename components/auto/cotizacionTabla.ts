import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";
import { get } from "http";


export default class CotizacionTabla {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly cboxDescAdicional: Locator;
    readonly cboxTextDescAdicional: Locator;
    readonly descuentoPointer: Locator;
    readonly descuentoBar0: Locator;
    readonly descuentoBar10: Locator;
    readonly descuentoBar15: Locator;
    readonly descuentoBar20: Locator;
    readonly descuentoBar25: Locator;
    readonly descuentoBar30: Locator;
    readonly descuentoBar35: Locator;
    readonly aceptarYHabilitarBtn: Locator;
    readonly configAvanzadaBtn: Locator;
    readonly rivaCard: Locator;
    readonly fedPatCard: Locator;
    readonly fechaVigencia: Locator;
    readonly sumaAsegurada: Locator;
    readonly sumaAseguradaFieldError: Locator;
    readonly sumaAseguradaEsperaPlaceholder: Locator;
    readonly tipoVehiculoFedPatEspera: Locator;
    // POL-2871 / Gap D3: ATMAdvanceConfig.js pasó "alarma" de readOnly a disabled.
    readonly alarmaAtmCheckbox: Locator;
    readonly aplicarCambiosBtn: Locator;
    readonly companyTile: (name: string) => Locator;
    readonly usoVehiculo: Locator;
    readonly facturacion: Locator;
    readonly formaPago: Locator;
    readonly ajusteAutomatico: Locator;
    readonly cuotas: Locator;
    readonly ajusteRiva: Locator;
    readonly descFedPatCbox: Locator;
    readonly multFranquiciasCbox: Locator;
    readonly infoBtn: Locator;
    readonly carritoBtn: Locator;
    readonly sancorRow: Locator;
    readonly rivaRow: Locator;
    readonly zurichRow: Locator;
    readonly expertaRow: Locator;
    readonly fedPatRow: Locator;
    readonly atmRow: Locator;
    readonly rusRow: Locator;
    readonly triunfoRow: Locator;
    readonly mercantilAndinaRow: Locator;
    readonly mercantilAndinaCarritoRow: Locator;
    readonly triunfoCarritoRow: Locator;
    readonly sancorCarritoRow: Locator;
    readonly rivaCarritoRow: Locator;
    readonly zurichCarritoRow: Locator;
    readonly fedPatCarritoRow: Locator;
    readonly atmCarritoRow: Locator;
    readonly rusCarritoRow: Locator;
    readonly emitirSancor: Locator;
    readonly emitirRiva: Locator;
    readonly emitirExperta: Locator;
    readonly emitirFedPat: Locator;
    readonly emitirZurich: Locator;
    readonly emitirAtm: Locator;
    readonly emitirRus: Locator;
    readonly emitirTriunfo: Locator;
    readonly emitirMercantilAndina: Locator;
    readonly formaPagoSiguiente: Locator;
    readonly companiasMap: { [key: string]: Locator };
    readonly companiasRowsMap: { [key: string]: Locator };
    readonly btnPlusMap: { [key: string]: Locator };
    readonly carritoRowsMap: { [key: string]: Locator };
    readonly cotizacionErrorText: Locator;
    readonly btnPlus: Locator;
    readonly btnComparar: Locator;
    readonly descargarPdfBtn: Locator;
    readonly verMasBtn: Locator;
    readonly btnPlusSancor: Locator;
    readonly btnPlusRiva: Locator;
    readonly btnPlusExperta: Locator;
    readonly btnPlusFedPat: Locator;
    readonly btnPlusZurich: Locator;
    readonly btnPlusAtm: Locator;
    readonly btnPlusRus: Locator;
    readonly btnPlusTriunfo: Locator;
    readonly btnPlusMercantilAndina: Locator;
    readonly btnAtrasCompararBtn: Locator;
    readonly mercantilAndinaMobile: Locator;
    private readonly MERCANTIL_ANDINA_CODIGO = "923B1";
    private readonly MERCANTIL_ANDINA_CODIGO_NUMERICO = "923";
    readonly btnCompararMobileMA: Locator;
    readonly btnCompararMobile: Locator;
    /** POL-2899: checkbox Grúa en config avanzada Rivadavia */
    readonly gruaRivadaviaCheckbox: Locator;
    /** Ícono "i" del popup Servicio de grúa (junto al checkbox) */
    readonly gruaRivadaviaInfoBtn: Locator;
    readonly gruaRivadaviaPopupTitle: Locator;
    readonly tagNoIncluyeGrua: Locator;
    readonly tagFueraDePauta: Locator;
    readonly asistenciaAlVehiculoLabel: Locator;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        // El drawer "Compará coberturas" tiene su propio botón de cierre; se cae al
        // "primer botón de la página" solo si ese drawer no está presente.
        this.btnAtrasCompararBtn = page.locator('.CoverageComparison__drawerCloseButton').or(page.getByRole('button').first());
        this.cboxDescAdicional = page.getByRole('checkbox', { name: '¿Necesitás un descuento' });
        this.cboxTextDescAdicional = page.getByText('¿Necesitás un descuento adicional?', { exact: true });
        this.descuentoPointer = page.getByRole('slider');
        this.descuentoBar0 = page.getByText('0%', { exact: true });
        this.descuentoBar10 = page.getByText("10%");
        this.descuentoBar15 = page.getByText("15%");
        this.descuentoBar20 = page.getByText("20%");
        this.descuentoBar30 = page.getByText("30%");
        this.descuentoBar25 = page.getByText("25%");
        this.descuentoBar35 = page.getByText("35%");
        this.aceptarYHabilitarBtn = page.getByRole('button', { name: 'ACEPTAR Y HABILITAR' });
        this.rivaCard = page.locator('#Capa_1').nth(1);
        this.fedPatCard = page.locator('#Capa_1').nth(2);
        this.configAvanzadaBtn = page.getByText('Configuración avanzada', { exact: true });
        this.fechaVigencia = page.getByRole('textbox', { name: 'dd/mm/yyyy' });
        // Nested Formik: el NumberInput no expone name accesible ni #number_sumaAseguradaVehiculo.
        // El label "Suma asegurada vehículo*" es hermano del textbox, ambos dentro del wrapper
        // leaf de Mantine (.field__wrapper.mantine-Input-wrapper.mantine-NumberInput-wrapper).
        // Usar ese wrapper (no un `div` genérico) evita matchear divs ancestro más amplios que
        // contienen otros inputs hermanos (ej. fechaCotizacion) y rompen el modo strict.
        // POL-2871 / sidebar: id = number_configuracionAvanzada.<Company>.sumaAseguradaVehiculo
        this.sumaAsegurada = page
            .locator('[id^="number_configuracionAvanzada."][id$=".sumaAseguradaVehiculo"]')
            .or(
                page
                    .locator('.field__wrapper.mantine-Input-wrapper.mantine-NumberInput-wrapper')
                    .filter({ has: page.getByText('Suma asegurada vehículo*', { exact: true }) })
                    .getByRole('textbox')
            )
            .or(page.locator('input[name="sumaAseguradaVehiculo"]'))
            .or(page.locator('#number_sumaAseguradaVehiculo'));
        this.sumaAseguradaFieldError = page.locator('[id^="configuracionAvanzada."][id$=".sumaAseguradaVehiculo-error"]');
        this.sumaAseguradaEsperaPlaceholder = page.getByPlaceholder('En espera de cotización');
        this.tipoVehiculoFedPatEspera = page.locator('#select_configuracionAvanzada\\.Federacion_Patronal\\.tipoVehiculo');
        this.alarmaAtmCheckbox = page.locator('[id="configuracionAvanzada.ATM.alarma"]').or(page.getByRole('checkbox', { name: 'Alarma' }));
        this.aplicarCambiosBtn = page.getByRole('button', { name: /^aplicar cambios$/i });
        this.companyTile = (name: string) => page.getByRole('button', { name, exact: true });
        this.usoVehiculo = page.locator('[id^="select_configuracionAvanzada."][id$=".usoVehiculo"]')
        this.facturacion = page.locator('[id^="select_configuracionAvanzada."][id$=".facturacion"]').or(page.locator('[id^="dependant_configuracionAvanzada."][id$=".facturacion"]'));
        this.formaPago = page.locator('[id*="formaDePago"]').or(page.locator('#select_formaDePago'));
        // POL-cotizarAutoIA: verificado en vivo que el prefijo del id varía por aseguradora
        // (Rivadavia usa "dependant_", pero RUS/ATM/Triunfo/Mercantil Andina usan "select_"),
        // así que se matchea por "contains" en vez de anclar un solo prefijo.
        this.ajusteAutomatico = page.locator('[id*="configuracionAvanzada."][id$=".ajusteAutomatico"]')
        // Usa .or() para fallback: intenta #dependant_cuotas, si no existe usa #select_cuotas
        this.cuotas = page.locator('[id^="dependant_configuracionAvanzada."][id$=".cuotas"]')
        this.descFedPatCbox = page.getByRole('checkbox', { name: 'Descuento cliente nuevo' });
        this.multFranquiciasCbox = page.getByRole('checkbox', { name: 'Multiples franquicias' })
        this.infoBtn = page.locator('#infoIcon_16 circle');
        this.carritoBtn = page.getByRole('button', { name: 'COMPARAR' });
        // Locators específicos sin fallback - se usarán con lógica de prioridad
        this.sancorRow = page.getByText("12Auto").getByText("$").or(page.getByText("Auto Premium Max (c/Asistencia)12Ver detalles$"));
        this.rivaRow = page.getByText("MMEGA PLAN").getByText("$").or(page.getByText("MVer detalles$").getByText("$"));
        this.zurichRow = page.getByText("CG TERCEROS COMPLETO PREMIUM GRANIZO").getByText("$").or(page.getByText("CGVer detalles$").getByText("$"));
        this.expertaRow = page.getByText("942Terceros Completos").getByText("$");
        this.fedPatRow = page.getByText("CFTerceros Completo Premium").getByText("$").or(page.getByText("CFVer detalles$").getByText("$"));
        this.atmRow = page.getByText("C2C Premium").getByText("$").or (page.getByText("C premium (C2)C2Ver detalles$").getByText("$"));
        this.rusRow = page.getByText("S0Sigma Cero").getByText("$").or(page.locator('.coverageList__table > div:nth-child(4)').getByText("$"));;
        // Nota: Triunfo puede mostrar códigos variables (C8C8, C8, B, etc.) según el plan
        // Si no encuentra este locator específico, usará el fallback automático
        this.triunfoRow = page.getByText("C8C8").getByText("$").or (page.getByText('C8C8Ver detalles$').getByText("$"));
        // Rediseño de la tabla de cotización: cada plan es una tarjeta ".ctrowAuto" con
        // código (".ctrowAuto__code"), nombre (".ctrowAuto__name") y precio (".ctrowAuto__price")
        // como elementos hermanos (ya no concatenados en un solo texto "923B1$...").
        this.mercantilAndinaRow = this.getMercantilAndinaCard()
            .locator('.ctrowAuto__price')
            .or(page.getByText("923B1").getByText("$"))
            .or(page.getByText('B1923Ver detalles$').getByText("$"));

        // Drawer "Compará coberturas": cada ítem es ".CoverageComparison__drawerItem" con
        // código (".CoverageComparison__drawerCode") y precio (".CoverageComparison__drawerPrice").
        this.mercantilAndinaCarritoRow = page.locator('.CoverageComparison__drawerItem')
            .filter({ has: page.locator('.CoverageComparison__drawerCode', { hasText: new RegExp(`^${this.MERCANTIL_ANDINA_CODIGO_NUMERICO}$`) }) })
            .locator('.CoverageComparison__drawerPrice')
            .or(page.getByText("B1$").last());
        // Flujo Mobile MA ------------------------------------------------------------
        this.mercantilAndinaMobile = page.getByText(`${this.MERCANTIL_ANDINA_CODIGO}Ver`).getByText("$");
        this.btnCompararMobileMA = page.locator('#listedIcon_923');
        this.triunfoCarritoRow = page.getByText('C8$').getByText("$").last();
        this.sancorCarritoRow = page.getByRole('button', { name: '12 Auto Premium Max (c/' }).getByText("$").last();
        this.rivaCarritoRow = page.getByText('Mega Plan$').getByText("$").last();
        this.zurichCarritoRow = page.getByRole('button', { name: 'CG Terceros Completo Premium' }).getByText("$");
        this.fedPatCarritoRow = page.getByText('Terceros Completo Premium$').getByText("$").last();
        this.atmCarritoRow = page.getByText('C Premium (C2)$').getByText("$").last();
        this.rusCarritoRow = page.getByText('Sigma Cero$').getByText("$").last();
        this.carritoRowsMap = {
            'sancor': this.sancorCarritoRow,
            'rus': this.rusCarritoRow,
            'zurich': this.zurichCarritoRow,
            'federacion_patronal': this.fedPatCarritoRow,
            'rivadavia': this.rivaCarritoRow,
            'atm': this.atmCarritoRow,
            'triunfo': this.triunfoCarritoRow,
            'mercantil_andina': this.mercantilAndinaCarritoRow,
        };

        // Locators específicos de botones sin fallback
        this.btnPlusSancor = page.locator('div:nth-child(6) > .mantine-Grid-root > div > .new__ctrow__icon__plus > g > path').first().or(this.sancorRow.getByRole('button', { name: 'Agregar' }));
        this.btnPlusRiva = page.locator('div:nth-child(8) > .mantine-Grid-root > div > .new__ctrow__icon__plus > g > path').first().or(this.rivaRow.getByRole('button', { name: 'Agregar' }));
        //this.btnPlusExperta = page.locator('div:nth-child() > .mantine-Grid-root > div > .new__ctrow__icon__plus > g > path').first()
        this.btnPlusFedPat = page.locator('div:nth-child(4) > .mantine-Grid-root > div > .new__ctrow__icon__plus > g > path').first().or(this.fedPatRow.getByRole('button', { name: 'Agregar' }));
        this.btnPlusZurich = this.zurichRow.getByRole('button', { name: 'Agregar' });
        this.btnPlusAtm = page.locator('div:nth-child(10) > .mantine-Grid-root > div > .new__ctrow__icon__plus > g > path').first().or(this.atmRow.getByRole('button', { name: 'Agregar' }));
        this.btnPlusRus = page.locator('div:nth-child(6) > .mantine-Grid-root > div > .new__ctrow__icon__plus > g > path').first().or(this.rusRow.getByRole('button', { name: 'Agregar' }));
        this.btnPlusTriunfo = page.locator('div:nth-child(9) > .mantine-Grid-root > div > .new__ctrow__icon__plus > g > path').first().or(this.triunfoRow.getByRole('button', { name: 'Agregar' }));
        this.btnPlusMercantilAndina = this.getMercantilAndinaCard()
            .locator('.ctrowAuto__addButton')
            .or(page.locator('div:nth-child(4) > .mantine-Grid-root > div > .new__ctrow__icon__plus > g > path').first())
            .or(this.mercantilAndinaRow.getByRole('button', { name: 'Agregar' }));
        this.btnPlusMap = {
            'sancor': this.btnPlusSancor,
            'rivadavia': this.btnPlusRiva,
            'federacion_patronal': this.btnPlusFedPat,
            'zurich': this.btnPlusZurich,
            'atm': this.btnPlusAtm,
            'rus': this.btnPlusRus,
            'triunfo': this.btnPlusTriunfo,
            'mercantil_andina': this.btnPlusMercantilAndina,
        };
        this.emitirSancor = page.locator('#emitirButton_12');
        this.emitirRiva = page.locator('#emitirButton_M');
        this.emitirExperta = page.locator('#emitirButton_942');
        this.emitirFedPat = page.locator('#emitirButton_CF');
        this.emitirZurich = page.locator('#emitirButton_CG');
        this.emitirAtm = page.locator('#emitirButton_C2');
        this.emitirRus = page.locator('#emitirButton_S0');
        this.emitirTriunfo = page.locator('#emitirButton_C8');
        this.emitirMercantilAndina = page.locator('#emitirButton_923');
        this.formaPagoSiguiente = page.locator('[id="select_infoDePago.formaDePago"]');
        this.companiasMap = {
            'sancor': this.emitirSancor,
            'rus': this.emitirRus,
            'zurich': this.emitirZurich,
            'federacion_patronal': this.emitirFedPat, // Clave para 'fedpat'
            'experta': this.emitirExperta,
            'rivadavia': this.emitirRiva, // Clave para 'riva'
            'atm': this.emitirAtm,
            'triunfo': this.emitirTriunfo,
            'mercantil_andina': this.emitirMercantilAndina
        };
        this.companiasRowsMap = {
            'sancor': this.sancorRow,
            'rus': this.rusRow,
            'zurich': this.zurichRow,
            'federacion_patronal': this.fedPatRow, // Clave para 'fedpat'
            'experta': this.expertaRow,
            'rivadavia': this.rivaRow, // Clave para 'riva'
            'atm': this.atmRow,
            'triunfo': this.triunfoRow,
            'mercantil_andina': this.mercantilAndinaRow
        };

        this.cotizacionErrorText = page.locator('.automotor__cotSuccess__errorIcon');
        this.btnComparar = page.getByRole('button', { name: 'COMPARAR' }).first();
        this.btnCompararMobile = page.locator('div').filter({ hasText: /^COMPARAR$/ }).getByText("COMPARAR")
        this.descargarPdfBtn = page.getByRole('button', { name: 'DESCARGAR PDF' });
        this.verMasBtn = page.getByRole('button', { name: '¿Necesitás una cobertura' });

        // POL-2899 — Grúa Rivadavia (config avanzada + tags en tabla)
        this.gruaRivadaviaCheckbox = page.getByRole('checkbox', { name: /Gr[uú]a/i });
        this.gruaRivadaviaInfoBtn = page
            .locator('.mantine-Checkbox-root')
            .filter({ hasText: /Gr[uú]a/i })
            .locator('.InfoButton')
            .or(page.locator('.InfoButton').filter({ has: page.locator('xpath=ancestor::*[contains(., "Grúa") or contains(., "Grua")]') }));
        this.gruaRivadaviaPopupTitle = page.locator('h1.csm__title').filter({ hasText: /Servicio de gr[uú]a/i });
        this.tagNoIncluyeGrua = page.getByText('No incluye grúa', { exact: true });
        this.tagFueraDePauta = page.getByText('Fuera de pauta', { exact: true });
        this.asistenciaAlVehiculoLabel = page.getByText('Asistencia al vehículo', { exact: true });
    }

    /** Tarjeta de cobertura por código o nombre (tabla rediseño `.ctrowAuto`). */
    coverageCard(match: string | RegExp): Locator {
        return this.page.locator('.ctrowAuto').filter({ hasText: match });
    }

    async openConfigAvanzada(): Promise<void> {
        await this.configAvanzadaBtn.click();
        await this.gruaRivadaviaCheckbox.waitFor({ state: 'visible', timeout: 30000 });
    }

    /** Abre el sidebar de config avanzada sin asumir campos de Rivadavia (p. ej. FedPat). */
    async openConfigAvanzadaSidebar(): Promise<void> {
        await this.configAvanzadaBtn.click();
        await this.aplicarCambiosBtn.waitFor({ state: 'visible', timeout: 30000 });
    }

    async setGruaRivadavia(checked: boolean): Promise<void> {
        const box = this.gruaRivadaviaCheckbox;
        await box.waitFor({ state: 'visible', timeout: 15000 });
        const isChecked = await box.isChecked();
        if (isChecked !== checked) {
            await box.click();
        }
        await expect(box).toBeChecked({ checked });
    }

    async applyAdvancedChangesAndWait(): Promise<void> {
        await expect(this.aplicarCambiosBtn).toBeEnabled({ timeout: 10000 });
        await this.aplicarCambiosBtn.click();
        await expect(this.page.getByText('Suma asegurada:', { exact: true })).toBeVisible({ timeout: 180000 });
    }

    /**
     * Tarjeta de la cobertura B1/923 de Mercantil Andina en la tabla de cotización
     * (".ctrowAuto"), identificada por su código (".ctrowAuto__code") en vez de por
     * texto concatenado, ya que el rediseño separó código/nombre/precio en elementos hermanos.
     */
    private getMercantilAndinaCard(): Locator {
        return this.page.locator('.ctrowAuto').filter({
            has: this.page.locator('.ctrowAuto__code', { hasText: new RegExp(`^${this.MERCANTIL_ANDINA_CODIGO_NUMERICO}$`) })
        });
    }

    /**
     * Obtiene el locator de fila con prioridad: primero intenta el específico, si no existe usa el fallback
     */
    private async getRowLocatorWithFallback(compania: string): Promise<Locator> {
        console.log(`[getRowLocatorWithFallback] INICIO - Compañía: ${compania} - Timestamp: ${new Date().toISOString()}`);
        
        const companiaLower = compania.toLowerCase();
        console.log(`[getRowLocatorWithFallback] Compañía normalizada: ${companiaLower}`);
        
        console.log(`[getRowLocatorWithFallback] Obteniendo specificLocator del map...`);
        const specificLocator = this.companiasRowsMap[companiaLower];
        console.log(`[getRowLocatorWithFallback] specificLocator obtenido: ${specificLocator ? 'EXISTE' : 'NO EXISTE'}`);

        if (!specificLocator) {
            console.error(`[getRowLocatorWithFallback] ERROR - Compañía desconocida: ${compania}`);
            throw new Error(`Compañía desconocida: ${compania}`);
        }

        // Intenta el locator específico primero
        console.log(`[getRowLocatorWithFallback] Iniciando count() en specificLocator... - Timestamp: ${new Date().toISOString()}`);
        const startCountTime = Date.now();
        const count = await specificLocator.count();
        const countDuration = Date.now() - startCountTime;
        console.log(`[getRowLocatorWithFallback] count() completado en ${countDuration}ms - Resultado: ${count}`);
        
        if (count > 0) {
            console.log(`[getRowLocatorWithFallback] ✓ Usando locator específico de fila para ${compania} - Timestamp: ${new Date().toISOString()}`);
            return specificLocator;
        }

        // Fallback: buscar el texto del precio directamente
        console.log(`[getRowLocatorWithFallback] ⚠ Locator específico de fila no encontrado para ${compania}, usando fallback - Timestamp: ${new Date().toISOString()}`);

        // Estrategia de fallback: buscar el precio dentro del contenedor de la fila de cotización
        // Excluir valores como "$0" o "$ 0" que aparecen en otros lugares de la página
        console.log(`[getRowLocatorWithFallback] Construyendo fallbackLocator... - Timestamp: ${new Date().toISOString()}`);
        
        // Buscar dentro del contenedor de la fila de cotización
        const containerCount = await this.page.locator('.ctrow__container').count();
        console.log(`[getRowLocatorWithFallback] Contenedores .ctrow__container encontrados: ${containerCount}`);
        
        let fallbackLocator: Locator;
        let fallbackCount = 0;
        
        if (containerCount > 0) {
            // Buscar el precio dentro del contenedor, excluyendo "$0" y "$ 0"
            // El precio de cotización siempre será mayor a 0
            fallbackLocator = this.page
                .locator('.ctrow__container')
                .first()
                .getByText(/\$\s*[1-9][\d.,]*/); // Busca $ seguido de un número que empiece con 1-9 (excluye 0)
            
            console.log(`[getRowLocatorWithFallback] fallbackLocator (con contenedor, excluyendo $0) construido - Timestamp: ${new Date().toISOString()}`);
            
            const startContainerCountTime = Date.now();
            fallbackCount = await fallbackLocator.count();
            const containerCountDuration = Date.now() - startContainerCountTime;
            console.log(`[getRowLocatorWithFallback] count() en fallbackLocator (con contenedor) completado en ${containerCountDuration}ms - Resultado: ${fallbackCount}`);
            
            // Si no encuentra con el patrón que excluye 0, intentar buscar todos los precios y filtrar
            if (fallbackCount === 0) {
                console.log(`[getRowLocatorWithFallback] No se encontró precio con patrón excluyendo $0, intentando búsqueda alternativa... - Timestamp: ${new Date().toISOString()}`);
                
                // Buscar todos los precios dentro del contenedor
                const allPricesInContainer = this.page
                    .locator('.ctrow__container')
                    .first()
                    .getByText(/\$[\d.,]+/);
                
                const allPricesCount = await allPricesInContainer.count();
                console.log(`[getRowLocatorWithFallback] Total de precios encontrados en contenedor: ${allPricesCount}`);
                
                // Si hay precios, tomar el que no sea "$0" o "$ 0"
                if (allPricesCount > 0) {
                    for (let i = 0; i < allPricesCount; i++) {
                        const priceText = await allPricesInContainer.nth(i).textContent();
                        console.log(`[getRowLocatorWithFallback] Precio encontrado [${i}]: "${priceText}"`);
                        
                        // Verificar que no sea "$0" o "$ 0" o similar
                        if (priceText && !/^\$\s*0(?:[.,]0+)?$/.test(priceText.trim())) {
                            fallbackLocator = allPricesInContainer.nth(i);
                            fallbackCount = 1;
                            console.log(`[getRowLocatorWithFallback] Usando precio válido: "${priceText}"`);
                            break;
                        }
                    }
                }
            }
        } else {
            // Si no hay contenedor, buscar directamente pero excluyendo "$0"
            console.log(`[getRowLocatorWithFallback] No hay contenedores .ctrow__container, buscando precio global (excluyendo $0)... - Timestamp: ${new Date().toISOString()}`);
            
            const allPriceElements = this.page.getByText(/\$\s*[1-9][\d.,]*/);
            fallbackCount = await allPriceElements.count();
            console.log(`[getRowLocatorWithFallback] Precios encontrados (excluyendo $0): ${fallbackCount}`);
            
            if (fallbackCount > 0) {
                fallbackLocator = allPriceElements.first();
            }
        }

        if (fallbackCount === 0) {
            console.error(`[getRowLocatorWithFallback] ERROR - No se encontró ninguna cotización visible para ${compania} - Timestamp: ${new Date().toISOString()}`);
            // Log adicional para debugging: verificar qué elementos de precio existen
            try {
                const debugPrices = await this.page.getByText('$').count();
                console.error(`[getRowLocatorWithFallback] DEBUG - Elementos con '$' encontrados en la página: ${debugPrices}`);
            } catch (e) {
                console.error(`[getRowLocatorWithFallback] DEBUG - Error al buscar elementos con '$': ${e}`);
            }
            throw new Error(`No se encontró ninguna cotización visible para ${compania}. Verifica que la cotización se haya completado correctamente.`);
        }

        console.log(`[getRowLocatorWithFallback] FIN - Retornando fallbackLocator para ${compania} - Timestamp: ${new Date().toISOString()}`);
        return fallbackLocator;
    }

    /**
     * Obtiene el locator de botón con prioridad: primero intenta el específico, si no existe usa el fallback
     */
    private async getButtonLocatorWithFallback(compania: string): Promise<Locator> {
        const specificLocator = this.companiasMap[compania.toLowerCase()];

        if (!specificLocator) {
            throw new Error(`Compañía desconocida: ${compania}`);
        }

        // Intenta el locator específico primero
        const count = await specificLocator.count();
        if (count > 0) {
            console.log(`✓ Usando locator específico de botón para ${compania}`);
            return specificLocator;
        }

        // Fallback: primer botón emitir
        console.log(`⚠ Locator específico de botón no encontrado para ${compania}, usando fallback`);
        const fallbackLocator = this.buttons.emitirBtn.first();
        return fallbackLocator;
    }

    public setFechaVigencia(): string {
        // 1. Obtené la fecha de hoy y sumale 5 días
        const fechaFutura = new Date();
        fechaFutura.setDate(fechaFutura.getDate() + 5);

        // 2. Formateala al string 'YYYY-MM-DD'
        const anio = fechaFutura.getFullYear();
        const mes = String(fechaFutura.getMonth() + 1).padStart(2, '0'); // getMonth() es 0-11, por eso +1
        const dia = String(fechaFutura.getDate()).padStart(2, '0');
        const fechaFormateada = `${dia}${mes}${anio}`;

        return fechaFormateada;
    }

    private async confirmFechaVigenciaCalendario(): Promise<void> {
        await this.page.locator('button[data-selected="true"]').click();
    }

    public async clickBtnPlus(compania: string): Promise<void> {
        const key = compania.toLowerCase();
        const btnPlus = this.btnPlusMap[key];
        if (!btnPlus) {
            console.log(`⚠ No hay btnPlus mapeado para ${compania}, omitiendo click.`);
            return;
        }
        const count = await btnPlus.count();
        if (count > 0) {
            await btnPlus.click({ force: true });
            console.log(`✓ Click en btnPlus de ${compania}`);
        } else {
            console.log(`⚠ btnPlus de ${compania} no visible, omitiendo click.`);
        }
    }

    public async getCompaniaBtn(compania: string): Promise<Locator> {
        return await this.getButtonLocatorWithFallback(compania);
    }

    /**
     * Click en Emitir de la cobertura. Si aparece el modal
     * "¡Tenés cambios sin aplicar!", aplica cambios, espera el badge
     * de éxito y vuelve a emitir (mismo patrón que POL-2877).
     */
    public async clickEmitirHandlingDirtyModal(compania: string): Promise<void> {
        const emitirBtn = await this.getCompaniaBtn(compania);
        await emitirBtn.click();

        const dirtyModal = this.page.getByText(/Tenés cambios sin aplicar/i);
        if (await dirtyModal.isVisible({ timeout: 3000 }).catch(() => false)) {
            const aplicar = this.page.getByRole("button", { name: /^aplicar cambios$/i });
            if (await aplicar.isVisible().catch(() => false)) {
                await aplicar.click();
                await expect(this.buttons.getSuccessBadge(compania)).toBeVisible({ timeout: 180000 });
                const emitirBtn2 = await this.getCompaniaBtn(compania);
                await emitirBtn2.click();
            } else {
                await this.page.getByRole("button", { name: /continuar sin cambios/i }).click();
            }
        }
    }

    public async getValorCoberturaTabla(compania: string): Promise<string | null> {
        const coberturaLocator = await this.getRowLocatorWithFallback(compania);

        // Esperar a que el elemento sea visible antes de obtener el texto.
        // Se usa .first() porque algunos rediseños (ej: Mercantil Andina) dejan más de
        // un elemento coincidente en el DOM (ver getValorCarrito más abajo).
        await coberturaLocator.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
            console.error(`Timeout esperando que la fila de ${compania} sea visible`);
        });

        const coberturaText = await coberturaLocator.first().textContent({ timeout: 5000 }); // ej: "$131.399Mismo precio por 3 meses"

        if (coberturaText === null) {
            console.log("No se pudo obtener el valor de la cobertura");
            return null;
        }

        // Layout 1: empieza con "$131.399..." → quitar $ y matchear al inicio
        const valorSucio = coberturaText.replace('$', '');
        const matchInicio = valorSucio.match(/^[\d.,]+/);
        if (matchInicio?.[0]) {
            console.log("Valor cobertura es: " + matchInicio[0]);
            return matchInicio[0];
        }

        // Layout 2: precio embebido en el texto (ej: "...detalles92.773Quitar...")
        // Busca un número en formato precio argentino: dígitos con separador de miles (92.773, 131.399, etc.)
        const matchPrecio = coberturaText.match(/\b(\d{1,3}(?:\.\d{3})+(?:,\d{2})?)\b/);
        if (matchPrecio?.[1]) {
            console.log("Valor cobertura es: " + matchPrecio[1]);
            return matchPrecio[1];
        }

        console.error(`No se pudo extraer el valor numérico de: "${valorSucio}"`);
        return null;
    }

    public async getValorCarrito(compania: string): Promise<string | null> {
        const key = compania.toLowerCase();
        const carritoLocator = this.carritoRowsMap[key];
        if (!carritoLocator) {
            console.log(`⚠ No hay carritoRow mapeado para ${compania}`);
            return null;
        }

        // .first() por la misma razón que en getValorCoberturaTabla: el locator puede
        // resolver a más de un elemento en algunos rediseños (ej: Mercantil Andina).
        const text = await carritoLocator.first().textContent({ timeout: 5000 }).catch(() => null);
        if (!text) {
            console.log(`No se pudo obtener el valor del carrito para ${compania}`);
            return null;
        }

        const match = text.match(/\$\s*([\d.,]+)/);
        if (match && match[1]) {
            console.log(`Precio carrito ${compania}: ${match[1]}`);
            return match[1];
        }

        console.error(`No se pudo extraer valor numérico del carrito: "${text}"`);
        return null;
    }

    public async getValorSumaAsegurada(): Promise<string | null> {
        // Header actual: <span>Suma asegurada:</span><span>$20.150.000</span> (hermanos)
        const label = this.page.getByText('Suma asegurada:', { exact: true }).first();
        if (await label.count() > 0) {
            const sibling = label.locator('xpath=following-sibling::*[1]');
            if (await sibling.count() > 0) {
                const amountText = await sibling.textContent();
                const cleaned = amountText?.replace(/[^\d]/g, '') ?? '';
                if (cleaned) return cleaned;
            }
            // A veces el $ está en el mismo nodo padre
            const parentText = await label.locator('..').textContent();
            const match = parentText?.match(/\$\s*([\d.]+)/);
            if (match?.[1]) {
                const cleaned = match[1].replace(/\./g, '');
                if (cleaned) return cleaned;
            }
        }

        const headerRow = this.page.locator('.response__tab__selectedCompanyStatRow').filter({ hasText: 'Suma asegurada:' });
        if (await headerRow.count() > 0) {
            const amountText = await headerRow.locator('span').last().textContent();
            const cleaned = amountText?.replace(/[^\d]/g, '') ?? '';
            if (cleaned) return cleaned;
        }

        console.log("No se pudo obtener el valor de la suma asegurada");
        return null;
    }

    /**
     * POL-2871: parsea el NumberInput de suma asegurada a entero (sin $ ni puntos).
     */
    public async getSumaAseguradaNumeric(): Promise<number> {
        const raw = await this.sumaAsegurada.inputValue();
        return Number(String(raw).replace(/[^\d]/g, '') || '0');
    }

    /**
     * POL-2871: setea suma asegurada y hace blur (dispara validación / emptyFallback).
     */
    public async setSumaAseguradaValor(valor: number | string): Promise<void> {
        await this.sumaAsegurada.click({ clickCount: 3 });
        await this.page.keyboard.press('Backspace');
        await this.sumaAsegurada.fill(String(valor));
        await this.sumaAsegurada.blur();
    }

    /**
     * POL-2871: espera a que el campo deje de estar en "En espera de cotización"
     * y tenga un valor numérico > 0 editable.
     */
    public async waitSumaAseguradaEditable(timeout = 180000): Promise<number> {
        await expect
            .poll(async () => {
                const ph = await this.sumaAsegurada.getAttribute('placeholder');
                const ro = await this.sumaAsegurada.isEditable();
                const n = await this.getSumaAseguradaNumeric();
                return ph !== 'En espera de cotización' && ro && n > 0 ? n : 0;
            }, { timeout })
            .toBeGreaterThan(0);
        return this.getSumaAseguradaNumeric();
    }

    /**
     * Triunfo (y otras Cías) pueden inicializar sumaAseguradaVehiculo en "0" en el form
     * anidado de config avanzada. Con $0 el botón "Aplicar cambios" queda disabled
     * (ableButtonBySumaAsegurada). Se copia el valor del header de cotización.
     * Siempre reescribe el valor para marcar dirty cuando el resto de campos son defaults.
     */
    public async setSumaAseguradaDesdeCobertura(): Promise<void> {
        await expect(this.sumaAsegurada).toBeVisible({ timeout: 15000 });

        let valor = await this.getValorSumaAsegurada();
        const currentRaw = await this.sumaAsegurada.inputValue();
        const currentNum = Number(String(currentRaw).replace(/[^\d]/g, '') || '0');

        if ((!valor || Number(valor) <= 0) && currentNum > 0) {
            valor = String(currentNum);
        }
        if (!valor || Number(valor) <= 0) {
            throw new Error(`Suma asegurada en $0 y no se pudo leer del header (got: ${valor})`);
        }

        // NumberInput con formatter de moneda: clear + type es más fiable que fill()
        await this.sumaAsegurada.click({ clickCount: 3 });
        await this.page.keyboard.press('Backspace');
        await this.page.keyboard.type(valor);
        await this.page.keyboard.press('Tab');
        console.log(`Suma asegurada seteada desde cobertura: ${valor}`);
    }

    public async aplicarDescuento15Porciento(): Promise<void> {
        await this.descuentoBar15.click();
        await this.descuentoPointer.click();
    }

    public async aplicarDescuento20Porciento(): Promise<void> {
        await this.descuentoPointer.focus();
        await this.page.keyboard.press("End");
    }

    /**
     * Setea el slider de descuento Mantine a un % objetivo (POL-2877: Triunfo max=30).
     * Click en la fracción `percent/max` del track.
     */
    public async setDescuentoSliderPercent(percent: number): Promise<void> {
        const slider = this.descuentoPointer;
        await expect(slider).toBeVisible({ timeout: 30000 });
        const maxAttr = await slider.getAttribute("aria-valuemax");
        const max = maxAttr ? Number(maxAttr) : 30;
        const ratio = Math.min(Math.max(percent / max, 0), 1);
        const track = this.page.locator(".mantine-Slider-root").first();
        const box = await track.boundingBox();
        if (!box) {
            throw new Error("No se pudo obtener boundingBox del slider de descuento");
        }
        await this.page.mouse.click(box.x + box.width * ratio, box.y + box.height / 2);
        console.log(`Descuento slider seteado a ~${percent}% (max=${max})`);
    }

    public async aplicarDescuento25Porciento(): Promise<void> {
        // Sancor: 25% está bloqueado hasta marcar "¿Necesitás un descuento adicional?"
        if (await this.cboxDescAdicional.isVisible().catch(() => false)) {
            const checked = await this.cboxDescAdicional.isChecked().catch(() => false);
            if (!checked) {
                await this.cboxDescAdicional.click();
                if (await this.aceptarYHabilitarBtn.isVisible().catch(() => false)) {
                    await this.aceptarYHabilitarBtn.click();
                }
            }
        }
        await this.descuentoBar25.click();
        await this.descuentoPointer.click();
    }

    public async aplicarDescuento30Porciento(): Promise<void> {
        await this.descuentoPointer.focus();
        await this.page.keyboard.press("End");
    }

    public async aplicarDescuento35Porciento(): Promise<void> {
        await this.cboxDescAdicional.click();
        await this.aceptarYHabilitarBtn.click();
        await this.descuentoPointer.click();
        await this.page.keyboard.press("End");
    }

    public getOptionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    async setUsoVehiculo(datosDelTest: any) {
        const usoVehiculoOption = datosDelTest.usoVehiculo || 'Particular'; // Usa default si no viene
        await this.usoVehiculo.click();
        await this.getOptionLocator(usoVehiculoOption).click();
        console.log(`Uso Vehículo seleccionado: ${usoVehiculoOption}`);
    }

    async setTipoFacturacion(datosDelTest: any) {
        // Asegúrate que tipoFacturacion siempre venga en datosDelTest
        if (!datosDelTest.tipoFacturacion) {
            throw new Error("setTipoFacturacion: 'tipoFacturacion' no encontrado en datosDelTest.");
        }
        await this.facturacion.click();
        await this.getOptionLocator(datosDelTest.tipoFacturacion).click();
        console.log(`Tipo Facturación seleccionado: ${datosDelTest.tipoFacturacion}`);
    }

    async setFormaPago(datosDelTest: any) {
        // Asegúrate que formaPago siempre venga en datosDelTest
        if (!datosDelTest.formaPago) {
            throw new Error("setFormaPago: 'formaPago' no encontrado en datosDelTest.");
        }
        // Lógica condicional para elegir el locator correcto

        await this.formaPago.click();
        // Usa un locator case-insensitive para forma de pago usando regex
        const formaPagoPattern = new RegExp(`^${datosDelTest.formaPago}$`, 'i');
        await this.page.getByRole("option", { name: formaPagoPattern }).click();
        console.log(`Forma Pago seleccionada: ${datosDelTest.formaPago}`);
    }

    async setCantidadCuotas(datosDelTest: any) {
        // Asegúrate que cantCuotas siempre venga en datosDelTest
        if (datosDelTest.cantCuotas === undefined || datosDelTest.cantCuotas === null) {
            throw new Error("setCantidadCuotas: 'cantCuotas' no encontrado en datosDelTest.");
        }
        // this.cuotas ya usa .or() para hacer fallback automático entre #dependant_cuotas y #select_cuotas
        await this.cuotas.click();
        // Convierte a string por si acaso viene como número
        await this.getOptionLocator(datosDelTest.cantCuotas.toString()).click();
        console.log(`Cantidad Cuotas seleccionada: ${datosDelTest.cantCuotas}`);
    }

    async setAjusteAutomatico(datosDelTest: any) {
        // Solo actúa si ajusteAutomatico está presente en los datos
        if (datosDelTest.ajusteAutomatico) {
            if (datosDelTest.rivadavia) { // Lógica específica para Rivadavia
                await this.ajusteRiva.click();
                await this.getOptionLocator(datosDelTest.ajusteAutomatico).click();
                console.log(`Ajuste Automático (Riva) seleccionado: ${datosDelTest.ajusteAutomatico}`);
            } else { // Lógica genérica para otras Cías (si aplica)
                // Verifica si el locator genérico está visible antes de usarlo
                if (await this.ajusteAutomatico.isVisible()) {
                    await this.ajusteAutomatico.click();
                    await this.getOptionLocator(datosDelTest.ajusteAutomatico).click();
                    console.log(`Ajuste Automático (Genérico) seleccionado: ${datosDelTest.ajusteAutomatico}`);
                } else {
                    console.log("Ajuste automático genérico no visible/aplicable para esta compañía o configuración.");
                }
            }
        } else {
            console.log("Ajuste automático no especificado en datosDelTest.");
        }
    }

    public async aplicarDescuento(datosDelTest: any): Promise<void> {
        const descuento = datosDelTest.descuento;
        if (!descuento || descuento === 0) {
            console.log('Sin descuento aplicado (0%)');
            return;
        }
        switch (descuento) {
            case 15: await this.aplicarDescuento15Porciento(); break;
            case 20: await this.aplicarDescuento20Porciento(); break;
            case 25: await this.aplicarDescuento25Porciento(); break;
            case 30: await this.aplicarDescuento30Porciento(); break;
            case 35: await this.aplicarDescuento35Porciento(); break;
            default:
                console.log(`Descuento ${descuento}% no tiene método específico, omitiendo.`);
                return;
        }
        console.log(`Descuento aplicado: ${descuento}%`);
    }

    public async fillRivadavia(Auto: any) {
        if (Auto.ban) {
            await this.aplicarDescuento(Auto);
        } else {
            await this.fechaVigencia.fill(this.setFechaVigencia());
            await this.confirmFechaVigenciaCalendario();
        await this.aplicarDescuento(Auto);
        await this.ajusteAutomatico.click();
        await this.getOptionLocator(Auto.ajusteAutomatico).click();
        await this.facturacion.click();
        await this.getOptionLocator(Auto.tipoFacturacion).click();
        await this.cuotas.click();
        await this.getOptionLocator(Auto.cantCuotas).click();
        await this.usoVehiculo.click();
        await this.getOptionLocator(Auto.usoVehiculo).click();
        if (Auto.grua !== undefined) {
            await this.setGruaRivadavia(!!Auto.grua);
        }
        }
    }

    public async fillTriunfo(auto: any) {
        // 1) Suma: puede venir en $0 (disabled) o ya poblada; reescribir marca dirty
        await this.setSumaAseguradaDesdeCobertura();

        // 2) Descuento: focus + End sobre el slider (el label % a veces no es clickeable)
        if (auto.descuento > 0) {
            await this.descuentoPointer.focus();
            await this.page.keyboard.press("End");
            console.log(`Descuento Triunfo aplicado al máximo (${auto.descuento}%)`);
        }

        // 3) Forzar dirty en el Formik anidado (defaults Particular/Mensual/1/ME no cambian valor)
        await this.usoVehiculo.click();
        await this.getOptionLocator('Comercial').click();
        await this.setUsoVehiculo(auto);
        await this.setTipoFacturacion(auto);
        await this.setCantidadCuotas(auto);
        await this.setFormaPago(auto);
    }

    public async fillSancor(auto: any) {
        if (!auto.ban) {
            await this.fechaVigencia.fill(this.setFechaVigencia());
            await this.confirmFechaVigenciaCalendario();
        }
        await this.setUsoVehiculo(auto);
        if (auto.descuento && auto.descuento > 0) {
            await this.aplicarDescuento(auto);
        }
    }

    public async fillZurich(auto: any) {
        await this.aplicarDescuento(auto);
        await this.fechaVigencia.fill(this.setFechaVigencia());
        await this.confirmFechaVigenciaCalendario();
        await this.formaPago.click();
        await this.getOptionLocator(auto.formaPago).click();
    }

    public async fillRus(auto: any) {
        await this.fechaVigencia.fill(this.setFechaVigencia());
        await this.page.keyboard.press('Escape');
        await this.aplicarDescuento(auto);
        await this.setUsoVehiculo(auto);
        await this.setAjusteAutomatico(auto);
    }

    public async fillFedPat(auto: any) {
        if (!auto.ban) {
            await this.fechaVigencia.fill(this.setFechaVigencia());
            await this.confirmFechaVigenciaCalendario();
        }
        //await this.descFedPatCbox.click();
    }

    public async fillATM(auto: any) {
        await this.fechaVigencia.fill(this.setFechaVigencia());
        await this.page.keyboard.press('Escape');
        await this.aplicarDescuento(auto);
        await this.setTipoFacturacion(auto);
        await this.setCantidadCuotas(auto);
        await this.setFormaPago(auto);
        await this.setAjusteAutomatico(auto);
    }

    public async fillMercantilAndina(auto: any) {
        await this.aplicarDescuento(auto);
        await this.setAjusteAutomatico(auto);
        await this.setTipoFacturacion(auto);
        await this.setCantidadCuotas(auto);
    }

    public async fillExperta(auto: any) {
        await this.fechaVigencia.fill(this.setFechaVigencia());
        await this.confirmFechaVigenciaCalendario();
        await this.setFormaPago(auto);
        await this.setUsoVehiculo(auto);
    }

    /**
 * Método "Dispatcher": Llama a la receta de configuración correcta
 * basándose en el flag booleano de la compañía activa en datosDelTest.
 */
public async fillCompanySpecificAdvancedConfig(datosDelTest: any) {
    
    // Mueve el bloque IF de emisionAutoPage.ts... ¡AQUÍ!
    if (datosDelTest.rivadavia) {
        await this.fillRivadavia(datosDelTest);
    } else if (datosDelTest.triunfo) {
        await this.fillTriunfo(datosDelTest);
    } else if (datosDelTest.rus) {
        await this.fillRus(datosDelTest);
    } else if (datosDelTest.zurich) {
        await this.fillZurich(datosDelTest);
    } else if (datosDelTest.sancor) {
        await this.fillSancor(datosDelTest);
    } else if (datosDelTest.federacion_patronal) {
        await this.fillFedPat(datosDelTest);
    } else if (datosDelTest.atm) {
        await this.fillATM(datosDelTest);
    } else if (datosDelTest.mercantil_andina) {
        await this.fillMercantilAndina(datosDelTest);
    } else if (datosDelTest.experta) {
        await this.fillExperta(datosDelTest);
    } else {
        console.log(`No hay configuración avanzada específica para la compañía activa.`);
    }
}
}
