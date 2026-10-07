import { Page, Locator } from "@playwright/test";

export default class CotizacionInformacion {
    readonly page: Page;
    readonly inicioVigenciaInput: Locator;
    readonly finVigenciaInput: Locator;
    readonly actividadCombobox: Locator;
    readonly clasificacionCombobox: Locator;
    readonly tareaCombobox: Locator;
    readonly cantPersonasInput: Locator;

    constructor(page: Page) {
        this.page = page;
        this.inicioVigenciaInput = page.getByRole('textbox', { name: 'dd/mm/yyyy' });
        this.finVigenciaInput = page.getByTestId('dateRange_vigenciaDesde,vigenciaHasta');
        this.actividadCombobox = page.locator('#select_actividad');
        this.clasificacionCombobox = page.locator('#select_clasificacionActividad');
        this.tareaCombobox = page.locator('#select_tareaActividad');
        this.cantPersonasInput = page.locator('#number_cantidadPersonas');
    }

    getActividadOption(actividad: string): Locator {
        return this.page.getByRole('option', { name: actividad });
    }

    getClasificacionOption(clasificacion: string): Locator {
        return this.page.getByRole('option', { name: clasificacion, exact: false });
    }

    getTareaOption(tarea: string): Locator {
        return this.page.getByRole('option', { name: tarea });
    }

    getCantPersonasOption(cantPersonas: string): Locator {
        return this.page.getByRole('option', { name: cantPersonas });
    }
}
