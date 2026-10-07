import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });

// Identifica la corrida en todos los workers (heredan el env del runner). Lo usa la fase 2 de
// autoOperacionesPorFuera para no tomar solicitudes de corridas anteriores.
process.env.OPF_RUN_ID ??= String(Date.now());

/**
 * Configuración optimizada para ejecución paralela con 4 workers en modo headless.
 *
 * Uso:
 *   npx playwright test tests/regresionFinal.spec.ts --workers=4
 *   WORKERS=4 npx playwright test tests/regresionFinal.spec.ts
 *   npx playwright test --project=ultimas-cotizaciones  # seed → acciones (userPre)
 *   npx playwright test --project=ultimas-cotizaciones-polkista  # idem con userPolkista
 *   npx playwright test tests/motoHappyPath.spec.ts --project=chromiumPolkista
 *
 * El auth JSON no se pasa por parámetro en cada spec: lo elige el project
 * (`chromium` / `ultimas-*` → userPre; `chromiumPolkista` / `ultimas-*-polkista` → userPolkista).
 *
 * See https://playwright.dev/docs/test-configuration.
 */

const chromeLaunchArgs = [
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-setuid-sandbox',
  '--no-sandbox',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

const desktopChromeUse = {
  ...devices['Desktop Chrome'],
  storageState: path.join(__dirname, '.auth', 'userPre.json'),
  launchOptions: { args: chromeLaunchArgs },
};

/** Mismo desktop chrome con sesión polkista (`.auth/userPolkista.json`). */
const desktopChromePolkistaUse = {
  ...devices['Desktop Chrome'],
  storageState: path.join(__dirname, '.auth', 'userPolkista.json'),
  launchOptions: { args: chromeLaunchArgs },
};

const allureReporter: ReporterDescription = ['allure-playwright', {
  resultsDir: 'allure-results',
  detail: true,
  suiteTitle: true,
  links: {
    issue: { nameTemplate: '%s', urlTemplate: 'https://polko.atlassian.net/browse/%s' },
  },
}];

/**
 * Qase publica cada corrida en el proyecto QASE_TESTOPS_PROJECT. Sin token queda apagado;
 * con QASE_MODE=off se apaga puntualmente aunque el token esté en `.env`. Con `--list` no publica.
 */
const isListOnly = process.argv.includes('--list');

const qaseReporter: ReporterDescription = ['playwright-qase-reporter', {
  mode: process.env.QASE_TESTOPS_API_TOKEN && !isListOnly ? 'testops' : 'off',
  testops: {
    api: { token: process.env.QASE_TESTOPS_API_TOKEN },
    project: process.env.QASE_TESTOPS_PROJECT ?? 'POLKOFINAL',
    uploadAttachments: true,
    run: { complete: true },
  },
}];

/** Specs de Últimas cotizaciones: van por projects dedicados (seed → acciones). */
const ultimasCotizacionesIgnore = '**/ultimasCotizaciones*.spec.ts';

export default defineConfig({
  testDir: './tests',
  timeout: 150000,

  expect: {
    timeout: 30000,
  },

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : process.env.WORKERS ? parseInt(process.env.WORKERS) : 4,

  reporter: process.env.CI
    ? [['html'], ['github'], allureReporter, qaseReporter, ['json', { outputFile: 'playwright-report/results.json' }]]
    : [
        ['html'],
        ['list', { printSteps: true }],
        ['json', { outputFile: 'playwright-report/results.json' }],
        allureReporter,
        qaseReporter,
      ],

  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'on',
    headless: true,
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.pre.ts',
    },

    {
      name: 'setup-polkista',
      testMatch: '**/auth.setup.polkista.ts',
    },

    {
      name: 'setup-sancor',
      testMatch: '**/sancorAuth.pre.ts',
    },

    // Últimas cotizaciones: seed parallel → acciones serial (Playwright no permite nested parallel-in-serial)
    {
      name: 'ultimas-seed',
      testMatch: '**/ultimasCotizaciones.seed.spec.ts',
      use: desktopChromeUse,
      dependencies: ['setup'],
    },
    {
      name: 'ultimas-cotizaciones',
      testMatch: '**/ultimasCotizaciones.spec.ts',
      use: desktopChromeUse,
      dependencies: ['ultimas-seed'],
      // Secuencial por archivo, pero SIN mode serial: un fallo no saltea el resto.
      fullyParallel: false,
    },

    // Misma cadena seed → acciones, con userPolkista.json
    {
      name: 'ultimas-seed-polkista',
      testMatch: '**/ultimasCotizaciones.seed.spec.ts',
      use: desktopChromePolkistaUse,
      dependencies: ['setup-polkista'],
    },
    {
      name: 'ultimas-cotizaciones-polkista',
      testMatch: '**/ultimasCotizaciones.spec.ts',
      use: desktopChromePolkistaUse,
      dependencies: ['ultimas-seed-polkista'],
      fullyParallel: false,
    },

    {
      name: 'chromium',
      testIgnore: ultimasCotizacionesIgnore,
      use: desktopChromeUse,
      dependencies: ['setup'],
    },

    {
      name: 'chromiumPolkista',
      testIgnore: ultimasCotizacionesIgnore,
      use: desktopChromePolkistaUse,
      dependencies: ['setup-polkista'],
    },

    {
      name: 'firefox',
      testIgnore: ultimasCotizacionesIgnore,
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(__dirname, '.auth', 'userPre.json'),
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      testIgnore: ultimasCotizacionesIgnore,
      use: {
        ...devices['Desktop Safari'],
        storageState: path.join(__dirname, '.auth', 'userPre.json'),
      },
      dependencies: ['setup'],
    },

    {
      name: 'Mobile Chrome',
      testIgnore: ultimasCotizacionesIgnore,
      use: {
        ...devices['iPhone SE'],
      },
    },

    {
      name: 'mobile',
      testIgnore: ultimasCotizacionesIgnore,
      use: {
        ...devices['iPhone SE'],
        browserName: 'chromium',
        storageState: path.join(__dirname, '.auth', 'userPre.json'),
        launchOptions: {
          args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
      dependencies: ['setup'],
    },
  ],
});
