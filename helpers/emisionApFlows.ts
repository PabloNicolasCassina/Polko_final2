import { type Page } from "@playwright/test";
import EmisionApPage from "../pages/emisionApPage";
import { descargarYAdjuntarPoliza } from "./emisionAutoFlows";

export interface EmitirApOptions {
    incluirDescarga?: boolean;
}

export async function emitirAp(
    test: any,
    page: Page,
    datosDelTest: any,
    emisionApPage: EmisionApPage,
    options: EmitirApOptions = {}
): Promise<void> {
    await test.step("6- Completar forma de pago", async () => {
        if (datosDelTest.formaPago === "Débito por CBU") {
            await emisionApPage.completarFormaPago("Débito por CBU", { cbu: datosDelTest.cbu });
        } else if (datosDelTest.formaPago === "Tarjeta de crédito") {
            await emisionApPage.completarFormaPago("Tarjeta de crédito", {
                nroTarjeta: datosDelTest.nroTarjeta,
                marcaTarjeta: datosDelTest.marcaTarjeta
            });
        } else {
            await emisionApPage.completarFormaPago("Efectivo");
        }
    });

    await test.step("7- Completar datos del cliente", async () => {
        const cuitTomador = datosDelTest.cuitDniTomador ?? datosDelTest.cuitDni;
        const cantidadPersonas = parseInt(datosDelTest.cantPersonas);
        const cuitAsegurados = Array.from(
            { length: cantidadPersonas },
            (_, i) => datosDelTest[`cuitDniAsegurado${i + 1}`] ?? datosDelTest.cuitDni
        );

        await emisionApPage.completarCliente(
            cuitTomador,
            cantidadPersonas,
            cuitAsegurados,
            datosDelTest.tipoPersona ?? "Física",
            datosDelTest.clausulaNoRepeticion,
            datosDelTest.cuitDniBeneficiario
        );
    });

    await test.step("8- Emitir póliza", async () => {
        await emisionApPage.emitirFinal();
    });

    if (options.incluirDescarga) {
        await test.step("9- Descargar y validar póliza", async () => {
            await descargarYAdjuntarPoliza(page, test.info(), emisionApPage);
        });
    }
}
