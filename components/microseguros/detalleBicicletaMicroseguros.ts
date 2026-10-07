import { Page, Locator } from "@playwright/test";

export default class DetalleBicicletaMicroseguros {
    readonly page: Page;
    readonly descripcionInput: Locator;
    readonly sumaAseguradaInput: Locator;
    readonly dropzoneFileInput: Locator;
    readonly previewImg: Locator;

    constructor(page: Page) {
        this.page = page;
        this.descripcionInput = page.locator('[id="detalleBicicletas[0].descripcionBicicletas"]');
        this.sumaAseguradaInput = page.getByRole('textbox', { name: 'Suma Asegurada' });
        this.dropzoneFileInput = page.locator('.mantine-Dropzone-root input[type="file"]');
        this.previewImg = page.getByRole('img', { name: 'preview_file' });
    }
}
