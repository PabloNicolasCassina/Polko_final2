import { test, expect } from "@playwright/test";
import CotizarMotoIAPage, { PLAN_CODES_MOTO } from "../pages/cotizarMotoIAPage";

test("debug buscar mobile", async ({ page }) => {
    test.setTimeout(240000);
    const moto = new CotizarMotoIAPage(page);
    await moto.goto();
    await moto.cotizarVehiculo({ marca: "BENELLI", año: "2022", version: "LEONCINO 250", c_postal: "5000" });
    await moto.selectCompania("Sancor");
    const code = PLAN_CODES_MOTO["Sancor"]["Moto Premium"];
    await moto.emitirBtn(code).click();
    await expect(moto.formaPagoSelect).toBeVisible({ timeout: 30000 });
    await moto.formaPagoSelect.click();
    await page.getByRole("option").first().click();
    const nro = moto.emisionFormaPago.nroTarjeta;
    if (await nro.isVisible().catch(() => false)) await moto.emisionFormaPago.fillTarjetaCredito({ atm: true, sancor: true });
    else if (await moto.emisionFormaPago.CBU.isVisible().catch(() => false)) await moto.emisionFormaPago.fillCBU();
    await moto.buttons.siguienteBtn.click();
    await expect(page.getByText("Buscar cliente")).toBeVisible({ timeout: 30000 });
    await moto.emisionCliente.nosisInput.fill("27381618426");
    const btn = moto.emisionCliente.buscarBtn;
    await btn.scrollIntoViewIfNeeded();
    for (let i = 0; i < 4; i++) {
        const info = await btn.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const hit = document.elementFromPoint(cx, cy);
            const desc = (e: Element | null) => (e ? `${e.tagName}.${String(e.className).slice(0, 80)}` : "null");
            const chain: string[] = [];
            for (let p: Element | null = el; p; p = p.parentElement) {
                const s = getComputedStyle(p);
                if (s.transform !== "none" || s.overflowY !== "visible" || s.position === "sticky" || s.position === "fixed" || (s as any).zoom !== "1")
                    chain.push(`${desc(p)} transform=${s.transform} ovY=${s.overflowY} pos=${s.position} zoom=${(s as any).zoom} scrollTop=${p.scrollTop}`);
            }
            return {
                rect: [r.left, r.top, r.width, r.height],
                hit: desc(hit),
                hitIsInside: !!hit && el.contains(hit),
                scrollY: window.scrollY,
                inner: [window.innerWidth, window.innerHeight],
                vv: window.visualViewport ? [window.visualViewport.offsetTop, window.visualViewport.pageTop, window.visualViewport.scale, window.visualViewport.height] : null,
                chain,
            };
        });
        console.log(JSON.stringify(info, null, 1));
        await page.waitForTimeout(700);
    }
    await page.screenshot({ path: test.info().outputPath("buscar.png") });
    await moto.emisionCliente.buscarEnNosis();
    await expect(moto.emisionCliente.completarBtn).toBeHidden({ timeout: 60000 });
    console.log("NOSIS OK", await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
});
