import * as allure from "allure-js-commons";

export type Severidad = "blocker" | "critical" | "normal" | "minor" | "trivial";
export type Prioridad = "high" | "medium" | "low";

export interface DocumentacionCaso {
    /** epic/feature/story en Allure. */
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

/** Documenta el caso en curso para Allure. Llamar al inicio del test. */
export async function documentarCaso(doc: DocumentacionCaso): Promise<void> {
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
