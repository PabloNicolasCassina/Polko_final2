import type { Page } from "@playwright/test";
import { PLAN_CODES_MOTO } from "../pages/cotizarMotoIAPage";
import UltimasCotizaciones from "../components/ultimasCotizaciones";
import { getMockUserData, type UserType } from "./mockUser";

export const VEHICULO_SEED = {
    marca: "BENELLI",
    año: "2022",
    version: "LEONCINO 250",
    c_postal: "5000",
};

export const ROW_DESCRIPTION = "BENELLI LEONCINO";

export const MOTO_COMPANIES: Array<{ label: string; planName: string; planCode: string }> = [
    { label: "Sancor", planName: "Moto Premium", planCode: PLAN_CODES_MOTO.Sancor["Moto Premium"] },
    { label: "RUS", planName: "RCM c/grúa", planCode: PLAN_CODES_MOTO.RUS["RCM c/grúa"] },
    { label: "Rivadavia", planName: "Base Plus", planCode: PLAN_CODES_MOTO.Rivadavia["Base Plus"] },
    { label: "ATM", planName: "Robo Premium", planCode: PLAN_CODES_MOTO.ATM["Robo Premium"] },
];

export const N = MOTO_COMPANIES.length;
export const SEED_COUNT = N * 2;

export async function setupPageWithMock(
    page: Page,
    targetUrl: string,
    userType: UserType = "master"
): Promise<void> {
    const mockData = getMockUserData(userType);
    await page.route("http://localhost:8080/newGetDatosUsuario?es_master=true*", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: mockData,
        });
    });
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
}

export async function goToDashboardUltimas(page: Page): Promise<UltimasCotizaciones> {
    await setupPageWithMock(page, "http://localhost:3000/u/dashboard");
    const ultimas = new UltimasCotizaciones(page);
    await ultimas.waitForTableLoad();
    await ultimas.heading.scrollIntoViewIfNeeded();
    return ultimas;
}

export async function dismissAceptarIfPresent(page: Page): Promise<void> {
    const aceptar = page.getByRole("button", { name: "Aceptar" });
    if (await aceptar.isVisible({ timeout: 5000 }).catch(() => false)) {
        await aceptar.click();
    }
}
