import { test } from "@playwright/test";
import { attachBackendLogsOnFailure } from "../helpers/backendLogs";
import { probarEmision, tituloCasoEmision, type CasoEmision } from "../helpers/emisionAsistViajero";
import {
    COMPANIAS_ASISTENCIA,
    DIAS_COBERTURA_COTIZACION,
    MEDIOS_PAGO_TERRAWIND,
    PAISES_POR_REGION_SNUGGLE,
    type CompaniaAsistencia,
} from "../data/asistenciaViajeroEmision";

/**
 * Emisión completa de Asistencia al viajero: los 64 casos de `cotizacionAsistViajero.spec.ts` (un país por
 * cada región de Snuggle × 5, 15, 30 y 60 días de cobertura) emitidos con cada una de las cinco compañías,
 * agrupados por compañía como en `emisionAsistViajero.spec.ts`: 320 emisiones.
 *
 * Snuggle tiene dos tests por caso: "→ link de pago" (plan más barato, tarjeta) y "→ transferencia" (plan más
 * barato con "Transferencia" en "Ver las formas de pago"; si ninguno la acepta, queda skipped).
 *   npx playwright test tests/emisionCompletoAsistViajero.spec.ts --project=chromium -g "transferencia"
 *
 * Pasajeros (dos por emisión, edades reales a la fecha de salida validadas contra el padrón):
 *   - Snuggle: rotan los cuatro grupos 0-75 + 0-75, 76-85 + 0-75, 86-90 + 0-75 y 76-85 + 86-90, en cuadrado
 *     latino sobre país y días: cada país y cada largo de viaje pasan por todos los rangos etarios.
 *   - TerraWind (hasta 85 años): rotan Oviedo + Sartori, Felipe + Oviedo y Felipe + Sartori, y la forma de
 *     pago rota por país.
 *
 * TerraWind no emite dos vouchers del mismo pasajero en fechas que se pisan (error 520): sus salidas se
 * sortean en una ventana de ~18 meses (`VENTANA_SALIDA_TERRAWIND`) y ante el 520 recotiza con otras fechas.
 * Con tres clientes la ventana se satura: correr TerraWind por partes (`-g "TerraWind"`).
 *
 * El flujo de cada emisión es el de `helpers/emisionAsistViajero.ts`.
 *   npx playwright test tests/emisionCompletoAsistViajero.spec.ts --project=chromium
 *   npx playwright test tests/emisionCompletoAsistViajero.spec.ts --project=chromium -g "AXA"
 */

const COMPANIAS = Object.keys(COMPANIAS_ASISTENCIA) as CompaniaAsistencia[];
const GRUPOS_TERRAWIND = ["jovenes", "mayor76", "mayor76Sartori"] as const;
const GRUPOS_SNUGGLE = ["jovenes", "mayor76", "mayor86", "mayores"] as const;
/** Felipe Gomez sale de 76-85 el 30/04/2028 y el calendario llega a 24 meses. */
const VENTANA_SALIDA_TERRAWIND = 540;

function casosDeCompania(compania: CompaniaAsistencia): CasoEmision[] {
    const { snuggle } = COMPANIAS_ASISTENCIA[compania];
    return PAISES_POR_REGION_SNUGGLE.flatMap((destino, i) =>
        DIAS_COBERTURA_COTIZACION.flatMap((dias, j): CasoEmision[] => {
            const base = { id: `${compania}-${destino.label}-${dias}d`, compania, destino, dias };
            if (snuggle) {
                const caso = { ...base, grupo: GRUPOS_SNUGGLE[(i + j) % GRUPOS_SNUGGLE.length] };
                return [caso, { ...caso, id: `${caso.id}-transferencia`, pagoSnuggle: "Transferencia" }];
            }
            return [{
                ...base,
                grupo: GRUPOS_TERRAWIND[(i + j) % GRUPOS_TERRAWIND.length],
                medioPago: MEDIOS_PAGO_TERRAWIND[i % MEDIOS_PAGO_TERRAWIND.length],
                ventanaSalidaDias: VENTANA_SALIDA_TERRAWIND,
            }];
        }),
    );
}

for (const compania of COMPANIAS) {
    const { label } = COMPANIAS_ASISTENCIA[compania];
    test.describe(`Asistencia al viajero - Emisión completa ${label} por región y días @regression`, () => {
        test.afterEach(async ({ page }, testInfo) => {
            await attachBackendLogsOnFailure(testInfo, page);
        });

        for (const caso of casosDeCompania(compania)) {
            test(tituloCasoEmision(caso), async ({ page }, testInfo) => {
                await probarEmision(page, testInfo, caso, `Emisión completa · ${label}`);
            });
        }
    });
}
