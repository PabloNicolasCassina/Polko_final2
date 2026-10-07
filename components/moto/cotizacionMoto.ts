import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";
import { get } from "http";


export default class CotizacionMoto {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly marcaSelector: Locator;
    readonly añoSelector: Locator;
    readonly versionSelector: Locator;
    readonly ceroKmSelector: Locator;
    readonly accesoriosSelector: Locator;




    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        // cotizarMotoIA: estos campos NO tienen accessible name (sin aria-label
        // ni <label> asociado — verificado en vivo), así que getByRole('searchbox',
        // { name: ... }) nunca matcheaba nada y el click quedaba colgado hasta
        // timeout. Usar los ids reales en su lugar (mismo patrón que auto:
        // select_<entidad>.<campo>, pero acá la entidad es "motovehiculo").
        this.marcaSelector = page.locator('[id="select_motovehiculo.marca"]');
        this.añoSelector = page.locator('[id="select_motovehiculo.anio"]');
        this.versionSelector = page.locator('[id="select_motovehiculo.version"]');
        this.ceroKmSelector = page.locator('[id="select_motovehiculo.esCeroKm"]');
        this.accesoriosSelector = page.getByRole('textbox', { name: 'Accesorios' });



    }

    public getMarcaLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getAnioLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getVersionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

}