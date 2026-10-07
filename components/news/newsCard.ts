import { Locator } from "@playwright/test";

/**
 * Helper component para manejo de tarjetas de noticias
 * Permite extraer información de cualquier tarjeta .cardNoticia--Card
 */
export default class NewsCard {
    readonly card: Locator;

    constructor(card: Locator) {
        this.card = card;
    }

    /**
     * Obtiene el título de la tarjeta
     */
    async getTitle(): Promise<string> {
        return await this.card.locator('h1').innerText();
    }

    /**
     * Obtiene la fecha de la tarjeta (formato DD/MM/YYYY)
     */
    async getDateString(): Promise<string> {
        return await this.card.locator('p').first().innerText();
    }

    /**
     * Parsea la fecha a objeto Date
     */
    async getDate(): Promise<Date> {
        const dateStr = await this.getDateString();
        const parts = dateStr.trim().split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        return new Date(0);
    }

    /**
     * Click en la tarjeta
     */
    async click(): Promise<void> {
        await this.card.click();
    }

    /**
     * Verifica si la tarjeta tiene clase destacada (hero)
     */
    async isHero(): Promise<boolean> {
        const className = await this.card.getAttribute('class') || '';
        return className.includes('destacada');
    }

    /**
     * Verifica si es tarjeta secundaria
     */
    async isSecondary(): Promise<boolean> {
        const className = await this.card.getAttribute('class') || '';
        return className.includes('secundaria');
    }
}
