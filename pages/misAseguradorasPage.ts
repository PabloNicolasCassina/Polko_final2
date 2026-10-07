import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object para las pantallas de "Mis aseguradoras" (/u/m/misaseguradoras),
 * "Mis solicitudes" (/u/m/missolicitudes) y "Mis documentos" (/u/m/misdocumentos).
 */
export default class MisAseguradorasPage {
    readonly page: Page;

    // /u/m/misaseguradoras
    readonly title: Locator;
    readonly solicitarAseguradoraCard: Locator;
    readonly misDocumentosCard: Locator;

    // /u/m/missolicitudes
    readonly solicitudesTitle: Locator;
    readonly habilitacionAseguradorasHeading: Locator;
    readonly sinSolicitudesPendientesText: Locator;
    readonly activacionEnviadaText: Locator;
    readonly noPudimosActivarText: Locator;

    // /u/m/misdocumentos
    readonly documentosTitle: Locator;
    readonly tabGeneral: Locator;
    readonly tabAseguradoras: Locator;
    readonly archivoSubidoCorrectamenteToast: Locator;
    readonly errorAlSubirArchivoToast: Locator;

    constructor(page: Page) {
        this.page = page;

        this.title = page.getByRole('heading', { name: 'Mis aseguradoras', exact: true });
        this.solicitarAseguradoraCard = page.getByRole('button', { name: /Solicitar aseguradora/i });
        this.misDocumentosCard = page.getByRole('button', { name: /Mis documentos/i });

        this.solicitudesTitle = page.getByRole('heading', { name: 'Mis solicitudes', exact: true });
        this.habilitacionAseguradorasHeading = page.getByRole('heading', { name: 'Habilitación de aseguradoras' });
        this.sinSolicitudesPendientesText = page.getByText('No tenés solicitudes de activación pendientes en este momento.');
        this.activacionEnviadaText = page.getByText('La activación fue enviada.');
        this.noPudimosActivarText = page.getByText('No pudimos activar la aseguradora.');

        this.documentosTitle = page.getByRole('heading', { name: 'Mis documentos', exact: true });
        this.tabGeneral = page.getByRole('tab', { name: /General/ });
        this.tabAseguradoras = page.getByRole('tab', { name: 'Aseguradoras', exact: true });
        this.archivoSubidoCorrectamenteToast = page.getByText('Archivo subido correctamente');
        this.errorAlSubirArchivoToast = page.getByText('Error al subir el archivo');
    }

    async navigateToMisAseguradoras(): Promise<void> {
        await this.page.goto('http://localhost:3000/u/m/misaseguradoras', { waitUntil: 'domcontentloaded' });
        await expect(this.title).toBeVisible({ timeout: 30000 });
    }

    async navigateToMisSolicitudes(): Promise<void> {
        await this.page.goto('http://localhost:3000/u/m/missolicitudes', { waitUntil: 'domcontentloaded' });
        await expect(this.solicitudesTitle).toBeVisible({ timeout: 30000 });
    }

    async navigateToMisDocumentos(): Promise<void> {
        await this.page.goto('http://localhost:3000/u/m/misdocumentos', { waitUntil: 'domcontentloaded' });
        await expect(this.documentosTitle).toBeVisible({ timeout: 30000 });
    }

    /**
     * Card completa (ícono + nombre + estado + acciones) de un documento dentro de la
     * pestaña "General", ubicada a partir del ancestro más cercano que contiene tanto
     * el nombre del documento como su botón/acciones. Es independiente de cuántos
     * niveles de wrappers use el layout.
     */
    documentoCard(nombre: string): Locator {
        return this.page
            .getByRole('heading', { name: nombre, exact: true })
            .locator('xpath=ancestor::*[.//button][1]');
    }

    documentoSubtitulo(nombre: string): Locator {
        // Algunos documentos (ej. "CONSTANCIA AFIP") envuelven el heading junto con un
        // botón de información en un contenedor propio, separado del <p> de estado.
        // Se busca el ancestro más cercano que sí contenga un <p>, sea cual sea el nivel.
        return this.page
            .getByRole('heading', { name: nombre, exact: true })
            .locator('xpath=ancestor::*[.//p][1]')
            .locator('p')
            .first();
    }

    /**
     * Sube un archivo al primer documento en estado "Pendiente de carga" que encuentre
     * dentro de la pestaña "General", y devuelve su nombre.
     */
    async subirPrimerDocumentoPendiente(filePath: string): Promise<string> {
        const pendingCard = this.page
            .getByText('Pendiente de carga', { exact: true })
            .first()
            .locator('xpath=ancestor::*[.//button[normalize-space()="Subir documento"]][1]');

        const nombre = (await pendingCard.getByRole('heading').first().textContent())?.trim() ?? '';

        const [fileChooser] = await Promise.all([
            this.page.waitForEvent('filechooser'),
            pendingCard.getByRole('button', { name: 'Subir documento' }).click(),
        ]);
        await fileChooser.setFiles(filePath);

        return nombre;
    }
}
