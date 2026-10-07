import { Page, Locator } from "@playwright/test";


export default class EmisionInspeccion {
    readonly page: Page;
    readonly inspecciondpzone: Locator;
    readonly imgInspeccion: Locator;
    readonly etiquetaImg: Locator;
    readonly etiquetaOption: Locator;
    readonly msgNoNecesitoInspeccion: Locator;
    /** @deprecated Prefer btnIrAInspeccion (POL-2892). Kept for compat con specs viejos. */
    readonly linkRealizarInspeccion: Locator;
    /** @deprecated Prefer msgInspeccionConfirmada / reencuentro (POL-2892). */
    readonly msgEnlaceAbierto: Locator;

    readonly btnIrAInspeccion: Locator;
    readonly tituloInspeccionVehicular: Locator;
    readonly tituloReencuentro: Locator;
    readonly btnSiYaComplete: Locator;
    readonly btnTodaviaNoVolver: Locator;
    readonly btnVolverCorregirDato: Locator;
    readonly btnAvisameContinuar: Locator;
    readonly msgInspeccionConfirmada: Locator;
    readonly msgYaCompletasteVehiculo: Locator;
    readonly msgFetchError: Locator;
    readonly alertTenésCompletarInspeccion: Locator;
    readonly alertConfirmáArriba: Locator;
    readonly btnCerrarAviso: Locator;
    readonly hintPopupBloqueado: Locator;
    readonly linkFallbackInspeccion: Locator;
    readonly hintSeAbrePestanaNueva: Locator;

    constructor(page: Page) {
        this.page = page;
        this.inspecciondpzone = page.locator('[id="file_inspeccionPrevia.archivos"] input[type="file"]');
        this.etiquetaImg = page.getByText('Etiqueta');
        this.imgInspeccion = page.getByRole('img', { name: 'preview_file' });
        this.etiquetaOption = page.getByRole('menuitem', { name: 'FRENTE' }).or(page.getByRole('menuitem', { name: 'Certificado de no rodamiento' }));
        this.msgNoNecesitoInspeccion = page.getByText('No se requiere inspección');

        this.linkRealizarInspeccion = page.getByRole('link', { name: 'Realizá la inspección' })
            .or(page.getByRole('button', { name: 'Ir a la inspección' }));
        this.msgEnlaceAbierto = page.getByText('Enlace abierto. Completá la inspección en Mercantil Andina y volvé acá para continuar.')
            .or(page.getByText('Marcaste la inspección como completada. Podés continuar al siguiente paso.'));

        this.btnIrAInspeccion = page.getByRole('button', { name: /Ir a la inspección/i });
        this.tituloInspeccionVehicular = page.getByRole('heading', { name: /Inspección vehicular/i });
        this.tituloReencuentro = page.getByRole('heading', { name: '¿Ya completaste la inspección?' });
        this.btnSiYaComplete = page.getByRole('button', { name: 'Sí, ya completé' });
        this.btnTodaviaNoVolver = page.getByRole('button', { name: 'Todavía no, volver al sitio' });
        this.btnVolverCorregirDato = page.getByRole('button', { name: 'Volver para corregir un dato' });
        this.btnAvisameContinuar = page.getByRole('button', { name: 'Avisame cuando pueda continuar con la emisión' });
        this.msgInspeccionConfirmada = page.getByText('Marcaste la inspección como completada. Podés continuar al siguiente paso.');
        this.msgYaCompletasteVehiculo = page.getByText('Ya completaste la inspección para este vehículo. Podés continuar al siguiente paso.');
        this.msgFetchError = page.getByText('No pudimos obtener el enlace de inspección de Mercantil Andina');
        this.alertTenésCompletarInspeccion = page.getByText('Tenés que completar la inspección en el sitio web de Mercantil Andina antes de continuar.');
        this.alertConfirmáArriba = page.getByText('Confirmá arriba si ya completaste la inspección en Mercantil Andina para poder continuar.');
        this.btnCerrarAviso = page.getByRole('button', { name: 'Cerrar aviso' });
        this.hintPopupBloqueado = page.getByText('Tu navegador bloqueó la ventana.');
        this.linkFallbackInspeccion = page.getByRole('link', { name: 'Abrí la inspección acá' });
        this.hintSeAbrePestanaNueva = page.getByText('Se abre en una pestaña nueva.');
    }
}
