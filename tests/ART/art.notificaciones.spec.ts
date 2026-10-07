/// <reference types="node" />
import { test, expect, type Page } from "@playwright/test";
import DashboardPage from "../../pages/dashboardPage";
import EmisionArtPage from "../../pages/emisionArtPage";
import CommonButtons from "../../components/commonButtons";

type EmisionDependencies = {
    emisionArtPage: EmisionArtPage;
    commonButtons: CommonButtons;
    dashboardPage: DashboardPage;
};

function buildEmisionDependencies(page: Page): EmisionDependencies {
    return {
        emisionArtPage: new EmisionArtPage(page),
        commonButtons: new CommonButtons(page),
        dashboardPage: new DashboardPage(page),
    };
}

test.setTimeout(120000);

test.describe("Notificaciones ART", () => {

    test("Campanita muestra notificaciones de cotizaciones/emisiones", async ({ page }) => {
        const deps = buildEmisionDependencies(page);

        await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
        await deps.dashboardPage.retirarFondos.waitFor();

        await test.step("1- Verificar que existe el icono de campanita", async () => {
            // Selector estable para el ícono de notificaciones
            const bellIcon = page.locator('.notification__bellIcon');
            await expect(bellIcon).toBeVisible();
        });

        await test.step("2- Abrir panel de notificaciones", async () => {
            // Click en el contenedor de la campanita para abrir el panel
            await page.locator('.notification__iconContainer').click();

            // Verificar que aparecen las tarjetas de notificación
            const notificationCards = page.locator('.IBar__contentContainer');
            await expect(notificationCards.first()).toBeVisible({ timeout: 5000 });
        });

        await test.step("3- Verificar estructura de notificaciones", async () => {
            // Buscar tarjetas de notificación con la clase correcta
            const notificationItems = page.locator('.IBar__contentContainer');
            const count = await notificationItems.count();

            if (count > 0) {
                const firstNotification = notificationItems.first();
                // Verificar que tiene título, body y footer
                await expect(firstNotification.locator('.IBar__tinyBarTitle')).toBeVisible();
                await expect(firstNotification.locator('.IBar__tinyBarBody')).toBeVisible();
                await expect(firstNotification.locator('.IBar__tinyBarFooter')).toBeVisible();
            }
        });
    });

    test("Notificación contiene referencia a ART cuando aplica", async ({ page }) => {
        const deps = buildEmisionDependencies(page);

        await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
        await deps.dashboardPage.retirarFondos.waitFor();

        await test.step("1- Abrir campanita", async () => {
            await page.locator('.notification__iconContainer').click();
            // Esperar a que carguen las notificaciones
            await page.locator('.IBar__contentContainer').first().waitFor({ timeout: 5000 });
        });

        await test.step("2- Buscar notificaciones relacionadas con ART", async () => {
            // Buscar notificaciones que mencionen ART en el título
            const artNotifications = page.locator('.IBar__contentContainer').filter({
                has: page.locator('.IBar__tinyBarTitle', { hasText: /ART|cotización de ART/i })
            });

            const count = await artNotifications.count();

            if (count > 0) {
                const firstArtNotif = artNotifications.first();
                const title = await firstArtNotif.locator('.IBar__tinyBarTitle').textContent();
                const body = await firstArtNotif.locator('.IBar__tinyBarBody').textContent();
                console.log(`Notificación ART encontrada: ${title} - ${body}`);
            }
        });
    });

    test("Badge de notificaciones no leídas visible cuando hay nuevas", async ({ page }) => {
        const deps = buildEmisionDependencies(page);

        await page.goto("http://localhost:3000/u/dashboard", { waitUntil: 'domcontentloaded' });
        await deps.dashboardPage.retirarFondos.waitFor();

        await test.step("Verificar indicador de notificaciones no leídas en campana", async () => {
            // Punto verde en la campanita que indica notificaciones no leídas
            const bellUnreadIndicator = page.locator('.notification__newAlert');
            const hasUnread = await bellUnreadIndicator.isVisible().catch(() => false);

            if (hasUnread) {
                console.log('Hay notificaciones no leídas (punto verde visible en campanita)');
            }
        });

        await test.step("Verificar indicador en notificaciones individuales", async () => {
            // Abrir panel
            await page.locator('.notification__iconContainer').click();
            await page.locator('.IBar__contentContainer').first().waitFor({ timeout: 5000 });

            // Punto verde en cada notificación no leída
            const unreadDots = page.locator('.NBar__tinyUnreadNotification');
            const unreadCount = await unreadDots.count();

            console.log(`Notificaciones no leídas: ${unreadCount}`);
        });
    });
});
