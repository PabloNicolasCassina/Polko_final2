import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionDetalleHogar {
    readonly page: Page;

    readonly patenteInput: Locator;
    readonly nroMotorInput: Locator;
    readonly nroChasisInput: Locator;
    readonly descripcionGncInput: Locator;
    readonly marcaReguladorInput: Locator;
    readonly nroReguladorInput: Locator;
    readonly nuevoCilindroBtn: Locator;




    constructor(page: Page) {
        this.page = page;
        this.patenteInput = page.locator('[id="input_vehiculo.patente"]');
        this.nroMotorInput = page.locator('[id="input_vehiculo.motor"]');
        this.nroChasisInput = page.locator('[id="input_vehiculo.chasis"]');
        this.descripcionGncInput = page.locator('[id="input_vehiculo.gnc.descripcionGnc"]')
        this.marcaReguladorInput = page.locator('[id="input_vehiculo.gnc.marcaRegulador"]');
        this.nroReguladorInput = page.locator('[id="input_vehiculo.gnc.numeroRegulador"]');
        this.nuevoCilindroBtn = page.getByRole('button', { name: 'Nuevo cilindro' });

    }

    public getMarcaCilindroLocator(index: string): Locator {
        return this.page.locator(`[id="input_vehiculo.gnc.cilindros[${index}].marcaCilindro"]`);
    }

    public getNumeroCilindroLocator(index: string): Locator {
        return this.page.locator(`[id="input_vehiculo.gnc.cilindros[${index}].numeroCilindro"]`);
    }

    public generarPatenteAleatoriaAuto(): string {
        const prefijo = "AI";
        const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numeros = '0123456789';
        let patente = '';
        for (let i = 0; i < 3; i++) patente += numeros.charAt(Math.floor(Math.random() * numeros.length));
        for (let i = 0; i < 2; i++) patente += letras.charAt(Math.floor(Math.random() * letras.length));
        return prefijo + patente;
    }

    public generarNroMotorAleatorio(): string {
        const prefijo = 'MOT';
        const aleatorio = Math.random().toString(36).substring(2, 12).toUpperCase();
        return prefijo + aleatorio;
    }

    public generarNroChasisAleatorio(): string {
        const prefijo = 'CHS';
        const aleatorio = Math.random().toString(36).substring(2, 15).toUpperCase();
        return prefijo + aleatorio;
    }

    public generarMarcaCilindroAleatorio(): string {
        const marcas = ['Tomasetto', 'BRC', 'Landirenzo', 'Lovato', 'AC', 'OMVL', 'Prins'];
        const indiceAleatorio = Math.floor(Math.random() * marcas.length);
        return marcas[indiceAleatorio];
    }

    public generarNroCilindroAleatorio(): string {
        const prefijo = 'CIL';
        const aleatorio = Math.random().toString(36).substring(2, 9).toUpperCase();
        return prefijo + aleatorio;
    }

}






