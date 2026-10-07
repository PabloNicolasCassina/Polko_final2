import { registrarSuiteOperacionesPorFuera } from "../helpers/operacionesPorFueraSuite";

/**
 * POL-3076 — Operaciones por fuera (OPF). Los tests viven en `helpers/operacionesPorFueraSuite.ts`
 * y también corren dentro de `regresionFinal.spec.ts`.
 *   npx playwright test tests/autoOperacionesPorFuera.spec.ts --project=chromium
 *   OPF_MOCK=1 npx playwright test tests/autoOperacionesPorFuera.spec.ts --project=chromium
 *   OPF_COMPLETAR=1 npx playwright test tests/autoOperacionesPorFuera.spec.ts --project=chromium
 */
registrarSuiteOperacionesPorFuera();
