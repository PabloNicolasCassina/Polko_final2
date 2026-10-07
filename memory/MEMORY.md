# Polko_final2 - Test Suite Memory

## Project
Playwright E2E test suite for Polko insurance platform.

## Key Patterns (tests/autoHappyPath.spec.ts as gold standard)
- Top-level `test.describe("<Producto> - <Feature> @regression")`, tests generated per company from `data/*`
- `attachBackendLogsOnFailure(testInfo)` in `test.afterEach` (helpers/backendLogs.ts)
- User mock route (`**/newGetDatosUsuario*` → `mockUserDataString`) applied BEFORE navigating
- Local page object instances per test (never module-level globals)
- `test.step` per business step; `documentarCaso()` (helpers/documentarCaso.ts) for report metadata
- Plan codes from the page (`PLAN_CODES_AUTO` / `PLAN_CODES_MOTO` / `PRODUCTOS_AP`), per-company data from `data/autoEmisionPorCompania.ts`
- `SSECapture` via `try/finally` when the test needs the SSE events in the report
- Ticket key in describe title + `testInfo.annotations` (`type: "ticket"`), never in the file name
- Screenshots/attachments via `testInfo.outputPath()`, never absolute paths

## Files
- tests/autoHappyPath.spec.ts — gold standard for patterns
- pages/cotizarAutoIAPage.ts / cotizarMotoIAPage.ts / cotizarAPIAPage.ts — current cotización+emisión flows
- tests/ultimasCotizaciones.spec.ts — regresión Últimas cotizaciones (moto: seed n*2 → RECOTIZAR n → EMITIR n)
- components/ultimasCotizaciones.ts — page object for the quotations table (helpers Automotor + Motovehiculo)
- pages/cotizarMotoIAPage.ts — cotización/emisión moto redesign (`avanzarRecotizacionHastaResultados`, `esperarResultadosCotizacion`)
- helpers/sseCapture.ts — SSECapture class
- helpers/mockUser.ts — mockUserDataString export
- helpers/testDataBuilder.ts — buildAutoTestData()
- data/tiposFacturacion.ts — companyBillingConfigs
- data/configsAvanzadas.ts — configs, getCombinaciones()

## Últimas cotizaciones (moto)
- Playwright no permite `parallel` nested en `serial` → 2 specs + projects
- Seed: `tests/ultimasCotizaciones.seed.spec.ts` (`mode: 'parallel'`, `waitForResults: false`)
- Acciones: `tests/ultimasCotizaciones.spec.ts` — un test por compañía, project con `fullyParallel: false` (orden sin saltear al fallar; no usar `mode: 'serial'`)
- Auth: el JSON lo elige el project (no hardcode en el spec)
  - userPre: `npx playwright test --project=ultimas-cotizaciones`
  - userPolkista: `npx playwright test --project=ultimas-cotizaciones-polkista`
- Solo acciones: agregar `--no-deps`
- Helpers: `helpers/ultimasCotizacionesMoto.ts`

## Moto happy path / config avanzada
- Specs: `tests/motoHappyPath.spec.ts`, `tests/motoConfigAvanzada.spec.ts`
- Corren bajo `chromium` (userPre) o `chromiumPolkista` (userPolkista):
  - `npx playwright test tests/motoHappyPath.spec.ts tests/motoConfigAvanzada.spec.ts --project=chromiumPolkista`

## Moto roles (clientes en emisión)
- Spec: `tests/motoRoles.spec.ts` + data `data/motoRoles.ts`
- Roles globales (Sancor/RUS/Rivadavia/ATM): Asegurado (2) + Tomador (1) + Adicional (7) + Acreedor Prendario (16)
- Helpers: `EmisionCliente.agregarClienteConRol`; `emitirPlan({ clientesAdicionales })`
- Auth: `chromium` / `chromiumPolkista`
  - `npx playwright test tests/motoRoles.spec.ts --project=chromium`
  - Sin RUS: `--grep-invert "RUS"`

## Auto happy path / config avanzada
- Specs: `tests/autoHappyPath.spec.ts`, `tests/autoConfigAvanzada.spec.ts`
- Page: `pages/cotizarAutoIAPage.ts` (`PLAN_CODES_AUTO`, `CONFIG_AVANZADA_*_AUTO`, `cotizarVehiculo` / `emitirPlan` / `aplicarConfigCase`)
- Mock obligatorio: `mocks/mockUserDataATM.json` vía `mockUserDataString` (Fed + Mercantil)
- Vehículo: RENAULT LOGAN II 1.6 16V INTENS L/19 - 2022 / CP 5000
- Compañías: Sancor(12), Rivadavia(M), Zurich(CG), RUS(S0), Federación(CF), ATM(C2), Triunfo(C8), Mercantil(923/B1). Experta falla al cotizar.
- Deps pairwise: ATM/Triunfo Efectivo sin Mensual; Rivadavia ajuste×fact; Sancor desc>15 → applyExtraDiscount; FedPat checks `applyDiscount` + `multiFranquicia`
- Auth por project:
  - `npx playwright test tests/autoHappyPath.spec.ts tests/autoConfigAvanzada.spec.ts --project=chromium`
  - `npx playwright test tests/autoHappyPath.spec.ts tests/autoConfigAvanzada.spec.ts --project=chromiumPolkista`

## Auto roles (clientes en emisión)
- Spec: `tests/autoRoles.spec.ts` + data `data/autoRoles.ts`
- Cobertura por compañía:
  - Sancor/RUS: Asegurado (2) + Asegurado Adicional (7) + Acreedor Prendario (16)
  - Zurich: 1,3 (+2)
  - Federación: solo 2
  - Rivadavia/ATM: 16 + 25 (PJ)
  - Triunfo/Mercantil: 16 (`opcionesRolesExtra`; selector incluye extras desde emitirSteps)
  - Experta: skip (no cotiza; `roles` son IVA)
- Helpers: `EmisionCliente.agregarClienteConRol` / `completarRolTabSiExiste`; `emitirPlan({ clientesAdicionales, completarRolTab })`
- Auth: `chromium` / `chromiumPolkista`
  - `npx playwright test tests/autoRoles.spec.ts --project=chromium`
