import { Page, Locator, expect } from "@playwright/test";
import { get } from "http";


export default class EmisionDetalleMoto {
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
        // cotizarMotoIA: faltaba el prefijo "input_" — mismo patrón de bug que
        // cotizacionMoto.ts/cotizacionPersonaMoto.ts, verificado en vivo.
        this.patenteInput = page.locator('[id="input_motovehiculo.patente"]')
        this.nroMotorInput = page.locator('[id="input_motovehiculo.motor"]')
        this.nroChasisInput = page.locator('[id="input_motovehiculo.chasis"]')
        this.descripcionGncInput = page.locator('[id="input_vehiculo.gnc.descripcionGnc"]')
        this.marcaReguladorInput = page.locator('[id="input_vehiculo.gnc.marcaRegulador"]');
        this.nroReguladorInput = page.locator('[id="input_vehiculo.gnc.numeroRegulador"]');
        this.nuevoCilindroBtn = page.getByRole('button', { name: 'Nuevo cilindro' });

    }


    public generarPatenteAleatoriaAuto(): string {
        const prefijo = "B";
        const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numeros = '0123456789';
        let patente = '';
        for (let i = 0; i < 3; i++) patente += numeros.charAt(Math.floor(Math.random() * numeros.length));
        for (let i = 0; i < 3; i++) patente += letras.charAt(Math.floor(Math.random() * letras.length));
        return prefijo + patente;
    }

    public generarNroMotorAleatorio(): string {
        const prefijo = 'MOT';
        const aleatorio = Math.random().toString(36).substring(2, 12).toUpperCase();
        return prefijo + aleatorio;
    }

    public generarNroChasisAleatorio(): string {
        // VIN: exactamente 17 alfanuméricos, sin I/O/Q (misma regla que auto/Triunfo).
        const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
        const prefijo = 'CHS';
        let aleatorio = '';
        for (let i = 0; i < 14; i++) {
            aleatorio += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return prefijo + aleatorio;
    }

}






