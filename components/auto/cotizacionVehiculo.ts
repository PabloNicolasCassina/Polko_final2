import { Page, Locator, expect } from "@playwright/test";
import CommonButtons from "../commonButtons";
import { get } from "http";


export default class CotizacionVehiculo {
    readonly page: Page;
    readonly buttons: CommonButtons;
    readonly marcaSelector: Locator;
    readonly añoSelector: Locator;
    readonly modeloSelector: Locator;
    readonly versionSelector: Locator;
    readonly ceroKmSelector: Locator;
    readonly gncSelector: Locator;
    readonly sujetoAPrendaCbox: Locator;
    readonly scoringZurich: Locator;
    readonly sexoZurich: Locator;




    constructor(page: Page) {
        this.page = page;
        this.buttons = new CommonButtons(page);
        this.marcaSelector = page.locator('[id="select_vehiculo.marca"]')
        this.añoSelector = page.locator('[id="select_vehiculo.anio"]')
        this.modeloSelector = page.locator('[id="select_vehiculo.modelo"]')
        this.versionSelector = page.locator('[id="select_vehiculo.version"]')
        this.ceroKmSelector = page.locator('[id="select_vehiculo.esCeroKm"]')
        this.gncSelector = page.locator('[id="select_vehiculo.tieneGnc"]')
        this.sujetoAPrendaCbox = page.getByRole('checkbox', { name: 'Vehículo sujeto a prenda' });
        this.scoringZurich = page.locator('[id="number_scoring.edad"]');
        this.sexoZurich = page.locator('[id="select_scoring.sexo"]');



    }

    public getMarcaLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getAnioLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }
    public getModeloLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

    public getVersionLocator(option: string): Locator {
        return this.page.getByRole("option", { name: option, exact: true });
    }

}