import { test, expect, type Page } from "@playwright/test";
import CotizarAsistenciaViajeroPage from "../pages/cotizarAsistenciaViajeroPage";
import { MENSAJES_EDAD } from "../components/asistenciaViajero/emisionAsistenciaViajero";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { documentarCaso } from "../helpers/documentarCaso";
import { edadCliente, edadesACotizar, elegirFechasViaje, type FechasViaje } from "../helpers/edadViajero";
import {
    applyUserMock,
    PRECONDICIONES,
    probarEmision,
    tituloCasoEmision,
    type CasoEmision,
} from "../helpers/emisionAsistViajero";
import {
    CLIENTES_ASISTENCIA,
    COMPANIAS_ASISTENCIA,
    DESTINOS_ASISTENCIA,
    DIAS_COBERTURA_COTIZACION,
    DIAS_VIAJE_DEFAULT,
    EDAD_MAXIMA_COTIZADOR,
    MEDIOS_PAGO_TERRAWIND,
    PAISES_POR_REGION_SNUGGLE,
    type ClienteAsistencia,
    type CompaniaAsistencia,
    type RangoEtario,
} from "../data/asistenciaViajeroEmision";

/**
 * Emisión de Asistencia al viajero (cotizador rediseñado, POL-2959) con TerraWind y los proveedores del
 * agregador Snuggle (Snug Assist, AXA, Redion ex Europ Assistance, Universal Assistance).
 *
 * Los casos son los mismos que `cotizacionAsistViajero.spec.ts`: un país por cada región de Snuggle y 5,
 * 15, 30 y 60 días de cobertura (64 casos). Cada caso emite con una compañía: rota caso a caso, así que
 * cada compañía emite 12 o 13 casos y pasa por los cuatro largos de viaje. Dentro de cada compañía rotan el
 * grupo de pasajeros (Snuggle: los cuatro grupos de rangos etarios; TerraWind: 0-75 y 76-85, porque cubre
 * hasta 85 años) y, en TerraWind, la forma de pago.
 *
 * Cada emisión lleva dos asegurados (dos vouchers) buscados por CUIT. Las edades que se cotizan son las
 * reales de cada cliente a la fecha de salida (`helpers/edadViajero.ts`) y se valida que coincidan con
 * la fecha de nacimiento que trae el padrón: Snuggle tarifa por rango etario 0-75 / 76-85 / 86-90 y el
 * front bloquea un pasajero que no cae en un rango cotizado.
 *
 *   - 0-75: 20386485446 (Oviedo) / 27381618426 (Sartori)
 *   - 76-85: 20952092570 (Felipe Gomez)
 *   - 86-90: 20920238247 (Anselmo Gomez, 86 desde el 18/12/2026: las salidas de ese rango van después)
 *
 * Cierre según el circuito de pago:
 *   - TerraWind (Tarjeta de crédito / débito / Transferencia): emite en el momento → vouchers en Mi Cartera
 *     y el precio de la póliza tiene que ser el cotizado.
 *   - Snuggle prepago: "Generar link de pago" deja la contratación "Pago pendiente" con el link del checkout
 *     (Mercado Pago en origen Argentina) → se abre el link y el monto tiene que ser el cotizado.
 *     Si la operación vuelve emitida, se descargan los vouchers; sin link (Universal tarifa sugerida) se
 *     valida el total y queda anotado.
 *
 * Comparador y PDF de cotización: comentados hasta que esté la rama que lo habilita para asistencia.
 *
 * El flujo de emisión vive en `helpers/emisionAsistViajero.ts` (lo comparte con
 * `emisionCompletoAsistViajero.spec.ts`, que emite cada caso con las cinco compañías).
 *
 * Mock de usuario: `mocks/mockUserDataATM.json` (master con TerraWind y los proveedores de Snuggle).
 * Requiere products con credenciales de Snuggle y `SNUGGLE_SUCCESS_CALLBACK_URL_PRE`.
 *   npx playwright test tests/emisionAsistViajero.spec.ts --project=chromium
 */

const COMPANIAS = Object.keys(COMPANIAS_ASISTENCIA) as CompaniaAsistencia[];
/** TerraWind cubre hasta 85 años: no emite con pasajeros de 86-90. */
const GRUPOS_TERRAWIND = ["jovenes", "mayor76"] as const;
const GRUPOS_SNUGGLE = ["jovenes", "mayor76", "mayor86", "mayores"] as const;

const CASOS: CasoEmision[] = PAISES_POR_REGION_SNUGGLE.flatMap((destino, i) =>
    DIAS_COBERTURA_COTIZACION.map((dias, j) => {
        const indice = i * DIAS_COBERTURA_COTIZACION.length + j;
        const compania = COMPANIAS[indice % COMPANIAS.length];
        const vuelta = Math.floor(indice / COMPANIAS.length);
        const caso: CasoEmision = { id: `${compania}-${destino.label}-${dias}d`, compania, destino, dias, grupo: "jovenes" };
        if (COMPANIAS_ASISTENCIA[compania].snuggle) {
            caso.grupo = GRUPOS_SNUGGLE[vuelta % GRUPOS_SNUGGLE.length];
        } else {
            caso.grupo = GRUPOS_TERRAWIND[vuelta % GRUPOS_TERRAWIND.length];
            caso.medioPago = MEDIOS_PAGO_TERRAWIND[vuelta % MEDIOS_PAGO_TERRAWIND.length];
        }
        return caso;
    }),
);

test.describe("Asistencia al viajero - Emisión por región y días de cobertura @regression", () => {
    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    for (const caso of CASOS) {
        test(tituloCasoEmision(caso), async ({ page }, testInfo) => {
            await probarEmision(page, testInfo, caso, "Emisión por región y días de cobertura");
        });
    }
});

test.describe("Asistencia al viajero - Precio por rango etario (Snuggle) @regression", () => {
    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    const destino = DESTINOS_ASISTENCIA.espania;
    const grupos: { rango: RangoEtario; pasajeros: ClienteAsistencia[] }[] = [
        { rango: "0-75", pasajeros: [CLIENTES_ASISTENCIA.oviedo, CLIENTES_ASISTENCIA.sartori] },
        { rango: "76-85", pasajeros: [CLIENTES_ASISTENCIA.felipeGomez, CLIENTES_ASISTENCIA.sartori] },
        { rango: "86-90", pasajeros: [CLIENTES_ASISTENCIA.anselmoGomez, CLIENTES_ASISTENCIA.sartori] },
    ];

    test(`Mismo viaje a ${destino.label}: el titular más grande paga más en cada proveedor`, async ({ page }, testInfo) => {
        test.setTimeout(600000);
        await documentarCaso({
            epic: "Asistencia al viajero",
            feature: "Precio por rango etario",
            severidad: "normal",
            prioridad: "medium",
            descripcion:
                `Cotiza tres veces el mismo viaje a ${destino.label} cambiando solo al primer pasajero (0-75, 76-85 y 86-90, ` +
                "con su edad real) y compara por proveedor de Snuggle el precio de cada plan que aparece en más de un " +
                "rango: tiene que subir con el rango etario.",
            precondiciones: PRECONDICIONES,
            parametros: Object.fromEntries(grupos.map((g) => [g.rango, g.pasajeros.map((p) => p.cuit).join(" + ")])),
            tags: ["asistencia-viajero", "snuggle", "rango-etario", "regression"],
        });
        await applyUserMock(page);
        const av = new CotizarAsistenciaViajeroPage(page);
        const fechas = elegirFechasViaje(grupos.flatMap((g) => g.pasajeros), DIAS_VIAJE_DEFAULT);
        const companias = (Object.keys(COMPANIAS_ASISTENCIA) as CompaniaAsistencia[]).filter((c) => COMPANIAS_ASISTENCIA[c].snuggle);
        const precios: Record<string, Record<string, Record<string, number>>> = {};

        for (const grupo of grupos) {
            const edades = edadesACotizar(grupo.pasajeros, fechas.salida);
            await test.step(`Cotizar ${grupo.rango} (edades ${edades.join(", ")})`, async () => {
                await av.goto();
                await av.seleccionarDestino(destino);
                await av.seleccionarFechas(fechas);
                await av.cargarEdades(edades);
                const body = await av.cotizar();
                expect((body?.pasajeros ?? []).map((p: any) => Number(p.edad))).toEqual(edades);
                for (const compania of companias) {
                    const { tile, label } = COMPANIAS_ASISTENCIA[compania];
                    await av.esperarCompania(tile);
                    await av.seleccionarCompania(tile, label);
                    const estado = await av.estadoCompaniaConReintento();
                    expect.soft(estado, `${label} no pudo cotizar ${grupo.rango} (error o timeout del proveedor)`).not.toBe("error");
                    const planes = estado === "con-planes" ? await av.leerPlanes() : [];
                    precios[compania] ??= {};
                    precios[compania][grupo.rango] = Object.fromEntries(planes.map((p) => [p.nombre, p.precio]));
                }
            });
        }

        await testInfo.attach("precios-por-rango.json", { body: JSON.stringify(precios, null, 2), contentType: "application/json" });

        await test.step("Cada plan cuesta más en el rango etario siguiente", async () => {
            let comparados = 0;
            for (const compania of companias) {
                for (const [menor, mayor] of [["0-75", "76-85"], ["76-85", "86-90"]] as const) {
                    for (const [plan, precioMenor] of Object.entries(precios[compania]?.[menor] ?? {})) {
                        const precioMayor = precios[compania]?.[mayor]?.[plan];
                        if (precioMayor === undefined) continue;
                        comparados++;
                        expect
                            .soft(precioMayor, `${COMPANIAS_ASISTENCIA[compania].label} · ${plan}: ${mayor} vs ${menor}`)
                            .toBeGreaterThan(precioMenor);
                    }
                }
            }
            expect(comparados, "Ningún plan apareció en dos rangos etarios para comparar").toBeGreaterThan(0);
        });
    });
});

test.describe("Asistencia al viajero - Validaciones de edad y pasajeros @regression", () => {
    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    async function documentarValidacion(nombre: string, descripcion: string): Promise<void> {
        await documentarCaso({
            epic: "Asistencia al viajero",
            feature: "Validaciones de edad y pasajeros",
            story: nombre,
            severidad: "normal",
            prioridad: "medium",
            descripcion,
            precondiciones: PRECONDICIONES,
            tags: ["asistencia-viajero", "negativo", "regression"],
        });
    }

    /** Cotiza `edades` y entra a la emisión del plan más barato de `compania`; sin planes, saltea el test. */
    async function entrarAPasajeros(
        page: Page,
        compania: CompaniaAsistencia,
        edades: number[],
        fechas: FechasViaje,
    ): Promise<CotizarAsistenciaViajeroPage> {
        await applyUserMock(page);
        const av = new CotizarAsistenciaViajeroPage(page);
        const { tile, label } = COMPANIAS_ASISTENCIA[compania];
        const destino = DESTINOS_ASISTENCIA.espania;
        await test.step(`Cotizar ${destino.label} con edades ${edades.join(", ")}`, async () => {
            await av.goto();
            await av.seleccionarDestino(destino);
            await av.seleccionarFechas(fechas);
            await av.cargarEdades(edades);
            await av.cotizar();
        });
        await test.step(`${label}: emitir el plan más barato`, async () => {
            await av.esperarCompania(tile);
            await av.seleccionarCompania(tile, label);
            const estado = await av.estadoCompaniaConReintento();
            expect(estado, `${label} no pudo cotizar (error o timeout del proveedor)`).not.toBe("error");
            test.skip(estado === "sin-planes", `${label} no tiene planes para el viaje`);
            const [plan] = await av.leerPlanes();
            await av.emitirPlan(plan.codigo);
            if (!COMPANIAS_ASISTENCIA[compania].snuggle) await av.elegirFormaPago("Transferencia");
        });
        return av;
    }

    async function esperarError(av: CotizarAsistenciaViajeroPage, mensaje: string): Promise<void> {
        await av.emision.siguienteBtn.click();
        await expect(av.emision.error(mensaje).first()).toBeVisible({ timeout: 30000 });
        await expect(av.emision.resumenHeading).toBeHidden();
        await expect(av.emision.pasajerosHeading).toBeVisible();
    }

    test(`Cotizador: una edad mayor a ${EDAD_MAXIMA_COTIZADOR} no deja cotizar`, async ({ page }) => {
        test.setTimeout(120000);
        await documentarValidacion(
            "Edad máxima del cotizador",
            `Carga ${EDAD_MAXIMA_COTIZADOR + 1} años en el pasajero 1: el campo marca "Ingresá una edad entre 1 y ` +
                `${EDAD_MAXIMA_COTIZADOR}" y "Cotizar" no sale de "Datos del viaje".`,
        );
        await applyUserMock(page);
        const av = new CotizarAsistenciaViajeroPage(page);
        const fechas = elegirFechasViaje([CLIENTES_ASISTENCIA.oviedo], DIAS_VIAJE_DEFAULT);
        await av.goto();
        await av.seleccionarDestino(DESTINOS_ASISTENCIA.brasil);
        await av.seleccionarFechas(fechas);
        await av.cargarEdades([EDAD_MAXIMA_COTIZADOR + 1]);
        await av.cotizacion.cotizarBtn.click();
        await expect(av.cotizacion.edadesError).toHaveText(`Ingresá una edad entre 1 y ${EDAD_MAXIMA_COTIZADOR}`);
        await expect(av.cotizacion.datosViajeHeading).toBeVisible();
        await expect(av.cotizacion.resultadoHeading).toBeHidden();
    });

    test("TerraWind: un pasajero mayor que los cotizados no avanza", async ({ page }) => {
        test.setTimeout(300000);
        await documentarValidacion(
            "TerraWind · pasajero mayor que los cotizados",
            "Cotiza TerraWind para dos pasajeros de 0-75 y carga como pasajero 2 a Felipe Gomez (76-85): " +
                `"Siguiente" muestra "${MENSAJES_EDAD.mayorQueCotizados}" y no pasa al resumen.`,
        );
        const pasajeros = [CLIENTES_ASISTENCIA.oviedo, CLIENTES_ASISTENCIA.felipeGomez];
        const fechas = elegirFechasViaje([CLIENTES_ASISTENCIA.oviedo, CLIENTES_ASISTENCIA.sartori, CLIENTES_ASISTENCIA.felipeGomez], DIAS_VIAJE_DEFAULT);
        const joven = edadCliente(CLIENTES_ASISTENCIA.oviedo, fechas.salida);
        const av = await entrarAPasajeros(page, "TerraWind", [joven, joven], fechas);
        for (const [index, cliente] of pasajeros.entries()) await av.completarPasajero(index, cliente);
        await esperarError(av, MENSAJES_EDAD.mayorQueCotizados);
    });

    test("Snuggle: un pasajero fuera de los rangos cotizados no avanza", async ({ page }) => {
        test.setTimeout(300000);
        await documentarValidacion(
            "Snuggle · pasajero fuera de los rangos cotizados",
            "Cotiza Redion para dos pasajeros de 0-75 y carga como pasajero 2 a Felipe Gomez (76-85): " +
                `"Siguiente" muestra "${MENSAJES_EDAD.ningunoCotizado}" y no pasa al resumen.`,
        );
        const fechas = elegirFechasViaje([CLIENTES_ASISTENCIA.oviedo, CLIENTES_ASISTENCIA.felipeGomez], DIAS_VIAJE_DEFAULT);
        const joven = edadCliente(CLIENTES_ASISTENCIA.oviedo, fechas.salida);
        const av = await entrarAPasajeros(page, "Europ_Assistance", [joven, joven], fechas);
        await av.completarPasajero(0, CLIENTES_ASISTENCIA.oviedo);
        await av.completarPasajero(1, CLIENTES_ASISTENCIA.felipeGomez);
        await esperarError(av, MENSAJES_EDAD.ningunoCotizado);
    });

    test("Snuggle: más pasajeros de un rango que los cotizados no avanza", async ({ page }) => {
        test.setTimeout(300000);
        await documentarValidacion(
            "Snuggle · más pasajeros de un rango que los cotizados",
            "Cotiza Redion para un pasajero de 0-75 y uno de 76-85 y carga dos clientes de 0-75: el segundo muestra " +
                `"${MENSAJES_EDAD.masQueCotizados}" y no pasa al resumen.`,
        );
        const fechas = elegirFechasViaje([CLIENTES_ASISTENCIA.oviedo, CLIENTES_ASISTENCIA.felipeGomez], DIAS_VIAJE_DEFAULT);
        const edades = edadesACotizar([CLIENTES_ASISTENCIA.oviedo, CLIENTES_ASISTENCIA.felipeGomez], fechas.salida);
        const av = await entrarAPasajeros(page, "Europ_Assistance", edades, fechas);
        await av.completarPasajero(0, CLIENTES_ASISTENCIA.oviedo);
        await av.completarPasajero(1, CLIENTES_ASISTENCIA.sartori);
        await esperarError(av, MENSAJES_EDAD.masQueCotizados);
    });

    test("El mismo documento en dos pasajeros no avanza", async ({ page }) => {
        test.setTimeout(300000);
        await documentarValidacion(
            "Documento repetido",
            "Cotiza TerraWind para dos pasajeros y carga el mismo CUIT en los dos: " +
                `"Siguiente" muestra "${MENSAJES_EDAD.documentoRepetido}" y no pasa al resumen.`,
        );
        const fechas = elegirFechasViaje([CLIENTES_ASISTENCIA.oviedo], DIAS_VIAJE_DEFAULT);
        const joven = edadCliente(CLIENTES_ASISTENCIA.oviedo, fechas.salida);
        const av = await entrarAPasajeros(page, "TerraWind", [joven, joven], fechas);
        await av.completarPasajero(0, CLIENTES_ASISTENCIA.oviedo);
        await av.completarPasajero(1, CLIENTES_ASISTENCIA.oviedo);
        await esperarError(av, MENSAJES_EDAD.documentoRepetido);
    });
});
