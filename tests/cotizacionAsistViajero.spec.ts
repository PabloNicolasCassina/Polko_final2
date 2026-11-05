import { test, expect, type Page, type TestInfo } from "@playwright/test";
import CotizarAsistenciaViajeroPage from "../pages/cotizarAsistenciaViajeroPage";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { documentarCaso } from "../helpers/documentarCaso";
import { mockUserDataString } from "../helpers/mockUser";
import { edadesACotizar, elegirFechasViaje, formatFechaAr } from "../helpers/edadViajero";
import {
    compararConAdmin,
    cotizarEnSnuggle,
    cotizarEnSnuggleAdmin,
    exigirTokenAdminVigente,
    planesDelProveedor,
    snuggleApiConfigurada,
    type CotizacionSnuggle,
    type PedidoCotizacionSnuggle,
} from "../helpers/snuggleApi";
import {
    CLIENTES_ASISTENCIA,
    COMPANIAS_ASISTENCIA,
    DIAS_COBERTURA_COTIZACION,
    PAISES_POR_REGION_SNUGGLE,
    type CompaniaAsistencia,
} from "../data/asistenciaViajeroEmision";

/**
 * Cotización de Asistencia al viajero por región de destino: un país por cada región de Snuggle
 * (Territorio Nacional, América del sur, Europa, Caribe, Países Limítrofes…) y 5, 15, 30 y 60 días de
 * cobertura. TerraWind y los cuatro proveedores de Snuggle (Snug Assist, AXA, Redion, Universal) tienen
 * que terminar con el tilde verde y planes con precio.
 *
 * Referencia: el admin de Snuggle. En paralelo con la cotización de Polko, el test hace para cada
 * proveedor la misma consulta que admin.snuggle.travel (`/api/internal/quoter/admin`, mismo viaje) y
 * Polko tiene que mostrar los mismos planes base (sin adicionales `addonOf`) con el mismo total (±$1,
 * la tarjeta redondea): si a Polko le llegan menos planes o con otro precio, falla. Polko renombra los
 * planes, por eso se cruza por precio. Si el admin tampoco tiene planes, queda "sin planes (confirmado
 * por Snuggle)" y no falla.
 *
 * Diagnóstico: también se consulta la API pública con la credencial de Polko (lo mismo que pide
 * microservice_products). Cada plan que falta en Polko se marca como "Snuggle no se lo manda a Polko"
 * (tampoco viene en la API) o "Polko lo pierde" (la API sí lo devuelve).
 *
 * Requiere en `Polko_final2/.env`: SNUGGLE_ADMIN_TOKEN (token de sesión del admin, vence cada hora:
 * DevTools → Network → `quoter/admin` → header Authorization sin "Bearer ") y SNUGGLE_CLIENT_ID /
 * SNUGGLE_CLIENT_SECRET para el diagnóstico.
 *
 * "Asia / Oceanía" no se cubre: ningún país de Polko se resuelve a esa región (`Snuggle/regions.py`).
 *
 * Un pasajero de 0-75 (Oviedo, edad real a la salida). Si un proveedor falla en Polko se recotiza una
 * vez con "Recotizar".
 *   npx playwright test tests/cotizacionAsistViajero.spec.ts --project=chromium --workers=2
 */

const PASAJEROS = [CLIENTES_ASISTENCIA.oviedo];
const COMPANIAS = Object.keys(COMPANIAS_ASISTENCIA) as CompaniaAsistencia[];

interface ResultadoCompania {
    estado: string;
    polko: number[];
    admin?: number[];
    api?: number[];
    diferencias?: string[];
}

async function applyUserMock(page: Page): Promise<void> {
    await page.route("**/newGetDatosUsuario*", async (route) => {
        await route.fulfill({ contentType: "application/json", body: mockUserDataString });
    });
}

const pesos = (monto: number): string => `$${monto.toLocaleString("es-AR")}`;

async function adjuntarJson(testInfo: TestInfo, nombre: string, body: unknown): Promise<void> {
    await testInfo.attach(nombre, { body: JSON.stringify(body, null, 2), contentType: "application/json" });
}

test.describe("Asistencia al viajero - Cotización por región y días de cobertura @regression", () => {
    test.afterEach(async ({ page }, testInfo) => {
        await attachBackendLogsOnFailure(testInfo, page);
    });

    for (const destino of PAISES_POR_REGION_SNUGGLE) {
        for (const dias of DIAS_COBERTURA_COTIZACION) {
            test(`${destino.regionSnuggle} (${destino.label}) · ${dias} días: Polko trae los mismos planes que Snuggle`, async ({
                page,
                request,
            }, testInfo) => {
                test.setTimeout(420000);
                await documentarCaso({
                    epic: "Asistencia al viajero",
                    feature: "Cotización por región",
                    story: destino.regionSnuggle,
                    severidad: "critical",
                    prioridad: "high",
                    descripcion:
                        `Cotiza asistencia al viajero a ${destino.label} (región Snuggle "${destino.regionSnuggle}") por ` +
                        `${dias} días con un pasajero de 0-75. En paralelo cotiza el mismo viaje en el admin de Snuggle ` +
                        "para Snug Assist, AXA, Redion y Universal. Cada proveedor tiene que tener en Polko el tilde verde " +
                        "y los mismos planes con el mismo precio que en el admin; TerraWind tiene que cotizar con precio.",
                    precondiciones:
                        "Usuario logueado (storageState del project), mock de usuario con TerraWind y los proveedores de " +
                        "Snuggle, frontend en localhost:3000, general_api y microservice_products con credenciales de " +
                        "Snuggle. SNUGGLE_ADMIN_TOKEN vigente y SNUGGLE_CLIENT_ID / SNUGGLE_CLIENT_SECRET en Polko_final2/.env.",
                    parametros: { País: destino.label, Región: destino.regionSnuggle, Días: String(dias) },
                    tags: ["asistencia-viajero", "cotizacion", "snuggle", "terrawind", "regression"],
                });

                exigirTokenAdminVigente();

                await applyUserMock(page);
                const av = new CotizarAsistenciaViajeroPage(page);
                const fechas = elegirFechasViaje(PASAJEROS, dias);
                const edades = edadesACotizar(PASAJEROS, fechas.salida);
                const pedido: PedidoCotizacionSnuggle = {
                    destinationRegion: destino.regionSnuggle,
                    salida: fechas.salida,
                    regreso: fechas.regreso,
                    edades,
                };

                await test.step("Ingresar al cotizador de Asistencia al viajero", () => av.goto());
                await test.step(`Destino: ${destino.label}`, () => av.seleccionarDestino(destino));
                await test.step(
                    `Fechas: ${formatFechaAr(fechas.salida)} → ${formatFechaAr(fechas.regreso)} (${dias} días de cobertura)`,
                    () => av.seleccionarFechas(fechas),
                );
                await test.step(`Edad del pasajero: ${edades.join(", ")}`, () => av.cargarEdades(edades));

                const companiasSnuggle = COMPANIAS.filter((c) => COMPANIAS_ASISTENCIA[c].proveedorAdmin);
                const adminPromise = Promise.all(
                    companiasSnuggle.map((c) => cotizarEnSnuggleAdmin(request, pedido, COMPANIAS_ASISTENCIA[c].proveedorAdmin!)),
                );
                const apiPromise = snuggleApiConfigurada() ? cotizarEnSnuggle(request, pedido) : null;
                adminPromise.catch(() => undefined);
                apiPromise?.catch(() => undefined);

                await test.step("Cotizar en Polko: el SSE lleva el país, las fechas y los días", async () => {
                    const body = await av.cotizar();
                    await adjuntarJson(testInfo, "asistencia-cotizacion-request.json", body);
                    expect(body?.nombrePais).toBe(destino.opcion);
                    expect(body?.vigenciaDesde).toBe(formatFechaAr(fechas.salida));
                    expect(body?.vigenciaHasta).toBe(formatFechaAr(fechas.regreso));
                    expect(Number(body?.travelDaysCounter)).toBe(dias);
                });

                const admin = await test.step("Admin de Snuggle: mismo viaje para cada proveedor", async () => {
                    const respuestas = await adminPromise;
                    await adjuntarJson(testInfo, "snuggle-admin-cotizacion.json", respuestas);
                    return Object.fromEntries(companiasSnuggle.map((c, i) => [c, respuestas[i]])) as Record<string, CotizacionSnuggle>;
                });
                const api = await test.step("API de Snuggle con la credencial de Polko (diagnóstico)", async () => {
                    if (!apiPromise) {
                        testInfo.annotations.push({
                            type: "Sin diagnóstico con la API de Polko",
                            description: "Faltan SNUGGLE_CLIENT_ID / SNUGGLE_CLIENT_SECRET en Polko_final2/.env",
                        });
                        return null;
                    }
                    const cotizacion = await apiPromise;
                    await adjuntarJson(testInfo, "snuggle-api-polko-cotizacion.json", cotizacion);
                    return cotizacion;
                });

                const resultados: Record<string, ResultadoCompania> = {};
                for (const compania of COMPANIAS) {
                    const { tile, label, proveedorSnuggle } = COMPANIAS_ASISTENCIA[compania];
                    await test.step(`${label}: tilde verde y mismos planes que Snuggle`, async () => {
                        const tildeVerde = await av.esperarCompania(tile);
                        await av.seleccionarCompania(tile, label);
                        const estado = tildeVerde ? await av.estadoCompania() : await av.estadoCompaniaConReintento();
                        const planes = estado === "con-planes" ? await av.leerPlanes() : [];
                        resultados[label] = { estado, polko: planes.map((p) => p.precio) };
                        if (!tildeVerde && estado === "con-planes") {
                            testInfo.annotations.push({ type: "Recotizó", description: `${label} cotizó recién con "Recotizar"` });
                        }
                        for (const plan of planes) {
                            expect.soft(plan.precio, `${label} · "${plan.nombre}" sin precio`).toBeGreaterThan(0);
                        }

                        const enAdmin = proveedorSnuggle ? planesDelProveedor(admin[compania], proveedorSnuggle) : null;
                        if (!enAdmin) {
                            expect.soft(estado, `${label} no cotizó ${destino.label} por ${dias} días (${estado})`).toBe("con-planes");
                            return;
                        }
                        const enApi = planesDelProveedor(api, proveedorSnuggle!);
                        resultados[label].admin = enAdmin.map((p) => p.total);
                        if (enApi) resultados[label].api = enApi.map((p) => p.total);

                        if (estado === "sin-planes" && enAdmin.length === 0) {
                            resultados[label].estado = "sin-planes (confirmado por Snuggle)";
                            resultados[label].diferencias = [];
                            testInfo.annotations.push({
                                type: "Sin planes (confirmado por Snuggle)",
                                description: `${label} · ${destino.label} ${dias} días: ${JSON.stringify(admin[compania].message ?? null)}`,
                            });
                            return;
                        }
                        expect.soft(estado, `${label} no cotizó ${destino.label} por ${dias} días (${estado})`).toBe("con-planes");
                        const diferencias = compararConAdmin(planes, enAdmin, enApi);
                        resultados[label].diferencias = diferencias;
                        expect
                            .soft(diferencias, `${label}: Polko vs admin de Snuggle para ${destino.label} ${dias} días`)
                            .toEqual([]);
                    });
                }

                await adjuntarJson(testInfo, "resultado-por-compania.json", resultados);
                testInfo.annotations.push({
                    type: "Resultado",
                    description: Object.entries(resultados)
                        .map(([label, r]) => {
                            const desde = r.polko.length ? ` desde ${pesos(Math.min(...r.polko))}` : "";
                            const vsAdmin = r.diferencias ? (r.diferencias.length ? ` ≠ admin (${r.polko.length}/${r.admin?.length})` : " = admin") : "";
                            return `${label}: ${r.estado}${desde}${vsAdmin}`;
                        })
                        .join(" · "),
                });
            });
        }
    }
});
