import {test, expect} from "@playwright/test";
import DashboardPage from "../pages/dashboardPage";

let dashboardPage: DashboardPage;

test.beforeEach('Reutilizar el estado de autenticación de Facebook', async ({ page }, testInfo) => {
    // El hook beforeEach ahora solo se encarga de la configuración común que NO depende de los parámetros del test.
    let urlPrefix;
    let dashPrefix;
    const projectName = testInfo.project.name;

    if (projectName === 'setup-pre' || projectName === 'chromiumPre') {
        urlPrefix = 'http://localhost:8080';
        dashPrefix = "http://localhost:3000";
    } else if (projectName === 'setup-pro' || projectName === 'chromiumPro') {
        urlPrefix = 'https://api.polko.com.ar';
        dashPrefix = "https://www.polko.com.ar";
    }

    // LA NAVEGACIÓN INICIAL SE HA MOVIDO A CADA TEST INDIVIDUAL.
});


test("Ingreso al dash exitoso", async ({page}) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.ingreso();

});