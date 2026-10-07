# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Context

This is the **Polko_final2** directory - the Playwright E2E test suite for the Polko insurance platform. This is NOT the full Polko project, which is a multi-repo system with Python microservices and React frontends located in sibling directories.

The Polko platform allows quoting, issuing, and managing insurance policies for:
- Auto insurance (automotores)
- Motorcycle insurance (motovehículos)
- Home insurance (hogar)
- Microseguros, travel assistance, and ART (work accidents)

## Commands

### Running Tests

```bash
# Install dependencies and Playwright browsers
npm install
npx playwright install

# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/autoHappyPath.spec.ts --project=chromium

# Run tests for specific project (user role)
npx playwright test --project=chromium              # Master user
npx playwright test --project=chromiumPolkista      # Polkista user
npx playwright test --project=mobile                # iPhone SE (master user)

# Run tests of a specific ticket (ticket key lives in describe titles / annotations)
npx playwright test -g "POL-2951"

# Run single test by name
npx playwright test -g "Cotizar Caso persona física"

# Run tests in UI mode
npx playwright test --ui

# Run tests in debug mode
npx playwright test --debug

# View last test report
npx playwright show-report

# Configure parallel workers (useful for Triunfo cases)
WORKERS=4 npx playwright test
```

### Authentication Setup

The test suite requires authentication state before running tests. There are separate auth files for different user roles:

```bash
# Master user authentication (most common)
npm run auth

# Alternative: Run auth setup directly
npx playwright test tests/auth.setup.pre.ts --debug

# Polkista user authentication (separate setup)
npx ts-node tests/auth.setup.polkista.ts

# Organic user authentication (if needed)
npx ts-node tests/auth.setup.organic.ts
```

This creates authentication files in `.auth/`:
- `.auth/userPre.json` - Master user (full permissions)
- `.auth/userPolkista.json` - Polkista user (can quote and emit)
- `.auth/userOrganic.json` - Organic user (restricted permissions)

The `setup` and `setup-polkista` projects in `playwright.config.ts` ensure authentication runs before all tests.

### Code Generation

```bash
# Generate test code with authentication loaded
npm run codegen
```

## Architecture

### Test Organization

The test suite follows the **Page Object Model** pattern:

```
Polko_final2/
├── tests/                          # Test specifications
│   ├── auth.setup.pre.ts          # Auth setup (runs first)
│   ├── autoHappyPath.spec.ts      # Auto: cotizar + emitir por aseguradora (reference spec)
│   ├── autoConfigAvanzada.spec.ts # Auto: configuración avanzada (pairwise)
│   ├── autoRoles.spec.ts          # Auto: roles de clientes en emisión
│   ├── autoOperacionesPorFuera.spec.ts
│   ├── autoFedPat*.spec.ts        # Auto: casos puntuales de Federación Patronal
│   ├── moto*.spec.ts              # Moto: happy path, config avanzada, roles, smoke
│   ├── ap*.spec.ts                # AP: happy path, config avanzada, roles, precios
│   ├── ultimasCotizaciones*.ts    # Últimas cotizaciones (seed + acciones)
│   ├── regresionFinal.spec.ts     # Regresión integral
│   ├── ART/art.*.spec.ts          # ART
│   └── news/news.spec.ts          # Novedades
├── pages/                          # Page Object classes (file = class name in camelCase, `*Page.ts`)
│   ├── cotizarAutoIAPage.ts       # Auto: cotizador IA + emisión
│   ├── cotizarMotoIAPage.ts       # Moto: cotizador IA + emisión
│   ├── cotizarAPIAPage.ts         # AP: cotizador IA + emisión
│   ├── dashboardPage.ts           # Dashboard interactions
│   └── ...
├── components/                     # Reusable page components
│   ├── auto/                      # Auto-specific components
│   │   └── cotizacionTabla.ts    # Quote table selectors/actions
│   ├── moto/                      # Moto-specific components
│   ├── ART/                       # ART-specific components
│   ├── emisionCliente.ts          # Client info form
│   ├── emisionFormaPago.ts        # Payment form
│   ├── emisionFinal.ts            # Final emission step
│   └── companias.ts               # Insurance company constants
├── data/                           # Test data fixtures
│   ├── autos.json                 # Auto test data
│   ├── motos.json                 # Moto test data
│   ├── hogar.json                 # Home insurance test data
│   ├── art.json                   # ART test data
│   ├── configsAvanzadas.ts        # Advanced config options
│   └── *Roles.ts / autoEmisionPorCompania.ts  # Data per product/company
├── mocks/                          # newGetDatosUsuario mocks (NOT versioned, see below)
├── pict/                           # PICT models + generated pairwise combinations
├── helpers/                        # Utility functions
│   ├── testDataBuilder.ts         # Data preparation
│   ├── pdfAnnotations.ts          # PDF validation
│   ├── harCapture.ts              # Network capture
│   ├── mockUser.ts                # User mock data
│   └── dataUtils.ts               # Data utilities
└── fixtures/                       # Test fixtures (PDFs, images)
```

### Page Objects Architecture

Page Object classes encapsulate page-specific selectors and actions. They compose smaller component modules for reusability:

**Example: EmisionAutoPage (legacy flow; new flows live in `cotizar*IAPage.ts`)**
```typescript
class EmisionAutoPage {
  // Component composition
  cotizacionVehiculo: any;      // Vehicle selection component
  cotizacionPersona: any;       // Person selection component
  cotizacionTabla: CotizacionTabla; // Quote table component
  emisionCliente: EmisionCliente;   // Client form component
  emisionFormaPago: EmisionFormaPago; // Payment component
  emisionFinal: EmisionFinal;        // Final step component

  // Page-specific methods
  async seleccionarAuto(auto) { ... }
  async seleccionarPersona(persona) { ... }
  async tablaCotizacion(compania) { ... }
  async emitirFormaPago(datosFormaPago) { ... }
  async emitirCliente(cliente) { ... }
  async emitirDetalleAuto(detalles) { ... }
  async emitirInspeccion() { ... }
  async emitirFinal() { ... }
}
```

Components like `cotizacionTabla`, `emisionCliente`, etc. are shared across different insurance types (auto/moto/hogar) for code reuse.

### Multi-User Testing

The suite supports testing with different user roles via Playwright projects:

- **setup** / **setup-polkista** / **setup-sancor** - Auth setups (`userPre.json`, `userPolkista.json`, `sancorPortal.json`)
- **chromium** - Master user (full permissions, uses `userPre.json`)
- **chromiumPolkista** - Polkista user (can quote and emit, uses `userPolkista.json`)
- **mobile** - iPhone SE on Chromium with `userPre.json`
- **firefox** / **webkit** - Cross-browser with `userPre.json`
- **ultimas-seed** → **ultimas-cotizaciones** (and `-polkista` variants) - Seed + actions chain for Últimas cotizaciones

Each project loads its corresponding `storageState` to maintain the correct user session.

### Test Data Strategy

Test data is stored in JSON files with insurance-specific configurations:

**Vehicle data** (`data/autos.json`, `data/motos.json`):
```json
{
  "marca": "RENAULT",
  "año": "2022",
  "modelo": "LOGAN",
  "version": "LOGAN II 1.6 16V INTENS L/19",
  "tipoPersona": "Física",
  "sitImpositiva": "Consumidor final",
  "cuitDni": "20422581864"
}
```

**Other data files**:
- `data/hogar.json` - Home insurance properties and coverages
- `data/art.json` - ART employee/employer data
- `data/configsAvanzadas.ts` - Advanced configuration options for different insurance products

Tests use helper functions in `helpers/testDataBuilder.ts` to prepare data before running test cases. The `helpers/mockUser.ts` provides mock user data for route interception in tests.

### Dynamic Test Generation

Many test files use data-driven patterns to generate tests dynamically:

```typescript
// Generate tests for each company and vehicle combination
companiasPosibles.forEach(compania => {
  auto.forEach(vehiculo => {
    test(`Cotizar ${compania} - ${vehiculo.modelo}`, async ({ page }) => {
      // Test logic
    });
  });
});
```

This creates comprehensive test coverage across multiple insurance companies and vehicle types.

## Configuration Notes

### playwright.config.ts

- **Timeout**: 150 seconds per test (30s for `expect`)
- **Parallel execution**: Fully parallel locally, sequential in CI
- **Workers**: Configurable via `WORKERS` env var (useful for resource-intensive Triunfo tests)
- **Trace**: Always on (`trace: 'on'`)
- **Retries**: 2 retries in CI, 0 locally
- **Projects**: Multiple projects for different user roles and devices

### TypeScript Configuration

- **Target**: ES2020, **lib**: ES2022
- **Module**: CommonJS (note: `package.json` also specifies `"type": "commonjs"`)
- **Strict mode**: Disabled (`"strict": false`)
- Type check: `npx -p typescript@5 tsc --noEmit -p .`

## CI/CD

There is no CI pipeline right now. The suite needs the frontend on `localhost:3000`, the backends, `.auth/`, `mocks/` and `.env`, none of which exist on a hosted runner.

## Local-only files (not versioned)

- `.env` - Credentials (`POLKO_AUTH_PASSWORD`, `QASE_TESTOPS_API_TOKEN`, etc.)
- `.auth/` - storageState files generated by the auth setups
- `mocks/` - `newGetDatosUsuario` responses used by `helpers/mockUser.ts`; they contain real insurer credentials, so they stay out of git
- `resultados-polizas/`, `docs/`, `test-results/`, `playwright-report/`, `allure-results/` - Run outputs

Never hardcode credentials or absolute paths; use `process.env` and `testInfo.outputPath()` / `path.join(__dirname, ...)`.

## Working with This Codebase

### Adding New Tests

1. Create test data in `data/*.json` if needed
2. If testing a new page, create a Page Object in `pages/`
3. Reuse existing components from `components/` when possible
4. Write test spec in `tests/` following existing patterns
5. Use data-driven test generation for comprehensive coverage

### Modifying Page Objects

When updating page selectors or actions:
1. Check `components/` first - many actions are shared across insurance types
2. Update the component if the change applies to multiple insurance types
3. Update the specific Page Object if it's page-specific
4. Run related tests to verify changes don't break existing tests

### Understanding Test Failures

- Check `playwright-report/` for detailed HTML reports with screenshots and traces
- Use `npx playwright show-report` to view the last test report
- Traces are always collected - use them to debug flaky tests
- For auth failures, re-run `npm run auth` to refresh authentication state

### Test Mocking and Route Interception

**Política E2E-first para tests nuevos:** todos los tests arrancan con el mock estándar de datos de usuario (`mocks/mockUserDataATM.json` vía `mockUserDataString` / `getMockUserData` de `helpers/mockUser.ts`, con variantes por rol) — esa interceptación es la default obligatoria. Fuera de eso, el flujo completo se ejecuta contra el backend real (sin más `page.route()` ni respuestas fabricadas). Interceptar otras rutas queda reservado para casos donde el estado a verificar no puede dispararse de forma confiable con el backend real (ej. forzar una response específica para que la UI muestre un popup, como en POL-2951) — y en ese caso se mockea solo esa response puntual, dejando un comentario en el spec que justifique el mock.

Many tests use Playwright's route interception to mock API responses:

```typescript
// Mock user data endpoint
await page.route("http://localhost:8080/newGetDatosUsuario?es_master=true*", async route => {
  await route.fulfill({
    contentType: 'application/json',
    body: mockUserDataString,
  });
});
```

The `helpers/mockUser.ts` file loads the mock user data used across tests (`mockUserDataString`, `getMockUserData(role)`). See `tests/autoHappyPath.spec.ts` (`applyUserMock`) for the reference usage.

### Naming conventions

- Page Objects: `pages/<className in camelCase>.ts`, always ending in `Page` (e.g. `CotizarAutoIAPage` → `cotizarAutoIAPage.ts`)
- Specs: named by product + feature (`autoHappyPath.spec.ts`, `ART/art.alicuota.spec.ts`), never by ticket. The ticket key goes in the `describe` title and in `testInfo.annotations` (`{ type: "ticket", description: "POL-XXXX" }`)
- No spaces in file or folder names

### File Paths and Cross-Platform Compatibility

This codebase runs on both macOS (darwin) and Windows with PowerShell. File paths use backslashes in some Windows contexts, but Playwright handles cross-platform paths automatically. When adding file operations, use `path.join()` for compatibility.
