/// <reference types="node" />
import { test, expect, type Page, type Locator } from "@playwright/test";
import EmisionAutoPage from "../pages/emisionAutoPage";
import EmisionHogarPage from "../pages/emisionHogarPage";
import CotizarAPIAPage, {
    PRODUCTOS_AP,
    type DatosCotizacionAP,
    type EmitirOptsAP,
    type PlanAP,
    type ProductoAP,
} from "../pages/cotizarAPIAPage";
import EmisionAsistenciaViajeroPage, {
    type ClienteAv,
    type DestinoAsistenciaViajero,
} from "../pages/emisionAsistenciaViajeroPage";
import CotizarMotoIAPage, { PLAN_CODES_MOTO } from "../pages/cotizarMotoIAPage";
import MiCarteraPage, {
    ALERTA_MORA,
    ORIGEN_POLKO,
    ORIGEN_REPORTE_COBRANZA,
    TAB_EMITIDAS_POLKO,
    TAB_POLIZAS_PAGAS,
    type MiCarteraTab,
} from "../pages/miCarteraPage";
import MisSolicitudesPage from "../pages/misSolicitudesPage";
import CommonButtons from "../components/commonButtons";
import Companias from "../components/companias";
import CotizacionTabla from "../components/auto/cotizacionTabla";
import CotizacionTablaHogar from "../components/hogar/cotizacionTabla";
import { getMockUserData, type UserType } from "../helpers/mockUser";
import { buildAutoTestData } from "../helpers/testDataBuilder";
import { SSECapture } from "../helpers/sseCapture";
import { cotizarAuto, emitirAuto } from "../helpers/emisionAutoFlowsRedesign";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { documentarCaso } from "../helpers/documentarCaso";
import { registrarSuiteOperacionesPorFuera } from "../helpers/operacionesPorFueraSuite";
import asistenciaViajeroData from "../data/asistenciaViajero.json";
import { CUIT_ASEGURADO, CUIT_ASEGURADO_B, CUIT_TOMADOR_FISICA, CUIT_TOMADOR_JURIDICA } from "../data/apRoles";

// ============================================================================
// CONFIGURACIÓN PARA EJECUCIÓN PARALELA (4 workers, headless)
// ============================================================================
// - Cada test usa su propio contexto de página aislado
// - Los mocks se aplican por página, sin interferencia entre workers
// - Los datos de test son inmutables y se copian para cada ejecución


// ============================================================================
// DATOS BASE PARA REGRESIÓN
// ============================================================================

const autoBase = {
    marca: "RENAULT",
    año: "2022",
    modelo: "LOGAN",
    version: "LOGAN II 1.6 16V INTENS L/19",
    c_postal: "5000",
    localidad: "CORDOBA",
    tipoPersona: "Física",
    sitImpositiva: "Consumidor final",
    multi: false,
    descuento: true,
    ceroKm: false,
    cuitDni: "27381618426"
};

/** Mismo vehículo que motoHappyPath / motoConfigAvanzada (rediseño CotizarMotoIA). */
const VEHICULO_MOTO = { marca: "BENELLI", año: "2022", version: "LEONCINO 250", c_postal: "5000" };

const hogarBase = {
    tipoVivienda: "Casa",
    c_postal: "5000",
    localidad: "CORDOBA",
    tamanioVivienda: "Pequeña",
    formaPago: "Débito por CBU",
    descuento: true
};

/** Misma cotización base que apHappyPath (rediseño CotizarAPIa, Sancor). */
const apCotizacionBase: DatosCotizacionAP = {
    vigencia: "+30 días",
    cantPersonas: "2",
    actividad: "Servicios Comunales, Sociales y Personales",
    clasificacion: "Otros Servicios sin uso de herramientas",
    tarea: "Administrativo",
    c_postal: "5000",
};

const AP_ASEGURADOS = [CUIT_ASEGURADO, CUIT_ASEGURADO_B];

const avClienteSartori = asistenciaViajeroData.clienteSartori as ClienteAv;
const avClienteOviedo = asistenciaViajeroData.clienteOviedo as ClienteAv;

const polizaCarteraSartoriRivadavia = {
    cliente: "CARLA SARTORI",
    documento: "CUIT 27381618426",
    compania: "Rivadavia",
    producto: "Automotor",
    detalleCard: "Rivadavia - Automotor - 05/10/2026",
    monto: "$106.078",
    estado: "Emitida",
    descripcion: "Mega Plan - RENAULT LOGAN II 1.6 16V INTENS L/19, año 2022 - 05/10/2026",
    patente: "AI138TZ",
    nroPoliza: "6602492574000",
    acciones: ["Retención"],
    documentos: [
        "DOCUMENTACION_POLIZA_COMPLETA",
        "CERTIFICADO_COBERTURA",
        "FACTURA",
        "FRENTE_POLIZA_CUPONERA_PAGO_FACIL",
        "Comprobante de emisión",
    ],
};

const busquedasCarteraSartoriRivadavia = [
    { criterio: "patente", valor: polizaCarteraSartoriRivadavia.patente },
    { criterio: "número de póliza", valor: polizaCarteraSartoriRivadavia.nroPoliza },
];

const avRegresionConfigs: Array<{
    id: string;
    label: string;
    destino: DestinoAsistenciaViajero;
    edad: string;
    formaPago: string;
    cliente: ClienteAv;
}> = [
    {
        id: "TC-AV-AR",
        label: "Argentina",
        destino: "argentina",
        edad: "30",
        formaPago: "Transferencia",
        cliente: avClienteSartori,
    },
    {
        id: "TC-AV-US",
        label: "Estados Unidos",
        destino: "estados_unidos",
        edad: "30",
        formaPago: "Transferencia",
        cliente: avClienteSartori,
    },
    {
        id: "TC-AV-MULTI",
        label: "Multiples destinos",
        destino: "multiples",
        edad: "30",
        formaPago: "Transferencia",
        cliente: avClienteOviedo,
    },
];

// ============================================================================
// CONFIGURACIONES DE REGRESIÓN - AUTO (1 por compañía, la más completa)
// ============================================================================

const autoRegresionConfigs = [
    {
        compania: 'zurich',
        tieneConfigAvanzada: true,
        tieneGNC: false, // Zurich no maneja GNC en el flujo
        billingConfig: { type: "Mensual" },
        paymentCombo: { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
        installment: "1",
        descuento: 15
    },
    {
        compania: 'sancor',
        tieneConfigAvanzada: true,
        tieneGNC: true,
        billingConfig: { type: "Anual" },
        paymentCombo: { primary: "Tarjeta de crédito" },
        installment: "1",
        descuento: 15
    },
    {
        compania: 'federacion_patronal',
        tieneConfigAvanzada: true,
        tieneGNC: true,
        billingConfig: { type: "Mensual" },
        paymentCombo: { primary: "Débito por CBU" },
        installment: "1",
        // La matrícula FedPat del cliente Sartori (27381618426) quedó corrupta en sandbox
        // (ORA-02291 CADH_CACN_FK al vincular medio de pago): se usa Oviedo.
        cuitDni: "20386485446"
    },
    {
        compania: 'rivadavia',
        tieneConfigAvanzada: true,
        tieneGNC: true,
        billingConfig: { type: "Trimestral" },
        paymentCombo: { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
        installment: "3",
        descuento: 15
    },
    {
        compania: 'rus',
        tieneConfigAvanzada: true,
        tieneGNC: true,
        billingConfig: { type: "Mensual" },
        paymentCombo: { primary: "Tarjeta de crédito" },
        installment: "1",
        descuento: 15
    },
    {
        compania: 'atm',
        tieneConfigAvanzada: true,
        tieneGNC: true,
        billingConfig: { type: "Mensual" },
        paymentCombo: { primary: "Tarjeta de crédito" },
        installment: "1",
        descuento: 20
    },
    {
        compania: 'triunfo',
        tieneConfigAvanzada: true,
        tieneGNC: true,
        billingConfig: { type: "Mensual" },
        paymentCombo: { primary: "Medios electrónicos", secondary: "Tarjeta de crédito" },
        installment: "1",
        descuento: 20
    },
    {
        compania: 'mercantil_andina',
        tieneConfigAvanzada: true,
        tieneGNC: true,
        billingConfig: { type: "Mensual" },
        paymentCombo: { primary: "Tarjeta de crédito" },
        installment: "1",
        descuento: 25
    },
];

// ============================================================================
// CONFIGURACIONES DE REGRESIÓN - MOTO (rediseño CotizarMotoIA, 1 por compañía)
// Labels/códigos alineados con motoHappyPath.spec.ts + PLAN_CODES_MOTO.
// formaPago: preferencia en emisión (best-effort si la opción no existe).
// ============================================================================

const motoRegresionConfigs: Array<{
    compania: string;
    plan: string;
    formaPago: string;
    config?: Record<string, string>;
}> = [
    { compania: "Sancor", plan: "Moto Premium", formaPago: "Tarjeta de crédito" },
    { compania: "Rivadavia", plan: "Base Plus", formaPago: "Tarjeta de crédito" },
    {
        compania: "RUS",
        plan: "RCM c/grúa",
        formaPago: "Débito por CBU",
        config: { ajusteAutomatico: "No aplicar", usoVehiculo: "Particular" },
    },
    { compania: "ATM", plan: "Robo Premium", formaPago: "Tarjeta de crédito" },
];

// ============================================================================
// CONFIGURACIONES DE REGRESIÓN - AP (rediseño CotizarAPIa, Sancor)
// Subconjunto de apHappyPath.spec.ts: cada variante de tomador/vigencia una vez,
// alternando producto y plan para cubrir ambos.
// ============================================================================

const apRegresionConfigs: Array<{
    label: string;
    producto: ProductoAP;
    plan: PlanAP;
    cotizacion: DatosCotizacionAP;
    emitOpts: EmitirOptsAP;
}> = [
    {
        label: "+30 días / Física / Consumidor final",
        producto: PRODUCTOS_AP.ocasion,
        plan: "Sugerido",
        cotizacion: { ...apCotizacionBase },
        emitOpts: { formaPago: "Efectivo", tomador: CUIT_TOMADOR_FISICA, asegurados: AP_ASEGURADOS },
    },
    {
        label: "+30 días / Jurídica / Responsable inscripto",
        producto: PRODUCTOS_AP.integro,
        plan: "Sugerido",
        cotizacion: { ...apCotizacionBase, situacionImpositiva: "Responsable inscripto" },
        emitOpts: { formaPago: "Débito por CBU", tomador: CUIT_TOMADOR_JURIDICA, asegurados: AP_ASEGURADOS },
    },
    {
        label: "Por día / Física / Consumidor final",
        producto: PRODUCTOS_AP.integro,
        plan: "Intermedio",
        cotizacion: { ...apCotizacionBase, vigencia: "Por día", diasVigencia: 35 },
        emitOpts: { formaPago: "Tarjeta de crédito", tomador: CUIT_TOMADOR_FISICA, asegurados: AP_ASEGURADOS },
    },
];

// ============================================================================
// HELPERS
// ============================================================================

const companiasPosiblesAuto = [
    'zurich', 'sancor', 'federacion_patronal',
    'rivadavia', 'rus', 'experta', 'atm', 'triunfo', 'mercantil_andina'
];

function prepararDatosAuto(auto: any, companiaActiva: string): any {
    for (const compania of companiasPosiblesAuto) {
        if (auto.hasOwnProperty(compania)) {
            auto[compania] = false;
        }
    }
    if (auto.hasOwnProperty(companiaActiva)) {
        auto[companiaActiva] = true;
    } else {
        auto[companiaActiva] = true;
    }
    return auto;
}

// ============================================================================
// HOOKS OPTIMIZADOS PARA EJECUCIÓN PARALELA
// ============================================================================

/**
 * Configura el mock de usuario y navega a la URL del test.
 * Si se pasa `ready`, espera ese locator (form hidratado). Ante shell en blanco
 * bajo carga (4 workers), recarga y reintenta — subir timeout solo no alcanza.
 */
async function setupPageWithMock(
    page: Page,
    targetUrl: string,
    userType: UserType = "master",
    ready?: Locator,
): Promise<void> {
    const mockData = getMockUserData(userType);
    const FORM_READY_TIMEOUT = 30000;
    const GOTO_ATTEMPTS = 3;

    await page.route("http://localhost:8080/newGetDatosUsuario?es_master=true*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockData,
        });
    });

    if (!ready) {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
        return;
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= GOTO_ATTEMPTS; attempt++) {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
        try {
            await expect(
                ready,
                `Contenido de ${targetUrl} no cargó (posible shell en blanco bajo carga)`,
            ).toBeVisible({ timeout: FORM_READY_TIMEOUT });
            return;
        } catch (error) {
            lastError = error;
            if (attempt === GOTO_ATTEMPTS) break;
        }
    }
    throw lastError;
}

const PRECONDICIONES_EMISION =
    "Usuario logueado (storageState del project), datos de usuario mockeados (master) con compañías habilitadas, " +
    "frontend en localhost:3000 y backends levantados.";

const PRECONDICIONES_FLUJO_WEB =
    "Usuario logueado (storageState del project), datos de usuario mockeados (master), frontend en localhost:3000, " +
    "backends levantados y cartera/solicitudes con datos cargados en el entorno pre.";

async function documentarFlujoWeb(feature: string, descripcion: string, tags: string[] = []): Promise<void> {
    await documentarCaso({
        epic: "Regresión",
        feature,
        severidad: "normal",
        prioridad: "medium",
        descripcion,
        precondiciones: PRECONDICIONES_FLUJO_WEB,
        tags: ["regression", "flujos-web", ...tags],
    });
}

// Hook global para adjuntar logs en caso de fallo
test.afterEach(async ({ page }, testInfo) => {
    await attachBackendLogsOnFailure(testInfo);
});

// ============================================================================
// TESTS DE REGRESIÓN - AUTO
// ============================================================================

test.describe('Regresión Auto', () => {
    // Habilitar ejecución paralela dentro de este describe
    test.describe.configure({ mode: 'parallel' });

    for (const regConfig of autoRegresionConfigs) {
        test(`[Regresión] Emisión Auto - ${regConfig.compania}`, async ({ page }, testInfo) => {
            // Mercantil Andina completa la inspección en una pestaña externa
            // (tst.barbara.com.ar), lo que agrega tiempo extra al flujo.
            // Emisión (último paso) puede demorar varios minutos en "Emitiendo...".
            test.setTimeout(regConfig.compania === 'mercantil_andina' ? 480000 : 360000);

            const formaPagoAuto = [regConfig.paymentCombo.primary, regConfig.paymentCombo.secondary]
                .filter(Boolean)
                .join(" / ");
            const descuentoAuto = regConfig.descuento !== undefined ? `${regConfig.descuento}%` : "sin descuento";
            await documentarCaso({
                epic: "Regresión",
                feature: "Emisión Auto",
                severidad: "critical",
                prioridad: "high",
                descripcion:
                    `Cotiza un ${autoBase.marca} ${autoBase.modelo} ${autoBase.año} en el cotizador de automotor, ` +
                    `selecciona ${regConfig.compania}${regConfig.tieneGNC ? " con GNC" : ""}, aplica configuración avanzada ` +
                    `(facturación ${regConfig.billingConfig.type}, ${regConfig.installment} cuota/s, ${descuentoAuto}) ` +
                    `y emite pagando con ${formaPagoAuto}. ` +
                    "Espera emisión exitosa.",
                precondiciones: PRECONDICIONES_EMISION,
                parametros: {
                    Compañía: regConfig.compania,
                    GNC: String(regConfig.tieneGNC),
                    Facturación: regConfig.billingConfig.type,
                    Cuotas: regConfig.installment,
                    "Forma de pago": formaPagoAuto,
                    Descuento: descuentoAuto,
                },
                tags: ["auto", "regression"],
            });

            // Configurar captura de eventos SSE (no bloquea la conexión)
            const sseCapture = new SSECapture(page);
            await sseCapture.setup('sse');

            try {
                // Crear copia inmutable de datos para este worker
                const cuitDniOverride = (regConfig as any).cuitDni;
                const datosAutoParaTest = buildAutoTestData({
                    autoBase: { ...autoBase, ...(cuitDniOverride ? { cuitDni: cuitDniOverride } : {}) },
                    compania: regConfig.compania,
                    tieneConfigAvanzada: regConfig.tieneConfigAvanzada,
                    tieneGNC: regConfig.tieneGNC,
                    billingConfig: regConfig.billingConfig,
                    paymentCombo: regConfig.paymentCombo,
                    installment: regConfig.installment,
                    descuento: regConfig.descuento
                });

                const emisionAutoPage = new EmisionAutoPage(page);
                const companias = new Companias(page);
                const cotizacionTabla = new CotizacionTabla(page);

                await setupPageWithMock(
                    page,
                    "http://localhost:3000/u/cotizar/automotor",
                    "master",
                    page.locator('[id="select_vehiculo.marca"]'),
                );

                await page.route('**/emitir/auto', async (route) => {
                    const body = JSON.parse(route.request().postData() || '{}');
                    if (body.vehiculo && !body.vehiculo.detalle_marca) {
                        body.vehiculo.detalle_marca = datosAutoParaTest.marca;
                        body.vehiculo.detalle_modelo = datosAutoParaTest.modelo;
                        body.vehiculo.detalle_version = datosAutoParaTest.version;
                    }
                    await route.continue({ postData: JSON.stringify(body) });
                });

                prepararDatosAuto(datosAutoParaTest, regConfig.compania);
                const valorTabla = await cotizarAuto(test, page, datosAutoParaTest, regConfig.compania, emisionAutoPage, companias, cotizacionTabla, false);
                // Extender timeout antes del último paso (emisión puede superar 6 min).
                test.setTimeout(regConfig.compania === 'mercantil_andina' ? 540000 : 420000);
                await emitirAuto(test, page, datosAutoParaTest, regConfig.compania, valorTabla, emisionAutoPage, { incluirDescarga: false });
            } finally {
                // Adjuntar eventos SSE capturados al reporte SIEMPRE, incluso si falla
                await sseCapture.attachToReport(testInfo, regConfig.compania);
            }
        });
    }
});

// ============================================================================
// TESTS DE REGRESIÓN - MOTO (CotizarMotoIA, mismos selectores que motoHappyPath)
// ============================================================================

test.describe("Regresión Moto", () => {
    test.describe.configure({ mode: "parallel" });

    for (const regConfig of motoRegresionConfigs) {
        const codigo = PLAN_CODES_MOTO[regConfig.compania][regConfig.plan];

        test(`[Regresión] Emisión Moto - ${regConfig.compania} "${regConfig.plan}" (${codigo})`, async ({
            page,
        }, testInfo) => {
            test.setTimeout(240000);

            const configMoto = regConfig.config ?? {};
            await documentarCaso({
                epic: "Regresión",
                feature: "Emisión Moto",
                severidad: "critical",
                prioridad: "high",
                descripcion:
                    `Cotiza una ${VEHICULO_MOTO.marca} ${VEHICULO_MOTO.version} ${VEHICULO_MOTO.año} con el cotizador de Moto IA, ` +
                    `selecciona ${regConfig.compania}` +
                    `${Object.keys(configMoto).length > 0 ? ", aplica configuración avanzada" : ""} ` +
                    `y emite el plan "${regConfig.plan}" (${codigo}) pagando con ${regConfig.formaPago}. Espera emisión exitosa.`,
                precondiciones: PRECONDICIONES_EMISION,
                parametros: {
                    Compañía: regConfig.compania,
                    Plan: `${regConfig.plan} (${codigo})`,
                    "Forma de pago": regConfig.formaPago,
                    ...configMoto,
                },
                tags: ["moto", "regression"],
            });

            const sseCapture = new SSECapture(page);
            await sseCapture.setup("sse");

            try {
                const cotizarMotoIA = new CotizarMotoIAPage(page);

                await test.step("1- Cotizar", async () => {
                    await cotizarMotoIA.goto();
                    await cotizarMotoIA.cotizarVehiculo(VEHICULO_MOTO);
                    await cotizarMotoIA.selectCompania(regConfig.compania);
                });

                if (Object.keys(configMoto).length > 0) {
                    await test.step("2- Aplicar configuración avanzada", async () => {
                        await cotizarMotoIA.aplicarConfigCase(regConfig.compania, configMoto);
                    });
                }

                await test.step(`3- Verificar plan ${codigo}`, async () => {
                    const plan = cotizarMotoIA.planCard(codigo);
                    await expect(plan).toBeVisible();
                    await expect(plan.locator(".ctrowAuto__price")).not.toHaveText("$0");
                });

                await test.step("4- Emitir", async () => {
                    await cotizarMotoIA.emitirPlan(codigo, { formaPago: regConfig.formaPago });
                    await cotizarMotoIA.assertEmisionExitosa();
                });
            } finally {
                await sseCapture.attachToReport(testInfo, regConfig.compania);
            }
        });
    }
});

// ============================================================================
// TEST DE REGRESIÓN - HOGAR
// ============================================================================

test('[Regresión] Emisión Hogar', async ({ page }, testInfo) => {
    test.setTimeout(360000); // Cotización + emisión (último paso puede demorar)

    await documentarCaso({
        epic: "Regresión",
        feature: "Emisión Hogar",
        severidad: "critical",
        prioridad: "high",
        descripcion:
            `Cotiza un seguro de hogar (${hogarBase.tipoVivienda} ${hogarBase.tamanioVivienda}, CP ${hogarBase.c_postal}) ` +
            `y emite la cobertura pagando con ${hogarBase.formaPago}. Espera emisión exitosa.`,
        precondiciones: PRECONDICIONES_EMISION,
        parametros: {
            Vivienda: `${hogarBase.tipoVivienda} ${hogarBase.tamanioVivienda}`,
            "Forma de pago": hogarBase.formaPago,
        },
        tags: ["hogar", "regression"],
    });

    // Configurar captura de eventos SSE (no bloquea la conexión)
    const sseCapture = new SSECapture(page);
    await sseCapture.setup('sse');

    try {
        const emisionHogarPage = new EmisionHogarPage(page);
        const commonButtons = new CommonButtons(page);
        const cotizacionTabla = new CotizacionTablaHogar(page);

        // Crear copia inmutable de datos para este worker
        const datosDelTest = { ...hogarBase };

        // Setup optimizado: mock + navegación directa
        await setupPageWithMock(
            page,
            "http://localhost:3000/u/cotizar/hogar",
            "master",
            commonButtons.siguienteBtn,
        );

        // COTIZACIÓN
        let valorTabla: string | null = null;

        await test.step(`📝Flujo cotización póliza hogar`, async () => {
            await test.step("1- Completar datos del Hogar", async () => {
                await emisionHogarPage.seleccionarHogar(datosDelTest);
            });

            await test.step("2- Flujo tabla de cotización", async () => {
                await emisionHogarPage.tablaCotizacion();
                valorTabla = await cotizacionTabla.getValorCoberturaTabla();
                await commonButtons.siguienteBtn.click();
            });
        });

        // EMISIÓN
        await test.step(`📝Flujo emisión póliza hogar`, async () => {
            await test.step("1- Carga adicionales", async () => {
                await emisionHogarPage.emitirInspeccion();
            });

            await test.step("2- Completar datos de pago", async () => {
                await emisionHogarPage.emitirFormaPago(datosDelTest);
            });

            await test.step("3- Completar detalle de cliente", async () => {
                await emisionHogarPage.emitirCliente();
            });

            await test.step("4- Emisión de póliza", async () => {
                test.setTimeout(420000);
                await emisionHogarPage.emitirFinal(valorTabla);
            });
        });
    } finally {
        // Adjuntar eventos SSE capturados al reporte SIEMPRE, incluso si falla
        await sseCapture.attachToReport(testInfo, 'hogar');
    }
});

// ============================================================================
// TEST DE REGRESIÓN - AP (ACCIDENTES PERSONALES)
// ============================================================================

test.describe("Regresión AP", () => {
    test.describe.configure({ mode: "parallel" });

    for (const regConfig of apRegresionConfigs) {
        test(`[Regresión] Emisión AP - Sancor ${regConfig.producto} "${regConfig.plan}" (${regConfig.label})`, async ({
            page,
        }, testInfo) => {
            test.setTimeout(300000);

            const formaPagoAp = regConfig.emitOpts.formaPago ?? "Efectivo";
            await documentarCaso({
                epic: "Regresión",
                feature: "Emisión Accidentes Personales",
                severidad: "critical",
                prioridad: "high",
                descripcion:
                    `Cotiza Accidentes Personales (${regConfig.label}) con el cotizador de AP IA y emite en Sancor ` +
                    `el plan "${regConfig.plan}" del producto ${regConfig.producto} pagando con ${formaPagoAp}. ` +
                    "Espera que el plan tenga precio y que la emisión sea exitosa.",
                precondiciones: PRECONDICIONES_EMISION,
                parametros: {
                    Compañía: "Sancor",
                    Producto: regConfig.producto,
                    Plan: regConfig.plan,
                    Variante: regConfig.label,
                    "Forma de pago": formaPagoAp,
                },
                tags: ["ap", "regression"],
            });

            const sseCapture = new SSECapture(page);
            await sseCapture.setup("sse");

            try {
                const cotizarAP = new CotizarAPIAPage(page);

                await page.route("**/newGetDatosUsuario*", async (route) => {
                    await route.fulfill({
                        contentType: "application/json",
                        body: getMockUserData("master"),
                    });
                });

                await test.step("1- Cotizar", async () => {
                    await cotizarAP.goto();
                    await cotizarAP.cotizarAP(regConfig.cotizacion);
                });

                await test.step(`2- Verificar plan ${regConfig.producto} / ${regConfig.plan}`, async () => {
                    await cotizarAP.esperarPlan(regConfig.producto, regConfig.plan);
                    expect(await cotizarAP.planPrecio(regConfig.producto, regConfig.plan)).toBeGreaterThan(0);
                });

                await test.step("3- Emitir", async () => {
                    await cotizarAP.emitirPlan(regConfig.producto, regConfig.plan, regConfig.emitOpts);
                    await cotizarAP.assertEmisionExitosa();
                });
            } finally {
                await sseCapture.attachToReport(testInfo, `ap-sancor-${regConfig.producto}`);
            }
        });
    }
});

// ============================================================================
// TESTS DE REGRESIÓN - ASISTENCIA AL VIAJERO (TerraWind)
// ============================================================================

test.describe("Regresión Asistencia al viajero", () => {
    // TerraWind rate-limita emisiones concurrentes (429); correr en serie.
    test.describe.configure({ mode: "serial" });

    for (const regConfig of avRegresionConfigs) {
        test(`[Regresión] Emisión Asistencia Viajero - ${regConfig.label}`, async ({ page }, testInfo) => {
            test.setTimeout(600000);
            testInfo.annotations.push({ type: "ticket", description: regConfig.id });

            await documentarCaso({
                epic: "Regresión",
                feature: "Emisión Asistencia al viajero",
                severidad: "critical",
                prioridad: "high",
                descripcion:
                    `Cotiza y emite asistencia al viajero con TerraWind para destino ${regConfig.label} ` +
                    `(edad ${regConfig.edad}, ${regConfig.formaPago}) con fechas aleatorias de 5 días, ` +
                    "reintentando ante error 520 de la aseguradora. Espera emisión exitosa.",
                precondiciones:
                    `${PRECONDICIONES_EMISION} Corre en serie porque TerraWind rechaza emisiones concurrentes (429).`,
                parametros: {
                    "ID caso": regConfig.id,
                    Destino: regConfig.label,
                    Edad: regConfig.edad,
                    "Forma de pago": regConfig.formaPago,
                },
                tags: ["asistencia-viajero", "regression"],
            });

            const sseCapture = new SSECapture(page);
            await sseCapture.setup("sse");

            try {
                const emisionAvPage = new EmisionAsistenciaViajeroPage(page);
                const cliente: ClienteAv = { ...regConfig.cliente };

                await setupPageWithMock(
                    page,
                    "http://localhost:3000/u/cotizar/asistencia_viajero",
                    "master",
                    emisionAvPage.cotizacion.aceptarButton,
                );

                await test.step("1- Cerrar modal de compañías", async () => {
                    await emisionAvPage.cerrarModalCompanias();
                });

                await test.step(
                    `2- Cotizar y emitir ${regConfig.label} (fechas random 5 días, retry ante 520)`,
                    async () => {
                        const result = await emisionAvPage.cotizarYEmitirConFechasAleatorias({
                            destino: regConfig.destino,
                            edad: regConfig.edad,
                            formaPago: regConfig.formaPago,
                            cliente,
                            diasPeriodo: 5,
                            maxReintentos: 6,
                        });
                        testInfo.annotations.push({
                            type: "av-fechas",
                            description: `${result.rango} (intento ${result.attempt})`,
                        });
                    }
                );
            } finally {
                await sseCapture.attachToReport(testInfo, `av-${regConfig.destino}`);
            }
        });
    }
});

// ============================================================================
// FLUJOS DE LA WEB (smoke)
// ============================================================================

test.describe("Flujos de la web", () => {
    test.describe.configure({ mode: "parallel" });

    test("Mi cartera - barra de búsqueda", async ({ page }) => {
        test.setTimeout(180000);
        await documentarFlujoWeb(
            "Mi cartera",
            "Busca por nombre de cliente en Mi cartera (oviedo y luego sartori) y verifica que las cards filtradas " +
                "coincidan, que la búsqueda se mantenga al cambiar a Pólizas pagas y que al limpiarla vuelva el listado completo.",
            ["mi-cartera"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();
        await expect(miCartera.tab(TAB_EMITIDAS_POLKO)).toHaveAttribute("aria-selected", "true");
        await expect(miCartera.listTitle).toHaveText(TAB_EMITIDAS_POLKO);
        await miCartera.limpiarFiltrosSelect();

        let resultadosOviedo = 0;

        await test.step("Buscar oviedo y verificar resultados", async () => {
            await miCartera.buscar("oviedo");
            await expect(miCartera.cards.first()).toBeVisible({ timeout: 15000 });

            resultadosOviedo = await miCartera.getResultadosCount();
            expect(resultadosOviedo).toBeGreaterThan(0);

            const titles = await miCartera.getVisibleTitles();
            expect(titles.length).toBeGreaterThan(0);
            for (const title of titles) {
                expect(title, `La card "${title}" debería coincidir con oviedo`).toMatch(/oviedo/i);
            }
        });

        await test.step("La pestaña Pólizas pagas muestra el conteo de la búsqueda", async () => {
            await expect(miCartera.tabSearchHint(TAB_POLIZAS_PAGAS)).toHaveText(/^\d+$/);
            await expect(miCartera.tabSearchHint(TAB_EMITIDAS_POLKO)).toHaveCount(0);
        });

        await test.step("Buscar sartori y verificar que cambió", async () => {
            await miCartera.buscar("sartori");
            await expect(miCartera.cards.first()).toBeVisible({ timeout: 15000 });

            const resultadosSartori = await miCartera.getResultadosCount();
            expect(resultadosSartori).toBeGreaterThan(0);
            expect(resultadosSartori).not.toBe(resultadosOviedo);

            const titles = await miCartera.getVisibleTitles();
            expect(titles.length).toBeGreaterThan(0);
            for (const title of titles) {
                expect(title, `La card "${title}" debería coincidir con sartori`).toMatch(/sartori/i);
            }
        });

        await test.step("La búsqueda se mantiene al cambiar a Pólizas pagas", async () => {
            await miCartera.irATab(TAB_POLIZAS_PAGAS);
            await expect(miCartera.searchInput).toHaveValue("sartori");
            await expect(miCartera.counter).toBeVisible();
            const titles = await miCartera.getVisibleTitles();
            for (const title of titles) {
                expect(title, `La card "${title}" debería coincidir con sartori`).toMatch(/sartori/i);
            }
        });

        await test.step("Limpiar la búsqueda vuelve al listado completo", async () => {
            await miCartera.limpiarBusqueda();
            await expect(miCartera.counter).toBeHidden();
            await expect(miCartera.tabSearchHint(TAB_EMITIDAS_POLKO)).toHaveCount(0);
        });
    });

    for (const { criterio, valor } of busquedasCarteraSartoriRivadavia) {
        test(`Mi cartera - búsqueda por ${criterio} y detalle de la póliza`, async ({ page }, testInfo) => {
            test.setTimeout(180000);
            const miCartera = new MiCarteraPage(page);
            const poliza = polizaCarteraSartoriRivadavia;
            await documentarCaso({
                epic: "Regresión",
                feature: "Mi cartera",
                severidad: "normal",
                prioridad: "medium",
                descripcion:
                    `Busca en Mi cartera por ${criterio} y verifica que el único resultado sea la póliza de ${poliza.cliente} ` +
                    `en ${poliza.compania}; abre el detalle y valida datos del cliente, monto, estado, identificadores, ` +
                    "acciones y documentación.",
                precondiciones: PRECONDICIONES_FLUJO_WEB,
                parametros: { Criterio: criterio, Valor: valor },
                tags: ["regression", "flujos-web", "mi-cartera"],
            });

            await setupPageWithMock(
                page,
                "http://localhost:3000/u/micartera",
                "master",
                miCartera.counter,
            );
            await miCartera.waitForListaCargada();
            await miCartera.limpiarFiltrosSelect();

            const card = miCartera.cardConTextos(poliza.cliente, poliza.detalleCard, poliza.monto);

            await test.step(`Buscar ${criterio} ${valor}`, async () => {
                await miCartera.buscar(valor);
                await expect(miCartera.cards.first()).toBeVisible({ timeout: 15000 });
                await expect(miCartera.counter).toHaveText("1 resultados");
                await expect(miCartera.cards).toHaveCount(1);
            });

            await test.step("El resultado es la póliza de CARLA SARTORI en Rivadavia", async () => {
                await expect(card).toHaveCount(1);
                await expect(card.locator(".MiCarteraEmissionCard__title")).toHaveText(poliza.cliente);
                await expect(miCartera.cardDocument(card)).toHaveText(poliza.documento);
                await expect(card.locator(".MiCarteraEmissionCard__detail")).toHaveText(poliza.detalleCard);
                await expect(miCartera.cardAmount(card)).toHaveText(poliza.monto);
                await expect(miCartera.cardStatus(card)).toHaveText(poliza.estado);
            });

            await test.step("Click en la card resultante y verificar el detalle de la póliza", async () => {
                await miCartera.abrirCard(card);
                await expect(miCartera.cards).toHaveCount(0);

                await expect(miCartera.detailBackButton).toHaveText("Volver a pólizas emitidas en Polko");
                await expect(miCartera.detailRecotizarLink).toHaveText(/Recotizar en Polko/);
                await expect(miCartera.detailTitle).toHaveText(poliza.cliente);
                await expect(miCartera.detailClientDocument).toHaveText(poliza.documento);
                await expect(miCartera.detailCompanyName).toHaveText(poliza.compania);
                await expect(miCartera.detailProduct).toHaveText(poliza.producto);
                await expect(miCartera.detailAmount).toHaveText(poliza.monto);
                await expect(miCartera.detailStatus).toHaveText(poliza.estado);
                await expect(miCartera.detailDescription).toHaveText(poliza.descripcion);
                await expect(miCartera.detailIdentifiers).toContainText(poliza.nroPoliza);
                await expect(miCartera.detailIdentifiers).toContainText(/Número de Póliza/i);
                await expect(miCartera.detailOrigin).toContainText(ORIGEN_POLKO);
                await expect(miCartera.detailActionButtons).toHaveText(poliza.acciones);
                await expect(miCartera.detailDocumentsTitle).toHaveText("Documentación");
                await expect(miCartera.detailDocumentLabels).toHaveText(poliza.documentos);

                await testInfo.attach(`detalle-poliza-${criterio}`, {
                    body: await miCartera.detail.screenshot(),
                    contentType: "image/png",
                });
            });
        });
    }

    test("Mi cartera - selector de compañías", async ({ page }) => {
        test.setTimeout(300000);
        await documentarFlujoWeb(
            "Mi cartera",
            "En Pólizas emitidas en Polko filtra por cada compañía del selector y verifica que todas las cards visibles " +
                "pertenezcan a la compañía elegida.",
            ["mi-cartera"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();
        await miCartera.limpiarBusqueda();
        await miCartera.limpiarFiltrosSelect();

        const companias = await miCartera.obtenerOpciones(miCartera.companySelect);
        expect(companias.length, "Debería haber al menos una compañía en el selector").toBeGreaterThan(0);

        for (const compania of companias) {
            await test.step(`Filtrar por compañía: ${compania}`, async () => {
                await miCartera.limpiarSelect(miCartera.productSelect);
                await miCartera.limpiarSelect(miCartera.statusSelect);
                await miCartera.seleccionarOpcion(miCartera.companySelect, compania);

                await expect(miCartera.cards.first()).toBeVisible({ timeout: 15000 });
                expect(await miCartera.getResultadosCount()).toBeGreaterThan(0);

                const details = await miCartera.getVisibleDetails();
                expect(details.length).toBeGreaterThan(0);
                for (const detail of details) {
                    expect(
                        MiCarteraPage.companyFromDetail(detail),
                        `Detalle "${detail}" debería ser de ${compania}`,
                    ).toBe(compania);
                }
            });
        }
    });

    test("Mi cartera - selector de producto", async ({ page }) => {
        test.setTimeout(300000);
        await documentarFlujoWeb(
            "Mi cartera",
            "En Pólizas emitidas en Polko filtra por cada producto del selector y verifica que todas las cards visibles " +
                "sean del producto elegido.",
            ["mi-cartera"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();
        await miCartera.limpiarBusqueda();
        await miCartera.limpiarFiltrosSelect();

        const productos = await miCartera.obtenerOpciones(miCartera.productSelect);
        expect(productos.length, "Debería haber al menos un producto en el selector").toBeGreaterThan(0);

        for (const producto of productos) {
            await test.step(`Filtrar por producto: ${producto}`, async () => {
                await miCartera.limpiarSelect(miCartera.companySelect);
                await miCartera.limpiarSelect(miCartera.statusSelect);
                await miCartera.seleccionarOpcion(miCartera.productSelect, producto);

                await expect(miCartera.cards.first()).toBeVisible({ timeout: 15000 });
                expect(await miCartera.getResultadosCount()).toBeGreaterThan(0);

                const details = await miCartera.getVisibleDetails();
                expect(details.length).toBeGreaterThan(0);
                for (const detail of details) {
                    expect(
                        MiCarteraPage.productFromDetail(detail),
                        `Detalle "${detail}" debería ser producto ${producto}`,
                    ).toBe(producto);
                }
            });
        }
    });

    test("Mi cartera - selector de estado", async ({ page }) => {
        test.setTimeout(300000);
        await documentarFlujoWeb(
            "Mi cartera",
            "En Pólizas emitidas en Polko filtra por cada estado del selector y verifica que todas las cards visibles " +
                "tengan el estado elegido.",
            ["mi-cartera"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();
        await miCartera.limpiarBusqueda();
        await miCartera.limpiarFiltrosSelect();

        const estados = await miCartera.obtenerOpciones(miCartera.statusSelect);
        expect(estados.length, "Debería haber al menos un estado en el selector").toBeGreaterThan(0);

        for (const estado of estados) {
            await test.step(`Filtrar por estado: ${estado}`, async () => {
                await miCartera.limpiarSelect(miCartera.companySelect);
                await miCartera.limpiarSelect(miCartera.productSelect);
                await miCartera.seleccionarOpcion(miCartera.statusSelect, estado);

                await expect(miCartera.cards.first()).toBeVisible({ timeout: 15000 });
                expect(await miCartera.getResultadosCount()).toBeGreaterThan(0);

                const statuses = await miCartera.getVisibleStatuses();
                expect(statuses.length).toBeGreaterThan(0);
                for (const status of statuses) {
                    expect(status, `Estado visible "${status}" debería ser ${estado}`).toBe(estado);
                }
            });
        }
    });

    test("Mi cartera - Pólizas pagas: aviso de datos de pago y fuente del dato", async ({ page }) => {
        test.setTimeout(240000);
        await documentarFlujoWeb(
            "Mi cartera - Pólizas pagas",
            "En Pólizas pagas verifica el aviso de actualización mensual de datos de pago (cerrar y reabrir), los filtros " +
                "propios de la pestaña y el filtro Fuente del dato (Polko / Reporte de cobranza) con su contador.",
            ["mi-cartera", "polizas-pagas"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();
        await miCartera.irATab(TAB_POLIZAS_PAGAS);

        await test.step("Sin filtros: aviso abierto, sin contador y con filtros propios de la pestaña", async () => {
            await expect(miCartera.listSubtitle).toContainText("registraron pagos");
            await expect(miCartera.paymentNotice).toBeVisible();
            await expect(miCartera.paymentNotice).toContainText(
                "Los datos de pago se actualizan una vez al mes",
            );
            await expect(miCartera.paymentNoticeUpdatedDate).toHaveText(/^\d{2} \S{3} \d{4}$/);
            await expect(miCartera.counter).toBeHidden();
            await expect(miCartera.statusSelect).toBeHidden();
            await expect(miCartera.originSelect).toBeVisible();
            await expect(miCartera.moraButton).toHaveAttribute("aria-label", ALERTA_MORA);
            await expect(miCartera.moraButton).toHaveAttribute("aria-pressed", "false");
            await expect(miCartera.exportButton).toBeVisible();
        });

        await test.step("Cerrar y reabrir el aviso", async () => {
            await miCartera.paymentNoticeClose.click();
            await expect(miCartera.paymentNotice).toBeHidden();
            await expect(miCartera.paymentNoticeTrigger).toBeVisible();

            await miCartera.paymentNoticeTrigger.click();
            await expect(miCartera.paymentNotice).toBeVisible();
            await expect(miCartera.paymentNoticeTrigger).toBeHidden();
        });

        await test.step("Fuente del dato: opciones disponibles", async () => {
            const origenes = await miCartera.obtenerOpciones(miCartera.originSelect);
            expect(origenes).toEqual([ORIGEN_POLKO, ORIGEN_REPORTE_COBRANZA]);
        });

        await test.step(`Fuente del dato: ${ORIGEN_POLKO}`, async () => {
            await miCartera.seleccionarOpcionServer(miCartera.originSelect, ORIGEN_POLKO, "origin");
            await expect(miCartera.counter).toBeVisible();

            if ((await miCartera.getResultadosCount()) === 0) {
                await expect(miCartera.emptyState).toBeVisible();
                return;
            }
            const cards = await miCartera.cards.count();
            await expect(miCartera.cardsOrigenPolko()).toHaveCount(cards);
        });

        await test.step(`Fuente del dato: ${ORIGEN_REPORTE_COBRANZA}`, async () => {
            await miCartera.seleccionarOpcionServer(miCartera.originSelect, ORIGEN_REPORTE_COBRANZA, "origin");
            await expect(miCartera.counter).toBeVisible();

            if ((await miCartera.getResultadosCount()) === 0) {
                await expect(miCartera.emptyState).toBeVisible();
                return;
            }
            await expect(miCartera.cardsOrigenPolko()).toHaveCount(0);
        });

        await test.step("Limpiar fuente del dato oculta el contador", async () => {
            await miCartera.limpiarSelectServer(miCartera.originSelect, "origin");
            await expect(miCartera.counter).toBeHidden();
            await expect(miCartera.cards.first()).toBeVisible();
        });
    });

    test("Mi cartera - Pólizas pagas: selector de compañías", async ({ page }) => {
        test.setTimeout(300000);
        await documentarFlujoWeb(
            "Mi cartera - Pólizas pagas",
            "En Pólizas pagas filtra por cada compañía del selector (filtro server-side) y verifica que las cards sean " +
                "de esa compañía o que se muestre el estado vacío.",
            ["mi-cartera", "polizas-pagas"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();
        await miCartera.irATab(TAB_POLIZAS_PAGAS);

        const companias = await miCartera.obtenerOpciones(miCartera.companySelect);
        expect(companias.length, "Debería haber al menos una compañía en el selector").toBeGreaterThan(0);

        for (const compania of companias) {
            await test.step(`Filtrar por compañía: ${compania}`, async () => {
                await miCartera.seleccionarOpcionServer(miCartera.companySelect, compania, "company");
                await expect(miCartera.counter).toBeVisible();

                if ((await miCartera.getResultadosCount()) === 0) {
                    await expect(miCartera.emptyState).toHaveText(
                        "No se encontraron pólizas para los filtros aplicados.",
                    );
                    return;
                }
                const details = await miCartera.getVisibleDetails();
                expect(details.length).toBeGreaterThan(0);
                for (const detail of details) {
                    expect(
                        MiCarteraPage.companyFromDetail(detail),
                        `Detalle "${detail}" debería ser de ${compania}`,
                    ).toBe(compania);
                }
            });
        }
    });

    test("Mi cartera - Pólizas pagas: selector de producto", async ({ page }) => {
        test.setTimeout(300000);
        await documentarFlujoWeb(
            "Mi cartera - Pólizas pagas",
            "En Pólizas pagas filtra por cada producto del selector (filtro server-side) y verifica que las cards sean " +
                "de ese producto o que se muestre el estado vacío.",
            ["mi-cartera", "polizas-pagas"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();
        await miCartera.irATab(TAB_POLIZAS_PAGAS);

        const productos = await miCartera.obtenerOpciones(miCartera.productSelect);
        expect(productos.length, "Debería haber al menos un producto en el selector").toBeGreaterThan(0);

        for (const producto of productos) {
            await test.step(`Filtrar por producto: ${producto}`, async () => {
                await miCartera.seleccionarOpcionServer(miCartera.productSelect, producto, "product");
                await expect(miCartera.counter).toBeVisible();

                if ((await miCartera.getResultadosCount()) === 0) {
                    await expect(miCartera.emptyState).toHaveText(
                        "No se encontraron pólizas para los filtros aplicados.",
                    );
                    return;
                }
                const details = await miCartera.getVisibleDetails();
                expect(details.length).toBeGreaterThan(0);
                for (const detail of details) {
                    expect(
                        MiCarteraPage.productFromDetail(detail),
                        `Detalle "${detail}" debería ser producto ${producto}`,
                    ).toBe(producto);
                }
            });
        }
    });

    test("Mi cartera - Pólizas pagas: filtro de alerta de mora", async ({ page }) => {
        test.setTimeout(240000);
        await documentarFlujoWeb(
            "Mi cartera - Pólizas pagas",
            "En Pólizas pagas activa el filtro de alerta de mora y verifica que todas las cards muestren la alerta; " +
                "al desactivarlo vuelve el listado completo.",
            ["mi-cartera", "polizas-pagas"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();
        await miCartera.irATab(TAB_POLIZAS_PAGAS);

        await test.step("Activar alerta de mora", async () => {
            await miCartera.toggleAlertaMora();
            await expect(miCartera.counter).toBeVisible();

            if ((await miCartera.getResultadosCount()) === 0) {
                await expect(miCartera.emptyState).toBeVisible();
                return;
            }
            const cards = await miCartera.cards.count();
            await expect(miCartera.cardsConAlertaMora()).toHaveCount(cards);
            await expect(miCartera.cardStatuses()).toHaveCount(0);
            const labels = (await miCartera.alertaMoraLabels().allTextContents()).map((l) => l.trim());
            expect(labels.length).toBe(cards);
            for (const label of labels) {
                expect(label).toBe(ALERTA_MORA);
            }
        });

        await test.step("Desactivar alerta de mora", async () => {
            await miCartera.toggleAlertaMora();
            await expect(miCartera.counter).toBeHidden();
            await expect(miCartera.cards.first()).toBeVisible();
        });
    });

    test("Mi cartera - detalle de póliza en ambas pestañas", async ({ page }) => {
        test.setTimeout(240000);
        await documentarFlujoWeb(
            "Mi cartera",
            "En Pólizas emitidas en Polko y en Pólizas pagas abre el detalle de la primera póliza, verifica título, " +
                "botón de volver, Recotizar y Fuente del dato, y vuelve al listado.",
            ["mi-cartera"],
        );
        const miCartera = new MiCarteraPage(page);

        await setupPageWithMock(
            page,
            "http://localhost:3000/u/micartera",
            "master",
            miCartera.counter,
        );
        await miCartera.waitForListaCargada();

        const casos: { tab: MiCarteraTab; backLabel: string }[] = [
            { tab: TAB_EMITIDAS_POLKO, backLabel: "Volver a pólizas emitidas en Polko" },
            { tab: TAB_POLIZAS_PAGAS, backLabel: "Volver a pólizas pagas" },
        ];

        for (const { tab, backLabel } of casos) {
            await test.step(`${tab}: abrir detalle de la primera póliza y volver`, async () => {
                await miCartera.irATab(tab);
                await expect(miCartera.cards.first()).toBeVisible();

                const clientName = await miCartera.abrirDetalle(0);
                await expect(miCartera.detailTitle).toHaveText(clientName);
                await expect(miCartera.detailBackButton).toHaveText(backLabel);
                await expect(miCartera.detailRecotizarLink).toBeVisible();
                await expect(miCartera.detailOrigin).toContainText("Fuente del dato");
                await expect(miCartera.filters).toBeHidden();

                await miCartera.volverDelDetalle();
                await expect(miCartera.listTitle).toHaveText(tab);
            });
        }
    });

    test("Mis solicitudes - pestañas Aseguradoras, Automotor y ART", async ({ page }) => {
        test.setTimeout(180000);
        await documentarFlujoWeb(
            "Mis solicitudes",
            "Recorre las pestañas de Mis solicitudes: Aseguradoras sin solicitudes pendientes, Automotor con listado, " +
                "filtros y paginación, y ART con filtros, contador y botón de WhatsApp.",
            ["mis-solicitudes"],
        );
        const misSolicitudes = new MisSolicitudesPage(page);

        await misSolicitudes.navigate();

        await test.step("Aseguradoras: sin solicitudes de activación pendientes", async () => {
            await expect(misSolicitudes.tab("Aseguradoras")).toHaveAttribute("aria-selected", "true");
            await expect(misSolicitudes.aseguradorasTitle).toHaveText("Habilitación de aseguradoras");
            await expect(misSolicitudes.aseguradorasEmptyMessage).toHaveText(
                "No tenés solicitudes de activación pendientes en este momento.",
                { timeout: 60000 },
            );
        });

        await test.step("Automotor: listado con solicitudes", async () => {
            await misSolicitudes.irATab("Automotor");

            await expect(misSolicitudes.listTitle).toHaveText("Automotor");
            await expect(misSolicitudes.listSubtitle).toHaveText(
                "Seleccioná una solicitud para ver su detalle y documentación",
            );
            await expect(misSolicitudes.counter).toBeVisible({ timeout: 60000 });
            await expect(misSolicitudes.automotorSearchInput).toBeVisible();
            await expect(misSolicitudes.automotorCompanySelect).toBeVisible();
            await expect(misSolicitudes.automotorStatusSelect).toBeVisible();

            expect(
                await misSolicitudes.getResultadosCount(),
                "Automotor debería tener al menos una solicitud",
            ).toBeGreaterThan(0);
            await expect(misSolicitudes.automotorCards.first()).toBeVisible();

            const card = misSolicitudes.automotorCard(0);
            await expect(card.title).not.toBeEmpty();
            await expect(card.document).toHaveText(/^(CUIT|DNI)\s+\d+/);
            await expect(card.detail).toHaveText(/^.+ - Automotor - \d{2}\/\d{2}\/\d{4}$/);
            await expect(card.amount).toHaveText(/\$|Pendiente/);
            await expect(card.status).not.toBeEmpty();
            await expect(misSolicitudes.pagination).toBeVisible();
        });

        await test.step("ART: la pestaña carga con filtros y contador", async () => {
            await misSolicitudes.irATab("ART");

            await expect(misSolicitudes.listTitle).toHaveText("ART");
            await expect(misSolicitudes.listSubtitle).toHaveText(
                "Seleccioná una solicitud para ver su detalle y documentación",
            );
            await expect(misSolicitudes.counter).toHaveText(/^\d+ resultados?$/, { timeout: 60000 });
            await expect(misSolicitudes.artWhatsappButton).toBeVisible();
            await expect(misSolicitudes.artEmpleadorInput).toBeVisible();
            await expect(misSolicitudes.artTipoSelect).toBeVisible();

            if ((await misSolicitudes.getResultadosCount()) === 0) {
                await expect(misSolicitudes.emptyState).toHaveText("No tenés solicitudes en este momento.");
            } else {
                await expect(misSolicitudes.emptyState).toBeHidden();
            }
        });
    });

    test("Mis solicitudes Automotor - búsqueda, compañía y estado", async ({ page }) => {
        test.setTimeout(240000);
        await documentarFlujoWeb(
            "Mis solicitudes",
            "En la pestaña Automotor busca por nombre (oviedo) y filtra por cada compañía y cada estado, verificando " +
                "que las cards visibles coincidan con el filtro.",
            ["mis-solicitudes"],
        );
        const misSolicitudes = new MisSolicitudesPage(page);

        await misSolicitudes.navigate();
        await misSolicitudes.irATab("Automotor");
        await expect(misSolicitudes.counter).toBeVisible({ timeout: 60000 });

        await test.step("Buscar oviedo y verificar que filtra", async () => {
            await misSolicitudes.buscarAutomotor("oviedo");
            await expect(misSolicitudes.automotorCards.first()).toBeVisible({ timeout: 15000 });
            expect(await misSolicitudes.getResultadosCount()).toBeGreaterThan(0);

            const titles = await misSolicitudes.automotorCards
                .locator(".MiCarteraEmissionCard__title")
                .allTextContents();
            expect(titles.length).toBeGreaterThan(0);
            for (const title of titles) {
                expect(title, `La card "${title}" debería coincidir con oviedo`).toMatch(/oviedo/i);
            }
            await misSolicitudes.buscarAutomotor("");
        });

        const companias = await misSolicitudes.obtenerOpciones(misSolicitudes.automotorCompanySelect);
        expect(companias.length, "Debería haber al menos una compañía en el selector").toBeGreaterThan(0);

        for (const compania of companias) {
            await test.step(`Filtrar por compañía: ${compania}`, async () => {
                await misSolicitudes.limpiarSelect(misSolicitudes.automotorStatusSelect);
                await misSolicitudes.seleccionarOpcion(misSolicitudes.automotorCompanySelect, compania);

                await expect(misSolicitudes.automotorCards.first()).toBeVisible({ timeout: 15000 });
                const details = await misSolicitudes.automotorCards
                    .locator(".MiCarteraEmissionCard__detail")
                    .allTextContents();
                expect(details.length).toBeGreaterThan(0);
                for (const detail of details) {
                    expect(
                        MiCarteraPage.companyFromDetail(detail.trim()),
                        `Detalle "${detail}" debería ser de ${compania}`,
                    ).toBe(compania);
                }
            });
        }
        await misSolicitudes.limpiarSelect(misSolicitudes.automotorCompanySelect);

        const estados = await misSolicitudes.obtenerOpciones(misSolicitudes.automotorStatusSelect);
        expect(estados.length, "Debería haber al menos un estado en el selector").toBeGreaterThan(0);

        for (const estado of estados) {
            await test.step(`Filtrar por estado: ${estado}`, async () => {
                await misSolicitudes.limpiarSelect(misSolicitudes.automotorCompanySelect);
                await misSolicitudes.seleccionarOpcion(misSolicitudes.automotorStatusSelect, estado);

                await expect(misSolicitudes.automotorCards.first()).toBeVisible({ timeout: 15000 });
                const statuses = await misSolicitudes.automotorCards
                    .locator(".MiCarteraEmissionCard__status")
                    .allTextContents();
                expect(statuses.length).toBeGreaterThan(0);
                for (const status of statuses) {
                    expect(status.trim(), `Estado visible "${status}" debería ser ${estado}`).toBe(estado);
                }
            });
        }
    });

    test("Mis solicitudes Automotor - detalle Aprobada", async ({ page }) => {
        test.setTimeout(180000);
        await documentarFlujoWeb(
            "Mis solicitudes",
            "Abre una solicitud Automotor Aprobada, verifica vigencia, suma asegurada y el mensaje de póliza emitida, " +
                "y que Ver póliza en Mi Cartera navegue a Mi cartera.",
            ["mis-solicitudes"],
        );
        const misSolicitudes = new MisSolicitudesPage(page);
        const detail = misSolicitudes.detail;

        await misSolicitudes.navigate();
        await misSolicitudes.abrirSolicitudAutomotor("Aprobada");

        await test.step("Verificar datos de vigencia y suma asegurada", async () => {
            await expect(detail.backButton).toHaveText("Volver a Automotor");
            await expect(detail.inicioVigencia).toHaveText(/^Inicio vigencia:\s*\d{2}\/\d{2}\/\d{4}$/);
            await expect(detail.finVigencia).toHaveText(/^Fin vigencia:\s*\d{2}\/\d{2}\/\d{4}$/);
            await expect(detail.sumaAsegurada).toHaveText(/^Suma asegurada:\s*\$[\d.]+(,\d+)?$/);
        });

        await test.step("Verificar mensaje de póliza emitida", async () => {
            await expect(detail.statusTitle).toHaveText("Póliza emitida");
            await expect(detail.statusDescription).toHaveText(
                "La póliza ya fue emitida. Podés verla y descargar la documentación desde Mi Cartera.",
            );
        });

        await test.step("Ver póliza en Mi Cartera navega a Mi Cartera", async () => {
            await expect(detail.verPolizaEnMiCarteraBtn).toBeEnabled();
            await detail.verPolizaEnMiCarteraBtn.click();
            await expect(page).toHaveURL(/\/u\/micartera/);
            await expect(new MiCarteraPage(page).title).toHaveText("Mi cartera");
        });
    });

    test("Mis solicitudes Automotor - detalle Cancelada", async ({ page, context }) => {
        test.setTimeout(180000);
        await documentarFlujoWeb(
            "Mis solicitudes",
            "Abre una solicitud Automotor Cancelada, verifica vigencia, suma asegurada y el mensaje de solicitud cancelada, " +
                "y que Contactar por WhatsApp abra WhatsApp.",
            ["mis-solicitudes"],
        );
        const misSolicitudes = new MisSolicitudesPage(page);
        const detail = misSolicitudes.detail;

        await misSolicitudes.navigate();
        await misSolicitudes.abrirSolicitudAutomotor("Cancelada");

        await test.step("Verificar datos de vigencia y suma asegurada", async () => {
            await expect(detail.backButton).toHaveText("Volver a Automotor");
            await expect(detail.inicioVigencia).toHaveText(/^Inicio vigencia:\s*\d{2}\/\d{2}\/\d{4}$/);
            await expect(detail.finVigencia).toHaveText(/^Fin vigencia:\s*\d{2}\/\d{2}\/\d{4}$/);
            await expect(detail.sumaAsegurada).toHaveText(/^Suma asegurada:\s*\$[\d.]+(,\d+)?$/);
        });

        await test.step("Verificar mensaje de solicitud cancelada", async () => {
            await expect(detail.statusTitle).toHaveText("Solicitud cancelada");
            await expect(detail.statusDescription).not.toBeEmpty();
        });

        await test.step("Contactar por WhatsApp abre WhatsApp", async () => {
            await expect(detail.contactarWhatsappBtn).toBeEnabled();
            const popupPromise = context.waitForEvent("page");
            await detail.contactarWhatsappBtn.click();
            const popup = await popupPromise;
            await expect(popup).toHaveURL(/whatsapp\.com|wa\.me/);
            await popup.close();
        });
    });

    test("Mis solicitudes Automotor - detalle A completar", async ({ page }) => {
        test.setTimeout(180000);
        await documentarFlujoWeb(
            "Mis solicitudes",
            "Abre una solicitud Automotor A completar, verifica los textos de cotización lista, descarga el PDF, abre y " +
                "cierra la confirmación de cancelar, y que Solicitar emisión navegue al cotizador.",
            ["mis-solicitudes"],
        );
        const misSolicitudes = new MisSolicitudesPage(page);
        const detail = misSolicitudes.detail;

        await misSolicitudes.navigate();
        await misSolicitudes.abrirSolicitudAutomotor("A completar");

        await test.step("Verificar textos de la cotización lista", async () => {
            await expect(detail.notice).toHaveText(
                "Revisá el premio cotizado y la cobertura autorizada. Podés solicitar la emisión o cancelar la solicitud.",
            );
            await expect(detail.statusTitle).toHaveText("Tu cotización está lista");
            await expect(detail.statusDescription).toHaveText(
                /^Tu cobertura fue autorizada\. El precio cotizado es \$[\d.]+(,\d+)?\. Si estás de acuerdo, solicitá la emisión\. Si no, podés cancelar la solicitud\.$/,
            );
        });

        await test.step("Descargar pdf descarga la cotización", async () => {
            await expect(detail.descargarPdfBtn).toBeEnabled();
            const downloadPromise = page.waitForEvent("download");
            await detail.descargarPdfBtn.click();
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
        });

        await test.step("Cancelar abre la confirmación (sin confirmar)", async () => {
            await expect(detail.cancelarBtn).toBeEnabled();
            await detail.cancelarBtn.click();
            const volverBtn = page.getByRole("button", { name: "Volver", exact: true });
            await expect(page.getByText("Cancelar solicitud").first()).toBeVisible();
            await volverBtn.click();
            await expect(volverBtn).toBeHidden();
        });

        await test.step("Solicitar emisión navega al cotizador", async () => {
            await expect(detail.solicitarEmisionBtn).toBeEnabled();
            await detail.solicitarEmisionBtn.click();
            await expect(page).toHaveURL(/\/u\/cotizar\/automotor/);
        });
    });
});

// ============================================================================
// TESTS DE REGRESIÓN - AUTO OPERACIONES POR FUERA (POL-3076)
// Fase 1 siempre (OPF_MOCK=1 para no crear solicitudes reales); fases 2 y 3 esperan
// cotizar/emitir en admin y solo corren con OPF_COMPLETAR=1. Va al final del archivo
// porque la fase 2/3 tiene que despacharse después de la fase 1.
// ============================================================================

test.describe("Regresión Operaciones por fuera", () => {
    registrarSuiteOperacionesPorFuera({ prefijoPendientes: "regresion", adjuntarLogsBackend: false });
});

// ============================================================================
// TEST DE REGRESIÓN - Cotización Promo
// ============================================================================

//test('[Regresión] Cotización Promo', async ({ page }, testInfo) => {
//    test.setTimeout(150000); // Timeout optimizado para headless
//
//    // Configurar captura de eventos SSE (no bloquea la conexión)
//    const sseCapture = new SSECapture(page);
//    await sseCapture.setup('sse');
//
//    try {
//        const promoConfig = autoRegresionConfigs.find(config => config.compania === 'sancor');
//
//        if (!promoConfig) {
//            throw new Error('No se encontró configuración de auto para la cotización promo.');
//        }
//
//        const datosAutoParaTest = buildAutoTestData({
//            autoBase: { ...autoBase },
//            compania: promoConfig.compania,
//            tieneConfigAvanzada: promoConfig.tieneConfigAvanzada,
//            tieneGNC: promoConfig.tieneGNC,
//            billingConfig: promoConfig.billingConfig,
//            paymentCombo: promoConfig.paymentCombo,
//            installment: promoConfig.installment
//        });
//
//        const emisionAutoPage = new EmisionAutoPage(page);
//        const commonButtons = new CommonButtons(page);
//        const companias = new Companias(page);
//        const cotizacionTabla = new CotizacionTabla(page);
//
//        await setupPageWithMock(page, "http://localhost:3000/u/cotizar/automotor", 'promo');
//        await commonButtons.siguienteBtn.waitFor({ timeout: 60000 });
//
//        prepararDatosAuto(datosAutoParaTest, promoConfig.compania);
//        const valorTabla = await cotizarAuto(
//            test,
//            page,
//            datosAutoParaTest,
//            promoConfig.compania,
//            emisionAutoPage,
//            companias,
//            cotizacionTabla
//        );
//
//        expect(valorTabla).toBeTruthy();
//    } finally {
//        await sseCapture.attachToReport(testInfo, 'cotizacion-promo');
//    }
//});
