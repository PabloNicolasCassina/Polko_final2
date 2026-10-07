# Polko_final2

Suite de tests end-to-end (Playwright + TypeScript) de la plataforma de seguros **Polko**. Cubre cotización y emisión de Auto, Moto, Accidentes Personales, ART, Últimas cotizaciones, Novedades y Operaciones por fuera, contra el frontend local (`http://localhost:3000`) y los backends de Polko.

## Requisitos

- Node.js 20 o superior
- Frontend `frontend_general` corriendo en `http://localhost:3000`
- Backends de Polko levantados (`general_api`, `microservice_products`, etc.)
- Archivos locales que **no se versionan** (ver [Archivos locales](#archivos-locales))

## Instalación

```bash
npm install
npx playwright install
```

## Archivos locales

Estos archivos se necesitan para correr la suite y están en el `.gitignore` porque tienen credenciales o datos reales:

| Archivo / carpeta | Para qué sirve | Cómo se obtiene |
|---|---|---|
| `.env` | Credenciales y configuración | Crearlo a mano (ver abajo) |
| `.auth/` | Sesiones de login (`storageState`) por rol | `npm run auth` y los setups de cada rol |
| `mocks/` | Respuestas de `newGetDatosUsuario` que usa `helpers/mockUser.ts` | Pedírselas al equipo de QA |

Sin `mocks/`, los specs que mockean el usuario (`*HappyPath`, `*ConfigAvanzada`, `apPrecios`, `regresionFinal`, etc.) fallan al cargar los datos.

### Variables de entorno (`.env`)

```bash
# Login del usuario master en auth.setup.pre.ts
POLKO_AUTH_PASSWORD=

# Portal de Sancor (tests/sancorAuth.pre.ts)
SANCOR_PORTAL_USER=
SANCOR_PORTAL_PASS=

# Reporte a Qase (si no hay token, queda apagado)
QASE_TESTOPS_API_TOKEN=
QASE_TESTOPS_PROJECT=POLKOFINAL

# Reporte a Jira (npm run jira:report)
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
```

Variables opcionales al ejecutar:

| Variable | Efecto |
|---|---|
| `WORKERS=4` | Cantidad de workers en paralelo |
| `OPF_MOCK=1` | Operaciones por fuera: mockea el alta y no crea solicitudes reales |
| `OPF_COMPLETAR=1` | Operaciones por fuera: corre las fases que esperan la aprobación en admin |
| `OPF_APROBACION_TIMEOUT_MIN` / `OPF_POLL_INTERVAL_SEG` | Espera máxima (30 min) e intervalo de polling (15 s) de esas fases |

## Autenticación

Cada rol usa su propio archivo de sesión en `.auth/`:

```bash
npm run auth          # Usuario master → .auth/userPre.json
npm run auth:sancor   # Portal Sancor → .auth/sancorPortal.json
npx playwright test --project=setup-polkista --debug   # Usuario polkista → .auth/userPolkista.json
```

Si el archivo de sesión ya existe, el setup lo saltea: borralo antes para regenerarlo (`npm run auth` y `auth:sancor` ya lo hacen solos).

El setup abre el navegador en modo debug: completás el login a mano y le das **Resume** en el inspector de Playwright para guardar la sesión. Si los tests empiezan a fallar por sesión vencida, volvé a correrlo.

## Ejecutar tests

```bash
# Un spec con un rol
npx playwright test tests/autoHappyPath.spec.ts --project=chromium
npx playwright test tests/autoHappyPath.spec.ts --project=chromiumPolkista

# Mobile (iPhone SE)
npx playwright test tests/motoHappyPath.spec.ts --project=mobile

# Por ticket (la clave está en el título del describe)
npx playwright test -g "POL-2951"

# Regresión completa
npm run test:regresion

# Modo UI / debug
npx playwright test --ui
npx playwright test --debug

# Reportes
npx playwright show-report
npm run allure:report
```

`npx playwright test` sin `--project` corre todos los proyectos (incluidos Firefox, WebKit y mobile). Conviene indicar siempre el proyecto.

### Proyectos

| Proyecto | Rol / dispositivo |
|---|---|
| `chromium` | Usuario master (`userPre.json`) |
| `chromiumPolkista` | Usuario polkista (`userPolkista.json`) |
| `mobile` | iPhone SE con usuario master |
| `firefox`, `webkit` | Cross-browser con usuario master |
| `ultimas-cotizaciones`, `ultimas-cotizaciones-polkista` | Últimas cotizaciones (corren antes su seed) |
| `setup`, `setup-polkista`, `setup-sancor` | Generación de sesiones |

## Estructura

```
tests/        Specs (por producto y funcionalidad)
pages/        Page Objects (flujos completos de pantalla)
components/   Locators y acciones de secciones reutilizables
helpers/      Utilidades: mocks de usuario, logs de backend, SSE, documentación de casos
data/         Datos de prueba por producto y compañía
pict/         Modelos PICT y combinaciones pairwise generadas
fixtures/     Archivos para subir en los tests (PDF, imágenes)
scripts/      Scripts auxiliares (reporte a Jira, listado de casos, activación de compañías)
memory/       Notas de patrones de la suite
```

El spec de referencia para patrones es `tests/autoHappyPath.spec.ts`.

## Convenciones

- **Page Object Model:** los specs orquestan, los `pages/` encapsulan flujos y los `components/` los locators.
- **Nombres:** Page Objects como `<nombreDeLaClase>Page.ts` (ej. `CotizarAutoIAPage` → `cotizarAutoIAPage.ts`). Specs por producto y funcionalidad (`autoHappyPath.spec.ts`), nunca por ticket. La clave del ticket va en el título del `describe` y en `testInfo.annotations`.
- **Sin credenciales ni rutas absolutas en el código:** usar `process.env` y `testInfo.outputPath()` / `path.join(__dirname, ...)`.
- **Mocks mínimos:** solo se mockea `newGetDatosUsuario`. El resto del flujo va contra el backend real, salvo casos puntuales justificados en el spec.

## Chequeo de tipos

```bash
npx -p typescript@5 tsc --noEmit -p .
npx playwright test --list
```
