import { chromium, devices, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import path from "path";

/**
 * Consola de admin dentro de los tests, sin levantar su dev server: el build estático se sirve
 * interceptando http://localhost:3000 solo en un navegador propio (frontend_general sigue en el
 * :3000 real para el resto). `npm run auth:admin` genera las dos cosas que necesita:
 *   - Build de la rama actual con token en localStorage (scripts/buildAdmin.sh; solo build: npm run build:admin).
 *   - Sesión: .auth/userAdmin.json (el token dura ~6 h).
 */
export const ADMIN_BUILD_DIR = path.resolve(__dirname, "..", "..", "admin", "build");
export const ADMIN_AUTH_FILE = path.resolve(__dirname, "..", ".auth", "userAdmin.json");
export const ADMIN_URL = "http://localhost:3000";

/**
 * El HTML servido por `route.fulfill` queda en address space "unknown" y Chrome bloquea los fetch a
 * localhost:8080/8082 ("blocked by CORS policy: … `unknown` address space"). Es opción de launch,
 * por eso admin usa su propio navegador.
 */
const ADMIN_LAUNCH_ARGS = [
    "--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults",
];

/** `OPF_ADMIN=0` vuelve al modo manual (el test espera que alguien opere en admin). */
const OPF_ADMIN_DESACTIVADO = process.env.OPF_ADMIN === "0";

function tokenAdminVigente(): { ok: boolean; motivo?: string } {
    if (!fs.existsSync(ADMIN_AUTH_FILE)) return { ok: false, motivo: `no existe ${ADMIN_AUTH_FILE}` };
    try {
        const state = JSON.parse(fs.readFileSync(ADMIN_AUTH_FILE, "utf-8"));
        const origin = (state.origins ?? []).find((o: any) => o.origin === ADMIN_URL);
        const item = origin?.localStorage?.find((i: any) => i.name.startsWith("@@auth0spajs@@"));
        if (!item) return { ok: false, motivo: "userAdmin.json no tiene el token de Auth0 en localStorage" };
        const expiresAt = Number(JSON.parse(item.value)?.expiresAt ?? 0) * 1000;
        if (expiresAt && expiresAt < Date.now() + 10 * 60_000) {
            return { ok: false, motivo: `el token de admin venció (${new Date(expiresAt).toLocaleString()})` };
        }
        return { ok: true };
    } catch (error) {
        return { ok: false, motivo: `userAdmin.json ilegible: ${(error as Error).message}` };
    }
}

let avisoRamaBuildMostrado = false;

function avisarSiBuildDeOtraRama(): void {
    if (avisoRamaBuildMostrado) return;
    avisoRamaBuildMostrado = true;
    try {
        const info = JSON.parse(fs.readFileSync(path.join(ADMIN_BUILD_DIR, "polko-build.json"), "utf-8"));
        const ramaActual = execSync("git branch --show-current", {
            cwd: path.dirname(ADMIN_BUILD_DIR),
            stdio: ["ignore", "pipe", "ignore"],
        })
            .toString()
            .trim();
        if (info.rama !== ramaActual) {
            console.warn(
                `⚠️  El build de admin es de "${info.rama}" (${info.commit}) pero admin está en "${ramaActual}": corré npm run build:admin`,
            );
        }
    } catch {
        console.warn("⚠️  No se sabe de qué rama es el build de admin: corré npm run build:admin");
    }
}

/** Si admin se puede automatizar en esta corrida; si no, `motivo` explica qué falta generar. */
export function adminDisponible(): { ok: boolean; motivo?: string } {
    if (OPF_ADMIN_DESACTIVADO) return { ok: false, motivo: "OPF_ADMIN=0" };
    if (!fs.existsSync(path.join(ADMIN_BUILD_DIR, "index.html"))) {
        return { ok: false, motivo: `no hay build de admin en ${ADMIN_BUILD_DIR}` };
    }
    avisarSiBuildDeOtraRama();
    return tokenAdminVigente();
}

export interface AdminSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    close: () => Promise<void>;
}

export async function abrirAdmin(): Promise<AdminSession> {
    const disponible = adminDisponible();
    if (!disponible.ok) throw new Error(`Admin no disponible: ${disponible.motivo}`);

    const browser = await chromium.launch({
        headless: test.info().project.use.headless ?? true,
        args: ADMIN_LAUNCH_ARGS,
    });
    // Admin siempre en escritorio: no hereda el device del proyecto (aunque corra en Mobile Chrome / mobile).
    const context = await browser.newContext({
        ...devices["Desktop Chrome"],
        isMobile: false,
        hasTouch: false,
        storageState: ADMIN_AUTH_FILE,
        serviceWorkers: "block",
        viewport: { width: 1440, height: 900 },
        baseURL: ADMIN_URL,
    });
    await context.route(`${ADMIN_URL}/**`, async (route) => {
        const { pathname } = new URL(route.request().url());
        const archivo = path.join(ADMIN_BUILD_DIR, decodeURIComponent(pathname));
        const esArchivo = archivo.startsWith(ADMIN_BUILD_DIR) && fs.existsSync(archivo) && fs.statSync(archivo).isFile();
        await route.fulfill({ path: esArchivo ? archivo : path.join(ADMIN_BUILD_DIR, "index.html") });
    });
    const page = await context.newPage();
    return { browser, context, page, close: () => browser.close() };
}

/** Abre admin, corre `fn` y cierra el navegador aunque falle; adjunta screenshot si `fn` tira. */
export async function conAdmin<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    const admin = await abrirAdmin();
    try {
        return await fn(admin.page);
    } catch (error) {
        await test.info().attach("admin-error.png", {
            body: await admin.page.screenshot({ fullPage: true }).catch(() => Buffer.alloc(0)),
            contentType: "image/png",
        });
        throw error;
    } finally {
        await admin.close();
    }
}
