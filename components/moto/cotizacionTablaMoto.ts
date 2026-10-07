import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";

export default class CotizacionTablaMoto {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly descuentoBar: Locator;
    readonly descuentoBar0: Locator;
    readonly descuentoBar15: Locator;
    readonly descuentoBar30: Locator;
    readonly descuentoSlider: Locator;
    readonly descuentoExtraLabel: Locator;
    readonly configAvanzadaBtn: Locator;
    readonly fechaVigencia: Locator;
    readonly sumaAsegurada: Locator;
    readonly usoVehiculo: Locator;
    readonly facturacion: Locator;
    readonly cantCuotas: Locator;
    readonly ajusteAutomatico: Locator;
    readonly cuotas: Locator;
    readonly infoBtn: Locator;
    readonly carritoBtn: Locator;
    readonly sancorRow: Locator;
    readonly rivaRow: Locator;
    readonly atmRow: Locator;
    readonly rusRow: Locator;
    readonly emitirSancor: Locator;
    readonly emitirRiva: Locator;
    readonly emitirAtm: Locator;
    readonly emitirRus: Locator;
    readonly formaPagoSiguiente: Locator;
    readonly companiasMap: { [key: string]: Locator };
    readonly companiasRowsMap: { [key: string]: Locator };
    readonly cotizacionErrorText: Locator;

    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.descuentoBar = page.locator('div').filter({ hasText: /^0$/ }).first();
        this.descuentoBar0 = page.getByText("0%", { exact: true });
        this.descuentoBar15 = page.getByText("15%", { exact: true });
        this.descuentoBar30 = page.getByText("30%", { exact: true });
        this.descuentoSlider = page.getByRole("slider");
        this.descuentoExtraLabel = page.getByText("Descuento extra", { exact: true });
        this.configAvanzadaBtn = page.getByText('Configuración avanzada', { exact: true });
        this.fechaVigencia = page.getByRole('textbox', { name: 'Inicio vigencia' });
        this.sumaAsegurada = page.getByRole('textbox', { name: 'Suma asegurada vehículo' });
        this.usoVehiculo = page.getByRole('searchbox', { name: 'Uso del vehículo' });
        this.facturacion = page.getByRole('searchbox', { name: 'Tipo de facturación' });
        this.ajusteAutomatico = page.getByRole('searchbox', { name: 'Ajuste automático' });
        this.cuotas = page.getByRole('searchbox', { name: 'Cantidad de cuotas' });
        this.cantCuotas = page.getByRole('searchbox', { name: 'Cantidad de cuotas' });
        this.infoBtn = page.locator('#infoIcon_16 circle');
        this.carritoBtn = page.locator('.automotor__cotSuccess__icon');
        // Primera fila como fallback (busca la primera fila de la tabla que contenga "$")
        const primeraFila = page.locator('.ctrow__container').filter({ hasText: '$' }).first();
        
        this.sancorRow = page.getByText("17Moto Premium").getByText("$").or(primeraFila);
        this.rivaRow = page.getByText("CMAX").getByText("$").or(primeraFila);
        this.atmRow = page.getByText('CROBO PREMIUM MOTOS').getByText("$").or(primeraFila);
        this.rusRow = page.getByText('RCM-GRCM C/GRUA').getByText("$").or(primeraFila);

        const primerBotonEmitir = this.buttons.emitirBtn.first();


        this.emitirSancor = page.locator('#emitirButton_17').or(primerBotonEmitir);
        this.emitirRiva = page.locator('#emitirButton_C').or(primerBotonEmitir);
        // cotizarMotoIA: código vacío no matcheaba nada, siempre caía al fallback
        // .first(). Verificado en vivo: ATM "CROBO PREMIUM MOTOS" = código "C".
        this.emitirAtm = page.locator('[id="emitirButton_C"]').or(primerBotonEmitir);
        this.emitirRus = page.locator('#emitirButton_RCM-G').or(primerBotonEmitir);
        this.formaPagoSiguiente = page.locator('[id="select_infoDePago.formaDePago"]');
        this.companiasMap = {
            'sancor': this.emitirSancor,
            'rus': this.emitirRus,
            'rivadavia': this.emitirRiva,
            'atm': this.emitirAtm
        };
        this.companiasRowsMap = {
            'sancor': this.sancorRow,
            'rus': this.rusRow,
            'rivadavia': this.rivaRow,
            'atm': this.atmRow
        };

        // El mensaje de error genérico de cotización puede aparecer como
        // "Hubo un problema..." o como "Parece que hubo un inconveniente..."
        // (ver components/emisionFinal.ts errorEmision, que ya contempla ambos).
        // Si sólo se matchea el primero, un error real deja al test esperando
        // indefinidamente configAvanzadaBtn.or(cotizacionErrorText).
        this.cotizacionErrorText = page.getByText('Hubo un problema').or(page.getByText('Parece que hubo un'));
    }

    // --- Métodos Helper ---

    public getOptionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    private async selectOptionFromListbox(listboxName: string, option: string) {
        const optionLocator = this.page.getByRole('option', { name: option, exact: true });
        await expect(optionLocator).toBeVisible({ timeout: 10000 });
        await optionLocator.click();
    }

    public getFechaVigenciaString(): string {
        const fechaFutura = new Date();
        fechaFutura.setDate(fechaFutura.getDate() + 5);
        const anio = fechaFutura.getFullYear();
        const mes = String(fechaFutura.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaFutura.getDate()).padStart(2, '0');
        return `${dia}${mes}${anio}`;
    }

    // --- Métodos 'set...' ---

    public async setFechaVigencia() {
        const fechaFormateada = this.getFechaVigenciaString();
        await this.fechaVigencia.fill(fechaFormateada);
        console.log(`Fecha Vigencia Moto: ${fechaFormateada}`);
    }

    public async setDescuento(descuentoPorc: number) {
        await expect(this.descuentoSlider).toBeVisible({ timeout: 10000 });
        if (!descuentoPorc) {
            const zero = this.descuentoBar0;
            if ((await zero.count()) > 0) {
                await zero.first().click();
            }
            return;
        }

        const descuentoOption = this.page.getByText(`${descuentoPorc}%`, { exact: true });
        const count = await descuentoOption.count();
        if (count === 0) {
            console.log(`Opción de descuento ${descuentoPorc}% no visible. Saltando.`);
            return;
        }
        await expect(descuentoOption.first()).toBeVisible({ timeout: 10000 });
        await descuentoOption.first().click();
        console.log(`Aplicado descuento ${descuentoPorc}%`);
    }

    public async setTipoFacturacion(datosDelTest: any) {
        if (datosDelTest.tipoFacturacion && await this.facturacion.isVisible()) {
            await this.facturacion.click();
            await this.selectOptionFromListbox("Tipo de facturación", datosDelTest.tipoFacturacion);
            console.log(`Tipo Facturación Moto: ${datosDelTest.tipoFacturacion}`);
        } else {
            console.log("Campo 'Tipo de Facturación' no visible o no definido. Saltando.");
        }
    }

    public async setAjusteAutomatico(datosDelTest: any) {
        // Verifica si el campo es visible Y si los datos lo definen
        if (datosDelTest.ajusteAutomatico && await this.ajusteAutomatico.isVisible()) {
            await this.ajusteAutomatico.click();
            await this.selectOptionFromListbox("Ajuste automático", datosDelTest.ajusteAutomatico);
            console.log(`Ajuste Automático Moto: ${datosDelTest.ajusteAutomatico}`);
        } else {
            console.log("Campo 'Ajuste Automático' no visible o no definido. Saltando.");
        }
    }

    public async setUsoVehiculo(datosDelTest: any) {
        // Verifica si el campo es visible Y si los datos lo definen
        if (datosDelTest.usoVehiculo && await this.usoVehiculo.isVisible()) {
            await this.usoVehiculo.click();
            await this.selectOptionFromListbox("Uso del vehículo", datosDelTest.usoVehiculo);
            console.log(`Uso Vehículo Moto: ${datosDelTest.usoVehiculo}`);
        } else {
            console.log("Campo 'Uso Vehiculo' no visible o no definido. Saltando.");
        }
    }

    public async setCantidadCuotas(datosDelTest: any) {
        if (datosDelTest.cantCuotas && !datosDelTest.atm && await this.cuotas.isVisible()) {
            await this.cuotas.click();
            await this.selectOptionFromListbox("Cantidad de cuotas", datosDelTest.cantCuotas.toString());
            console.log(`Cantidad Cuotas Moto (Opcional): ${datosDelTest.cantCuotas}`);
        } else {
            console.log("Campo 'Cantidad de Cuotas' no visible, no definido, o compañía ATM. Saltando.");
        }
    }

    // --- Método "Dispatcher" ---

    /**
     * Obtiene el locator de botón con prioridad: primero intenta el específico, si no existe usa el fallback
     */
    private async getButtonLocatorWithFallback(compania: string): Promise<Locator> {
        console.log(`[getButtonLocatorWithFallback] INICIO - Compañía: ${compania}`);

        const companiaLower = compania.toLowerCase();
        const specificLocator = this.companiasMap[companiaLower];

        if (!specificLocator) {
            console.error(`[getButtonLocatorWithFallback] ERROR - Compañía desconocida: ${compania}`);
            throw new Error(`Compañía desconocida: ${compania}`);
        }

        // Intenta el locator específico primero
        const count = await specificLocator.count();
        console.log(`[getButtonLocatorWithFallback] count() en specificLocator - Resultado: ${count}`);

        if (count === 1) {
            console.log(`[getButtonLocatorWithFallback] ✓ Usando locator específico de botón para ${compania}`);
            return specificLocator;
        }

        // Si hay múltiples elementos, necesitamos ser más específicos
        if (count > 1) {
            console.log(`[getButtonLocatorWithFallback] ⚠ Locator específico resuelve a ${count} elementos, buscando el correcto...`);

            // Mapeo de códigos de plan por compañía
            const companiaPlanCodeMap: { [key: string]: string } = {
                'sancor': '17',     // Moto Premium
                'rivadavia': 'C',   // CMAX
                'atm': '',          // CROBO PREMIUM MOTOS (puede no tener código específico)
                'rus': 'RCM-G'      // RCM-GRCM C/GRUA
            };

            const planCode = companiaPlanCodeMap[companiaLower];

            if (planCode) {
                // Intentar con el ID específico primero
                const specificButton = this.page.locator(`#emitirButton_${planCode}`);
                const specificCount = await specificButton.count();

                if (specificCount === 1) {
                    console.log(`[getButtonLocatorWithFallback] ✓ Usando botón específico con ID: #emitirButton_${planCode}`);
                    return specificButton;
                }
            }

            // Si no se puede resolver con ID específico, usar .first() como último recurso
            console.log(`[getButtonLocatorWithFallback] ⚠ Usando .first() del locator específico como último recurso`);
            return specificLocator.first();
        }

        // Fallback: primer botón emitir
        console.log(`[getButtonLocatorWithFallback] ⚠ Locator específico no encontrado (count: ${count}), usando fallback`);
        const fallbackLocator = this.buttons.emitirBtn.first();
        return fallbackLocator;
    }

    public async getCompaniaBtn(compania: string): Promise<Locator> {
        return await this.getButtonLocatorWithFallback(compania);
    }

    /**
     * Obtiene el locator de fila con prioridad: primero intenta el específico, si no existe usa el fallback
     */
    private async getRowLocatorWithFallback(compania: string): Promise<Locator> {
        const companiaLower = compania.toLowerCase();
        const specificLocator = this.companiasRowsMap[companiaLower];

        if (!specificLocator) {
            throw new Error(`Compañía desconocida: ${compania}`);
        }

        // Intenta el locator específico primero
        const count = await specificLocator.count();
        
        if (count === 1) {
            console.log(`✓ Usando locator específico de fila para ${compania}`);
            return specificLocator;
        }
        
        // Si hay múltiples elementos, hacer el locator más específico buscando dentro del contenedor
        if (count > 1) {
            console.log(`⚠ Locator específico de fila resuelve a ${count} elementos para ${compania}, buscando dentro del contenedor específico`);
            
            // Mapeo de textos específicos por compañía para buscar el contenedor correcto
            const companiaTextMap: { [key: string]: string } = {
                'sancor': '17Moto Premium',
                'rivadavia': 'CMAX',
                'atm': 'CROBO PREMIUM MOTOS',
                'rus': 'RCM-GRCM C/GRUA'
            };
            
            const textoCompania = companiaTextMap[companiaLower];
            if (textoCompania) {
                // Buscar el contenedor que tiene el texto específico de la compañía
                const containerConCompania = this.page
                    .locator('.ctrow__container')
                    .filter({ hasText: textoCompania })
                    .first();
                
                const containerCount = await containerConCompania.count();
                if (containerCount > 0) {
                    // Dentro de ese contenedor, buscar el precio
                    const precioEnContainer = containerConCompania.getByText(/\$\s*[1-9][\d.,]*/);
                    const precioCount = await precioEnContainer.count();
                    
                    if (precioCount > 0) {
                        console.log(`✓ Usando precio dentro del contenedor específico de ${compania}`);
                        return precioEnContainer.first();
                    }
                    
                    // Si no encuentra con el patrón que excluye 0, buscar cualquier precio
                    const precioCualquiera = containerConCompania.getByText(/\$[\d.,]+/);
                    const precioCualquieraCount = await precioCualquiera.count();
                    
                    if (precioCualquieraCount > 0) {
                        // Filtrar precios que no sean "$0"
                        for (let i = 0; i < precioCualquieraCount; i++) {
                            const priceText = await precioCualquiera.nth(i).textContent();
                            if (priceText && !/^\$\s*0(?:[.,]0+)?$/.test(priceText.trim())) {
                                console.log(`✓ Usando precio válido del contenedor específico: "${priceText}"`);
                                return precioCualquiera.nth(i);
                            }
                        }
                    }
                }
            }
            
            // Si no se encuentra en el contenedor específico, usar .first() del locator específico como último recurso
            console.log(`⚠ No se encontró en contenedor específico, usando .first() del locator específico para ${compania}`);
            return specificLocator.first();
        }

        // Solo si no hay elementos (count === 0), usar fallback genérico
        console.log(`⚠ Locator específico de fila no encontrado para ${compania} (count: ${count}), usando fallback genérico`);
        
        // Fallback: buscar el precio dentro del contenedor de la fila de cotización
        const containerCount = await this.page.locator('.ctrow__container').count();
        
        if (containerCount > 0) {
            // Buscar el precio dentro del contenedor, excluyendo "$0" y "$ 0"
            const fallbackLocator = this.page
                .locator('.ctrow__container')
                .first()
                .getByText(/\$\s*[1-9][\d.,]*/); // Busca $ seguido de un número que empiece con 1-9 (excluye 0)
            
            const fallbackCount = await fallbackLocator.count();
            
            if (fallbackCount > 0) {
                return fallbackLocator.first();
            }
        }

        // Si no encuentra con el patrón, buscar todos los precios y filtrar
        const allPricesInContainer = this.page
            .locator('.ctrow__container')
            .first()
            .getByText(/\$[\d.,]+/);
        
        const allPricesCount = await allPricesInContainer.count();
        
        // Si hay precios, tomar el que no sea "$0" o "$ 0"
        if (allPricesCount > 0) {
            for (let i = 0; i < allPricesCount; i++) {
                const priceText = await allPricesInContainer.nth(i).textContent();
                
                // Verificar que no sea "$0" o "$ 0" o similar
                if (priceText && !/^\$\s*0(?:[.,]0+)?$/.test(priceText.trim())) {
                    console.log(`✓ Usando precio válido del fallback: "${priceText}"`);
                    return allPricesInContainer.nth(i);
                }
            }
        }

        throw new Error(`No se encontró ninguna cotización visible para ${compania}. Verifica que la cotización se haya completado correctamente.`);
    }

    public async getValorCobertura(compania: string): Promise<string | null> {
        const coberturaLocator = await this.getRowLocatorWithFallback(compania);

        // Esperar a que el elemento sea visible antes de obtener el texto
        await coberturaLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
            console.error(`Timeout esperando que la fila de ${compania} sea visible`);
        });

        const coberturaText = await coberturaLocator.textContent({ timeout: 5000 });

        if (coberturaText === null) {
            console.log("No se pudo obtener el valor de la cobertura");
            return null;
        }

        // 1. Quitamos el signo $
        const valorSucio = coberturaText.replace('$', '');

        // 2. Usamos RegExp para quedarnos solo con el número del principio
        const match = valorSucio.match(/^[\d.,]+/);

        if (match && match[0]) {
            const valorLimpio = match[0];
            console.log("Valor cobertura es: " + valorLimpio);
            return valorLimpio;
        }

        // Si no encuentra el número, falla el test con un error claro
        console.error(`No se pudo extraer el valor numérico de: "${valorSucio}"`);
        return null;
    }

    public async fillRivadavia(Moto: any) {
        await this.setFechaVigencia();
        await this.setDescuento(15);
        await this.setTipoFacturacion(Moto);
        await this.setCantidadCuotas(Moto);
        await this.setAjusteAutomatico(Moto);
        await this.setUsoVehiculo(Moto);
    }

    public async fillSancor(Moto: any) {
        await this.setFechaVigencia();
        //await this.setDescuento(20);
        await this.setTipoFacturacion(Moto);
        await this.setCantidadCuotas(Moto);
        await this.setAjusteAutomatico(Moto);
        await this.setUsoVehiculo(Moto);
    }


    public async fillRus(Moto: any) {
        await this.setFechaVigencia();
        await this.setDescuento(20);
        await this.setTipoFacturacion(Moto);
        await this.setCantidadCuotas(Moto);
        await this.setUsoVehiculo(Moto);
        await this.setAjusteAutomatico(Moto);
    }

    public async fillATM(Moto: any) {
        await this.setFechaVigencia();
        await this.setDescuento(20);
        await this.setTipoFacturacion(Moto);
        await this.setCantidadCuotas(Moto);
        await this.setAjusteAutomatico(Moto);
        await this.setUsoVehiculo(Moto);
    }

    public async fillCompanySpecificAdvancedConfig(datosDelTest: any) {

        console.log(datosDelTest.compania)

        // Mueve el bloque IF de emisionAutoPage.ts... ¡AQUÍ!
        if (datosDelTest.rivadavia) {
            await this.fillRivadavia(datosDelTest);
        } else if (datosDelTest.rus) {
            await this.fillRus(datosDelTest);
        } else if (datosDelTest.sancor) {
            await this.fillSancor(datosDelTest);
        } else if (datosDelTest.atm) {
            await this.fillATM(datosDelTest);
        }
        else {
            console.log(`No hay configuración avanzada específica para la compañía activa.`);
        }
    }


}
