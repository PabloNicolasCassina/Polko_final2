import { randomUUID } from "crypto";
import { expect, type APIRequestContext } from "@playwright/test";
import type { PlanAsistencia } from "../pages/cotizarAsistenciaViajeroPage";
import { formatFechaAr } from "./edadViajero";

/**
 * Cotizaciones directas a Snuggle para comparar con lo que muestra el cotizador de Polko:
 * - Admin (`/api/internal/quoter/admin`): la misma consulta que hace admin.snuggle.travel con el token de
 *   sesión del broker (SNUGGLE_ADMIN_TOKEN). Es la referencia de los tests.
 * - API pública (`/api/v1.0/quoter`): con las credenciales de la integración de Polko (las de
 *   microservice_products), para saber si un plan que falta en Polko ya no lo devuelve Snuggle.
 *
 * Variables en `Polko_final2/.env` (no versionado): SNUGGLE_ADMIN_TOKEN, SNUGGLE_CLIENT_ID,
 * SNUGGLE_CLIENT_SECRET y, opcional, SNUGGLE_BASE_URL (por defecto producción, igual que products).
 */

const BASE_URL = (process.env.SNUGGLE_BASE_URL ?? "https://api.snuggle.travel").replace(/\/+$/, "");
const TIMEOUT_COTIZACION_MS = 90000;
const MARGEN_VENCIMIENTO_MS = 60000;
/** Margen para que el token del admin no venza en medio del test. */
const MARGEN_TOKEN_ADMIN_MS = 5 * 60000;
/** La tarjeta de Polko redondea el total. */
const TOLERANCIA_PESOS = 1;

export interface ProductoSnuggle {
    code: string;
    title: string;
    total: number;
    currency: string;
    provider: string;
    modality?: string;
    rateType?: string;
    pdfUrl?: string;
    addonOf?: string | null;
    quoteCode?: string;
}

export interface CotizacionSnuggle {
    request: Record<string, unknown>;
    status: number;
    providers: string[];
    products: ProductoSnuggle[];
    message: unknown;
}

export interface PedidoCotizacionSnuggle {
    destinationRegion: string;
    salida: Date;
    regreso: Date;
    edades: readonly number[];
}

let token: { valor: string; vence: number } | null = null;

export function snuggleApiConfigurada(): boolean {
    return Boolean(process.env.SNUGGLE_CLIENT_ID && process.env.SNUGGLE_CLIENT_SECRET);
}

async function obtenerToken(request: APIRequestContext): Promise<string> {
    if (token && token.vence - MARGEN_VENCIMIENTO_MS > Date.now()) return token.valor;
    const response = await request.post(`${BASE_URL}/auth/api-token`, {
        data: { clientId: process.env.SNUGGLE_CLIENT_ID, clientSecret: process.env.SNUGGLE_CLIENT_SECRET },
        timeout: 30000,
    });
    expect(response.ok(), `POST /auth/api-token de Snuggle respondió ${response.status()}`).toBe(true);
    const body = await response.json();
    token = { valor: body.accessToken, vence: Date.now() + Number(body.expiresIn ?? 3600) * 1000 };
    return token.valor;
}

function fechaSnuggle(fecha: Date): string {
    return formatFechaAr(fecha).replace(/\//g, "-");
}

/** Mismo cuerpo que arma products (`Snuggle/mappers.build_snuggle_request` + defaults de `SnuggleQuotationRequest`). */
export function pedidoComoProducts(pedido: PedidoCotizacionSnuggle): Record<string, unknown> {
    return {
        name: "Pasajero",
        lastName: "Principal",
        countryOrigin: "Argentina",
        destinationRegion: pedido.destinationRegion,
        startDate: fechaSnuggle(pedido.salida),
        endDate: fechaSnuggle(pedido.regreso),
        passengerAges: [...pedido.edades],
        tripType: "single",
        dataResult: "summary",
        resultOrder: "priceAsc",
        quoteMode: "Multi provider",
        coverages: false,
    };
}

/** Vencimiento (ms) del token de sesión del admin de Snuggle, leído del JWT; null si no hay token. */
export function vencimientoTokenAdmin(): number | null {
    const tokenAdmin = process.env.SNUGGLE_ADMIN_TOKEN;
    if (!tokenAdmin) return null;
    try {
        const payload = JSON.parse(Buffer.from(tokenAdmin.split(".")[1], "base64url").toString());
        return Number(payload.exp) * 1000;
    } catch {
        return null;
    }
}

export function exigirTokenAdminVigente(): void {
    const vence = vencimientoTokenAdmin();
    expect(vence, "Falta SNUGGLE_ADMIN_TOKEN en Polko_final2/.env (token de sesión de admin.snuggle.travel)").not.toBeNull();
    expect(
        vence! - MARGEN_TOKEN_ADMIN_MS > Date.now(),
        `SNUGGLE_ADMIN_TOKEN vence ${new Date(vence!).toLocaleTimeString("es-AR")}: copiá uno nuevo desde admin.snuggle.travel`,
    ).toBe(true);
}

/** Planes base (sin adicionales `addonOf`) de un proveedor, del más barato al más caro. */
export function planesDelProveedor(cotizacion: CotizacionSnuggle | null, proveedor: RegExp): ProductoSnuggle[] | null {
    if (!cotizacion) return null;
    return cotizacion.products.filter((p) => proveedor.test(p.provider) && !p.addonOf).sort((a, b) => a.total - b.total);
}

const mismoPrecio = (a: number, b: number): boolean => Math.abs(a - b) <= TOLERANCIA_PESOS;
const pesos = (monto: number): string => `$${monto.toLocaleString("es-AR")}`;

/**
 * Diferencias entre Polko y el admin de Snuggle. Polko renombra los planes, por eso se cruza por precio.
 * Cada plan del admin que no está en Polko se diagnostica con la API de Polko (`api`): si tampoco viene
 * ahí, Snuggle no se lo manda a Polko.
 */
export function compararConAdmin(polko: PlanAsistencia[], admin: ProductoSnuggle[], api: ProductoSnuggle[] | null): string[] {
    const diferencias: string[] = [];
    if (polko.length < admin.length) {
        diferencias.push(`A Polko le llegan ${polko.length} planes y el admin de Snuggle tiene ${admin.length}`);
    }
    for (const producto of admin) {
        if (polko.some((plan) => mismoPrecio(plan.precio, producto.total))) continue;
        const causa = !api
            ? ""
            : api.some((p) => mismoPrecio(p.total, producto.total))
              ? " → la API de Polko sí lo devuelve: lo pierde Polko"
              : " → tampoco viene en la API de Polko: Snuggle no se lo manda a Polko";
        diferencias.push(
            `Falta en Polko "${producto.title}" (${producto.code}, ${producto.modality ?? "?"}) ${pesos(producto.total)}${causa}`,
        );
    }
    for (const plan of polko) {
        if (!admin.some((producto) => mismoPrecio(plan.precio, producto.total))) {
            diferencias.push(`Polko muestra "${plan.nombre}" ${pesos(plan.precio)} que el admin de Snuggle no tiene`);
        }
    }
    return diferencias;
}

/**
 * Misma cotización que hace el admin de Snuggle (admin.snuggle.travel → `/api/internal/quoter/admin`) para
 * un proveedor, con el token de sesión del broker en SNUGGLE_ADMIN_TOKEN (vence cada hora).
 */
export async function cotizarEnSnuggleAdmin(
    request: APIRequestContext,
    pedido: PedidoCotizacionSnuggle,
    proveedor: string,
): Promise<CotizacionSnuggle> {
    const body = {
        name: process.env.SNUGGLE_ADMIN_NAME ?? "Polko",
        lastName: process.env.SNUGGLE_ADMIN_LASTNAME ?? "Tecnologia en Seguros",
        email: process.env.SNUGGLE_ADMIN_EMAIL ?? "guido.fraire@grupopas.com.ar",
        phone: process.env.SNUGGLE_ADMIN_PHONE ?? "+54-3512334798",
        countryOrigin: "Argentina",
        destinationRegion: pedido.destinationRegion,
        tripType: "single",
        startDate: fechaSnuggle(pedido.salida),
        endDate: fechaSnuggle(pedido.regreso),
        passengerAges: [...pedido.edades],
        leadSource: "admin-crm",
        brokerId: Number(process.env.SNUGGLE_ADMIN_BROKER_ID ?? 2173),
        groupCode: randomUUID().replace(/-/g, ""),
        provider: proveedor,
    };
    const response = await request.post(`${BASE_URL}/api/internal/quoter/admin`, {
        headers: {
            Authorization: `Bearer ${process.env.SNUGGLE_ADMIN_TOKEN}`,
            Origin: "https://admin.snuggle.travel",
            Referer: "https://admin.snuggle.travel/",
        },
        data: body,
        timeout: TIMEOUT_COTIZACION_MS,
    });
    expect(
        response.status(),
        response.status() === 401
            ? "El token del admin de Snuggle (SNUGGLE_ADMIN_TOKEN) venció: copiá uno nuevo desde admin.snuggle.travel"
            : `Admin de Snuggle (${proveedor}) respondió ${response.status()}: ${(await response.text()).slice(0, 300)}`,
    ).toBeLessThan(300);
    return aCotizacion(body, response.status(), await response.json());
}

function aCotizacion(body: Record<string, unknown>, status: number, json: any): CotizacionSnuggle {
    const data = json?.data ?? {};
    const crudos: any[] = Array.isArray(data.products) ? data.products : data.product?.code ? [data.product] : [];
    return {
        request: body,
        status,
        providers: data.providers ?? (data.provider ? [data.provider] : []),
        message: json?.meta?.message ?? null,
        products: crudos.map((p) => ({
            code: String(p.code),
            title: String(p.title ?? ""),
            total: Number(p.total),
            currency: String(p.currency ?? ""),
            provider: String(p.provider ?? ""),
            modality: p.modality,
            rateType: p.rateType,
            pdfUrl: p.pdfUrl,
            addonOf: p.addonOf ?? null,
            quoteCode: p.quoteCode,
        })),
    };
}

export async function cotizarEnSnuggle(
    request: APIRequestContext,
    pedido: PedidoCotizacionSnuggle,
): Promise<CotizacionSnuggle> {
    const body = pedidoComoProducts(pedido);
    const enviar = async () =>
        request.post(`${BASE_URL}/api/v1.0/quoter`, {
            headers: { Authorization: `Bearer ${await obtenerToken(request)}` },
            data: body,
            timeout: TIMEOUT_COTIZACION_MS,
        });

    let response = await enviar();
    if (response.status() === 401) {
        token = null;
        response = await enviar();
    }
    if (response.status() === 429) {
        const espera = Number(response.headers()["retry-after"] ?? 5);
        await new Promise((resolve) => setTimeout(resolve, Math.min(espera, 60) * 1000));
        response = await enviar();
    }
    expect(response.ok(), `POST /api/v1.0/quoter de Snuggle respondió ${response.status()}: ${await response.text()}`).toBe(true);

    return aCotizacion(body, response.status(), await response.json());
}
