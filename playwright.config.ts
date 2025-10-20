import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',
    //actionTimeout: 6000,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on',
  },

  /* Configure projects for major browsers */
  projects: [
    // ===== PROYECTO DE SETUP =====
    // Este proyecto ejecuta el script de autenticación PRIMERO.
    {
      name: 'setup',
      // Busca específicamente tu archivo de setup.
      // Ajusta el patrón si 'auth.setup.pre.ts' no está en la raíz.
      // Podría ser './auth.setup.pre.ts' o './tests/setup/auth.setup.pre.ts', etc.
      testMatch: '**/auth.setup.pre.ts', // Asegúrate que este patrón encuentre tu archivo
    },

    // ===== PROYECTOS DE TEST =====
    // Estos proyectos dependen de que 'setup' se complete y usan el estado guardado.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usa el estado de autenticación guardado por el proyecto 'setup'.
        storageState: "C:\\Polko\\Polko_tests\\.auth\\userPre.json",
      },
      dependencies: ['setup'], // Depende de que 'setup' termine primero
    },

    //{
    //  name: 'firefox',
    //  use: { ...devices['Desktop Firefox'] },
    //},
//
    //{
    //  name: 'webkit',
    //  use: { ...devices['Desktop Safari'] },
    //},

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
