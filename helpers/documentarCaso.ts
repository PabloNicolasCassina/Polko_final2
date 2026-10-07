import { test } from "@playwright/test";
import * as allure from "allure-js-commons";
import { qase } from "playwright-qase-reporter";

/** Valores comunes a Allure y Qase (Allure no tiene "major"). */
export type Severidad = "blocker" | "critical" | "normal" | "minor" | "trivial";
export type Prioridad = "high" | "medium" | "low";

export interface DocumentacionCaso {
    /** Jerarquía de suites en Qase y epic/feature/story en Allure. */
    epic: string;
    feature: string;
    story?: string;
    severidad: Severidad;
    prioridad?: Prioridad;
    descripcion: string;
    precondiciones?: string;
    owner?: string;
    /** Claves de Jira, ej. ["POL-2845"]. */
    tickets?: string[];
    parametros?: Record<string, string>;
    tags?: string[];
}

/**
 * Documenta el caso en curso para Allure y Qase. Llamar al inicio del test.
 * Qase identifica el caso por suites + título + parámetros: cambiar cualquiera
 * de los tres crea un caso nuevo en Qase.
 */
export async function documentarCaso(doc: DocumentacionCaso): Promise<void> {
    const suites = [doc.epic, doc.feature, doc.story].filter((s): s is string => Boolean(s));
    for (const suite of suites) {
        test.info().annotations.push({ type: "QaseSuite", description: suite });
    }

    const fields: Record<string, string> = {
        severity: doc.severidad,
        priority: doc.prioridad ?? "medium",
        description: doc.descripcion,
    };
    if (doc.precondiciones) fields.preconditions = doc.precondiciones;
    qase.fields(fields);
    if (doc.parametros) qase.parameters(doc.parametros);
    if (doc.tags?.length) qase.tags(...doc.tags);

    await allure.epic(doc.epic);
    await allure.feature(doc.feature);
    if (doc.story) await allure.story(doc.story);
    await allure.severity(doc.severidad);
    await allure.description(
        doc.precondiciones
            ? `${doc.descripcion}\n\n**Precondiciones:** ${doc.precondiciones}`
            : doc.descripcion,
    );
    if (doc.owner) await allure.owner(doc.owner);
    for (const ticket of doc.tickets ?? []) {
        await allure.issue(ticket, ticket);
    }
    for (const [nombre, valor] of Object.entries(doc.parametros ?? {})) {
        await allure.parameter(nombre, valor);
    }
    if (doc.tags?.length) await allure.tags(...doc.tags);
}
