/**
 * Generador IPO (In-Parameter-Order) de covering array all-pairs.
 * Garantiza que cada par de valores entre cada par de factores aparezca
 * ≥1 vez, sin el cartesiano completo y sin inflar filas duplicadas.
 */

export type PairwiseValue = string | boolean | number;

export type PairwiseFactor = {
    name: string;
    values: readonly PairwiseValue[];
};

export type PairwiseRow = Record<string, PairwiseValue>;

function parseValue(raw: string, factor: PairwiseFactor): PairwiseValue {
    const sample = factor.values[0];
    if (typeof sample === "boolean") return raw === "true";
    if (typeof sample === "number") return Number(raw);
    return raw;
}

function uncoverKey(prevIdx: number, prevVal: PairwiseValue, newVal: PairwiseValue): string {
    return `${prevIdx}\0${String(prevVal)}\0${String(newVal)}`;
}

/**
 * Extiende un covering parcial agregando `newFactor`, cubriendo todos los
 * pares (newFactor × cada factor previo).
 */
function extendWithFactor(
    rows: PairwiseRow[],
    newFactor: PairwiseFactor,
    previous: PairwiseFactor[]
): PairwiseRow[] {
    const uncovered = new Set<string>();
    for (let pi = 0; pi < previous.length; pi++) {
        for (const pv of previous[pi].values) {
            for (const nv of newFactor.values) {
                uncovered.add(uncoverKey(pi, pv, nv));
            }
        }
    }

    const extended = rows.map((row) => ({ ...row }));

    for (const row of extended) {
        let bestVal: PairwiseValue = newFactor.values[0];
        let bestScore = -1;
        for (const nv of newFactor.values) {
            let score = 0;
            for (let pi = 0; pi < previous.length; pi++) {
                if (uncovered.has(uncoverKey(pi, row[previous[pi].name], nv))) score++;
            }
            if (score > bestScore) {
                bestScore = score;
                bestVal = nv;
            }
        }
        row[newFactor.name] = bestVal;
        for (let pi = 0; pi < previous.length; pi++) {
            uncovered.delete(uncoverKey(pi, row[previous[pi].name], bestVal));
        }
    }

    while (uncovered.size > 0) {
        const next = uncovered.values().next().value as string;
        const [piStr, pvRaw, nvRaw] = next.split("\0");
        const pi = Number(piStr);
        const row: PairwiseRow = {};
        for (const f of previous) {
            row[f.name] = f.values[0];
        }
        row[previous[pi].name] = parseValue(pvRaw, previous[pi]);
        row[newFactor.name] = parseValue(nvRaw, newFactor);

        for (let i = 0; i < previous.length; i++) {
            if (i === pi) continue;
            let best: PairwiseValue = previous[i].values[0];
            let bestScore = -1;
            for (const cand of previous[i].values) {
                let score = 0;
                if (uncovered.has(uncoverKey(i, cand, row[newFactor.name]))) score++;
                if (score > bestScore) {
                    bestScore = score;
                    best = cand;
                }
            }
            row[previous[i].name] = best;
        }

        for (let i = 0; i < previous.length; i++) {
            uncovered.delete(uncoverKey(i, row[previous[i].name], row[newFactor.name]));
        }
        extended.push(row);
    }

    return extended;
}

/**
 * Devuelve filas pairwise. Con 1 factor = each-choice; con 0 = [{}].
 */
export function generatePairwise(factors: PairwiseFactor[]): PairwiseRow[] {
    if (factors.length === 0) return [{}];
    if (factors.length === 1) {
        return factors[0].values.map((v) => ({ [factors[0].name]: v }));
    }

    // Factores más grandes primero → covering más chico.
    const sorted = [...factors].sort((a, b) => b.values.length - a.values.length);

    let rows: PairwiseRow[] = [];
    for (const v0 of sorted[0].values) {
        for (const v1 of sorted[1].values) {
            rows.push({ [sorted[0].name]: v0, [sorted[1].name]: v1 });
        }
    }

    for (let f = 2; f < sorted.length; f++) {
        rows = extendWithFactor(rows, sorted[f], sorted.slice(0, f));
    }

    return rows;
}

/** Etiqueta corta para el nombre del test (ej. `grua=true, facturacion=Mensual`). */
export function formatPairwiseRow(row: PairwiseRow): string {
    return Object.entries(row)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(", ");
}

/** Fila pairwise como parámetros de reporte (Allure/Qase solo aceptan strings). */
export function pairwiseRowToParams(row: PairwiseRow): Record<string, string> {
    return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)]));
}
