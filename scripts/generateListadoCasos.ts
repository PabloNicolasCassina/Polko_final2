import { writeFileSync, mkdirSync } from "fs";
import { companyBillingConfigs } from "../data/tiposFacturacion";
import { getCombinaciones, getDescuentos } from "../data/configsAvanzadas";
import { companyAdvancedAxes, orDefault } from "../data/regresionFullAutoAxes";

const companias = [
    "sancor",
    "rivadavia",
    "zurich",
    "rus",
    "federacion_patronal",
    "experta",
    "atm",
    "triunfo",
    "mercantil_andina",
] as const;

type Compania = (typeof companias)[number];

function filtrarSinConfig(f: any[]) {
    return f
        .filter((c) => c.type === "Mensual")
        .map((c) => ({
            ...c,
            validPaymentCombinations: c.validPaymentCombinations.filter((m: any) =>
                ["Medios electrónicos", "Tarjeta de crédito", "Débito por CBU"].includes(m.primary)
            ),
            validInstallments: ["1"],
        }))
        .filter((c) => c.validPaymentCombinations.length);
}

function pagoDesc(m: { primary: string; secondary?: string }) {
    return m.secondary ? `${m.primary} > ${m.secondary}` : m.primary;
}

function axesFor(comp: Compania) {
    const axes = { ...companyAdvancedAxes[comp] };
    if (comp === "rivadavia") {
        axes.ajustes = ["Aplicar 10%"];
        axes.usos = ["Particular"];
    }
    return axes;
}

interface Caso {
    id: string;
    compania: string;
    configAvanzada: boolean;
    persona: string;
    vehiculo: string;
    gnc: boolean;
    ceroKm: boolean;
    prenda: boolean;
    facturacion: string;
    pago: string;
    cuotas: string;
    ajuste?: string;
    uso?: string;
    grua?: boolean;
    descuento: number;
}

const casosPorCia: Record<string, Caso[]> = {};
let globalIdx = 0;

function pushCaso(c: Omit<Caso, "id">) {
    globalIdx++;
    const id = `TC-${String(globalIdx).padStart(4, "0")}`;
    if (!casosPorCia[c.compania]) casosPorCia[c.compania] = [];
    casosPorCia[c.compania].push({ ...c, id });
}

const autoUsado = "RENAULT LOGAN 2022";
const autoCero = "TOYOTA YARIS 2026";
const autoJur = "RENAULT LOGAN 2022 (Jurídica)";

for (const comp of companias) {
    const fact = companyBillingConfigs[comp];
    if (!fact) continue;
    const axes = axesFor(comp);
    const descuentos = getDescuentos(comp);
    const ajustes = orDefault(axes.ajustes, undefined as unknown as string);
    const usos = orDefault(axes.usos, undefined as unknown as string);
    const gruas = axes.grua.length ? axes.grua : [false];
    const combMA = getCombinaciones(comp);

    const personas = [
        {
            label: "Física CF",
            vehUsado: autoUsado,
            vehCero: autoCero,
            gnc: [false, true],
            cero: [false, true],
            prenda: [false, true],
        },
        {
            label: "Jurídica RI",
            vehUsado: autoJur,
            vehCero: autoJur,
            gnc: [false],
            cero: [false],
            prenda: [false, true],
        },
    ];

    for (const persona of personas) {
        for (const gnc of persona.gnc) {
            for (const ceroKm of persona.cero) {
                for (const prenda of persona.prenda) {
                    const vehiculo = ceroKm ? persona.vehCero : persona.vehUsado;

                    if (combMA) {
                        for (const comb of combMA) {
                            const billing = fact.find((c: any) => c.type === comb.tipoFacturacion);
                            if (!billing || !billing.validInstallments.map(String).includes(String(comb.cuota))) {
                                continue;
                            }
                            for (const metodo of billing.validPaymentCombinations) {
                                for (const descuento of descuentos) {
                                    pushCaso({
                                        compania: comp,
                                        configAvanzada: true,
                                        persona: persona.label,
                                        vehiculo,
                                        gnc,
                                        ceroKm,
                                        prenda,
                                        facturacion: billing.type,
                                        pago: pagoDesc(metodo),
                                        cuotas: String(comb.cuota),
                                        ajuste: comb.ajusteAutomatico,
                                        descuento,
                                    });
                                }
                            }
                        }
                        continue;
                    }

                    for (const billing of fact) {
                        for (const metodo of billing.validPaymentCombinations) {
                            for (const cuota of billing.validInstallments) {
                                for (const ajuste of ajustes) {
                                    for (const uso of usos) {
                                        for (const grua of gruas) {
                                            for (const descuento of descuentos) {
                                                pushCaso({
                                                    compania: comp,
                                                    configAvanzada: true,
                                                    persona: persona.label,
                                                    vehiculo,
                                                    gnc,
                                                    ceroKm,
                                                    prenda,
                                                    facturacion: billing.type,
                                                    pago: pagoDesc(metodo),
                                                    cuotas: String(cuota),
                                                    ajuste: ajuste !== undefined ? ajuste : undefined,
                                                    uso: uso !== undefined ? uso : undefined,
                                                    grua: comp === "rivadavia" ? grua : undefined,
                                                    descuento,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const sin = filtrarSinConfig(fact);
    for (const persona of [
        { label: "Física CF", veh: autoUsado },
        { label: "Jurídica RI", veh: autoJur },
    ]) {
        for (const billing of sin) {
            for (const metodo of billing.validPaymentCombinations) {
                for (const cuota of billing.validInstallments) {
                    pushCaso({
                        compania: comp,
                        configAvanzada: false,
                        persona: persona.label,
                        vehiculo: persona.veh,
                        gnc: false,
                        ceroKm: false,
                        prenda: false,
                        facturacion: billing.type,
                        pago: pagoDesc(metodo),
                        cuotas: String(cuota),
                        descuento: 0,
                    });
                }
            }
        }
    }
}

const titles: Record<string, string> = {
    sancor: "Sancor",
    rivadavia: "Rivadavia",
    zurich: "Zurich",
    rus: "RUS",
    federacion_patronal: "Federación Patronal",
    experta: "Experta",
    atm: "ATM",
    triunfo: "Triunfo",
    mercantil_andina: "Mercantil Andina",
};

const lines: string[] = [];
lines.push("# Listado de casos de prueba — Regresión full AUTO");
lines.push("");
lines.push("Producto cartesiano de cotización + emisión AUTO.");
lines.push("");
lines.push("## Criterios");
lines.push("");
lines.push(
    "- **Con config avanzada:** facturación × pago × cuotas × ajuste × uso × grúa (si aplica) × GNC × 0Km × prenda × descuento (0/tope) × Física CF / Jurídica RI."
);
lines.push(
    "- **Sin config avanzada:** Mensual + pagos básicos × Física/Jurídica (sin GNC/0Km/prenda)."
);
lines.push("- **Vehículos:** usado = RENAULT LOGAN 2022; 0Km = TOYOTA YARIS 2026.");
lines.push(
    "- **Rivadavia (acotada):** las 3 facturaciones; ajuste fijo **Aplicar 10%** (mínimo); uso fijo **Particular**; grúa sí/no sigue en cartesiano."
);
lines.push(
    "- **Sancor descuento:** **0%**, **15%** (sin check adicional) y **25%** (tilda **¿Necesitás un descuento adicional?** + modal ACEPTAR Y HABILITAR)."
);
lines.push("");

const total = Object.values(casosPorCia).reduce((a, b) => a + b.length, 0);
lines.push("## Resumen");
lines.push("");
lines.push("| Compañía | Cantidad |");
lines.push("|----------|---------:|");
for (const comp of companias) {
    lines.push(`| ${titles[comp]} | ${casosPorCia[comp]?.length ?? 0} |`);
}
lines.push(`| **Total** | **${total}** |`);
lines.push("");

for (const comp of companias) {
    const casos = casosPorCia[comp] || [];
    lines.push(`## ${titles[comp]} (${casos.length} casos)`);
    lines.push("");
    lines.push(
        "| ID | Config | Persona | Vehículo | GNC | 0Km | Prenda | Facturación | Pago | Cuotas | Ajuste | Uso | Grúa | Desc |"
    );
    lines.push(
        "|----|--------|---------|----------|-----|-----|--------|-------------|------|--------|--------|-----|------|------|"
    );
    for (const c of casos) {
        lines.push(
            `| ${c.id} | ${c.configAvanzada ? "Sí" : "No"} | ${c.persona} | ${c.vehiculo} | ${c.gnc ? "Sí" : "No"} | ${c.ceroKm ? "Sí" : "No"} | ${c.prenda ? "Sí" : "No"} | ${c.facturacion} | ${c.pago} | ${c.cuotas} | ${c.ajuste ?? "—"} | ${c.uso ?? "—"} | ${c.grua === undefined ? "—" : c.grua ? "ON" : "OFF"} | ${c.descuento}% |`
        );
    }
    lines.push("");
}

mkdirSync("docs", { recursive: true });
const out = "docs/listado casos pruebas.md";
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${out} — ${total} casos`);
for (const comp of companias) console.log(`  ${comp}: ${casosPorCia[comp]?.length}`);
