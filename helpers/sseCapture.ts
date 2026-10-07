import { Page, TestInfo } from '@playwright/test';

export interface SSEEvent {
    type: string;
    data: any;
    timestamp: string;
    url?: string;
    raw?: string;
}

/**
 * Helper para capturar eventos Server-Sent Events (SSE) en tests de Playwright.
 *
 * Estrategia: Interceptar EventSource en el navegador via page.evaluate()
 * para capturar eventos en tiempo real desde el lado del cliente.
 */
export class SSECapture {
    private isSetup = false;
    private urlPattern: string = 'sse';

    constructor(private page: Page) {}

    /**
     * Configura la captura de SSE interceptando EventSource en el navegador.
     * @param urlPattern - Patrón de URL a capturar (default: 'sse')
     */
    async setup(urlPattern: string = 'sse'): Promise<void> {
        if (this.isSetup) {
            return;
        }
        this.urlPattern = urlPattern;

        // Inyectar script para interceptar EventSource
        await this.page.addInitScript((pattern) => {
            // @ts-ignore
            if (window.__sseCaptureInstalled) return;
            // @ts-ignore
            window.__sseCaptureInstalled = true;
            // @ts-ignore
            window.__sseEvents = [];

            const OriginalEventSource = window.EventSource;

            // @ts-ignore
            window.EventSource = function(url: string | URL, options?: EventSourceInit) {
                const es = new OriginalEventSource(url, options);
                const urlString = url.toString();

                // Solo interceptar URLs que matcheen el patrón
                // @ts-ignore
                if (!urlString.includes(pattern) && pattern !== '*') {
                    return es;
                }

                // @ts-ignore
                window.__sseEvents.push({
                    type: 'connection',
                    url: urlString,
                    timestamp: new Date().toISOString(),
                    data: { connected: true }
                });

                es.addEventListener('message', (event) => {
                    let parsedData: any;
                    try {
                        parsedData = JSON.parse(event.data);
                    } catch {
                        parsedData = event.data;
                    }

                    // @ts-ignore
                    window.__sseEvents.push({
                        type: 'message',
                        url: urlString,
                        timestamp: new Date().toISOString(),
                        data: parsedData,
                        raw: event.data
                    });
                });

                es.addEventListener('error', (event) => {
                    // @ts-ignore
                    window.__sseEvents.push({
                        type: 'error',
                        url: urlString,
                        timestamp: new Date().toISOString(),
                        data: { error: 'SSE Error' }
                    });
                });

                return es;
            };

            // Copiar propiedades estáticas
            Object.setPrototypeOf(window.EventSource, OriginalEventSource);
            // @ts-ignore
            window.EventSource.CONNECTING = OriginalEventSource.CONNECTING;
            // @ts-ignore
            window.EventSource.OPEN = OriginalEventSource.OPEN;
            // @ts-ignore
            window.EventSource.CLOSED = OriginalEventSource.CLOSED;
        }, urlPattern);

        this.isSetup = true;
    }

    /**
     * Obtiene todos los eventos SSE capturados desde el navegador.
     */
    async getEvents(): Promise<SSEEvent[]> {
        try {
            if (this.page.isClosed()) {
                return [];
            }
            return await this.page.evaluate(() => {
                // @ts-ignore
                return window.__sseEvents || [];
            });
        } catch {
            return [];
        }
    }

    /**
     * Obtiene eventos filtrados por compañía.
     */
    async getEventsByCompany(company: string): Promise<SSEEvent[]> {
        const events = await this.getEvents();
        return events.filter(event =>
            event.data?.company?.toLowerCase() === company.toLowerCase()
        );
    }

    /**
     * Limpia los eventos capturados.
     */
    async clear(): Promise<void> {
        await this.page.evaluate(() => {
            // @ts-ignore
            window.__sseEvents = [];
        });
    }

    /**
     * Adjunta los eventos SSE capturados al reporte del test.
     * Este método DEBE llamarse siempre, incluso si el test falla.
     */
    async attachToReport(testInfo: TestInfo, label?: string): Promise<void> {
        const attachmentName = label ? `sse-events-${label}` : 'sse-events';
        const events = await this.getEvents();

        if (events.length === 0) {
            await testInfo.attach(attachmentName, {
                body: JSON.stringify({ 
                    message: 'No SSE events captured', 
                    count: 0,
                    pattern: this.urlPattern,
                    note: 'Events are captured client-side via EventSource interception'
                }, null, 2),
                contentType: 'application/json'
            });
            return;
        }

        const formattedEvents = events.map((event, index) => ({
            index: index + 1,
            type: event.type,
            timestamp: event.timestamp,
            url: event.url,
            company: event.data?.company || 'N/A',
            data: event.data
        }));

        const summary = this.getSummaryByCompanyFromEvents(events);

        await testInfo.attach(attachmentName, {
            body: JSON.stringify({
                summary,
                totalEvents: events.length,
                pattern: this.urlPattern,
                events: formattedEvents
            }, null, 2),
            contentType: 'application/json'
        });
    }

    private getSummaryByCompanyFromEvents(events: SSEEvent[]): Record<string, number> {
        const summary: Record<string, number> = {};
        for (const event of events) {
            const company = event.data?.company || 'unknown';
            summary[company] = (summary[company] || 0) + 1;
        }
        return summary;
    }
}
