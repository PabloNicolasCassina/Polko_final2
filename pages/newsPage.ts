import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object para la sección pública de Noticias/Blog
 * 
 * Selectores identificados mediante reconocimiento DOM:
 * - Sin data-testid disponibles
 * - Clases: .cardNoticia--Card, .destacada, .secundaria
 * - Formato fecha: DD/MM/YYYY
 */
export default class NewsPage {
    readonly page: Page;

    // Header Navigation
    readonly noticiasLink: Locator;
    readonly burgerMenu: Locator;

    // News List (Listado)
    readonly newsCards: Locator;
    readonly heroCard: Locator;
    readonly secondaryCards: Locator;

    // News Detail
    readonly detailTitle: Locator;
    readonly detailDate: Locator;

    // Suggestions
    readonly suggestionsContainer: Locator;
    readonly suggestionCards: Locator;

    // Carousel (Carrusel de imágenes)
    readonly carouselContainer: Locator;
    readonly carouselImages: Locator;
    readonly carouselControls: Locator;
    readonly carouselNextButton: Locator;
    readonly carouselPreviousButton: Locator;
    readonly carouselIndicators: Locator;

    constructor(page: Page) {
        this.page = page;

        // Header
        // Selector flexible: busca el link por href para funcionar tanto en desktop como en mobile drawer
        // En desktop: está en .landing__header__nav
        // En mobile: está en el drawer/dialog después de abrir el menú
        // Priorizamos el link del header/drawer (no footer) usando :visible o first()
        this.noticiasLink = page.locator('a[href="/noticias"]').filter({ hasText: 'Noticias' });
        this.burgerMenu = page.locator('.landing__header__menu');

        // Listado
        this.newsCards = page.locator('.cardNoticia--Card');
        this.heroCard = page.locator('.cardNoticia--Card.destacada');
        this.secondaryCards = page.locator('.cardNoticia--Card.secundaria');

        // Detalle
        this.detailTitle = page.locator('.detalle-noticia__title');
        this.detailDate = page.locator('.detalle-noticia__date');

        // Sugerencias
        this.suggestionsContainer = page.locator('.suggestions-noticia__scroll');
        this.suggestionCards = this.suggestionsContainer.locator('.cardNoticia--Card');

        // Carrusel
        this.carouselContainer = page.locator('.detalle-noticia__carousel-container');
        this.carouselImages = this.carouselContainer.locator('.detalle-noticia__content-image');
        this.carouselControls = this.carouselContainer.locator('.mantine-Carousel-control');
        this.carouselNextButton = this.carouselControls.last(); // Último botón = siguiente
        this.carouselPreviousButton = this.carouselControls.first(); // Primer botón = anterior
        this.carouselIndicators = this.carouselContainer.locator('.mantine-Carousel-indicator');
    }

    /**
     * Navega a la sección de Noticias desde la Home
     */
    async navigateToNews(): Promise<void> {
        await this.page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

        await this.page.getByText('La herramienta digital de los brokers', { exact: false }).waitFor({ state: 'visible', timeout: 10000 });

        // Verificar si estamos en mobile: el burger menu está visible y el link no está visible directamente
        const isBurgerMenuVisible = await this.burgerMenu.isVisible().catch(() => false);
        const isLinkDirectlyVisible = await this.noticiasLink.first().isVisible({ timeout: 2000 }).catch(() => false);

        // Solo abrir el menú hamburguesa si estamos en mobile (burger visible y link no visible)
        if (isBurgerMenuVisible && !isLinkDirectlyVisible) {
            await this.burgerMenu.click({ force: true });
            
            // Esperar a que el drawer se abra (es un section con clases de Mantine Drawer)
            await this.page.locator('section.landing__drawer__container').waitFor({ state: 'visible', timeout: 5000 });
            
            // Buscar el link específicamente dentro del drawer (tiene clase landing__drawer__link)
            // O usar .filter({ has: page.locator('.landing__drawer__container') }) para asegurar que está en el drawer
            const drawerLink = this.page.locator('.landing__drawer__container a[href="/noticias"]').filter({ hasText: 'Noticias' });
            await drawerLink.waitFor({ state: 'visible', timeout: 5000 });
            await drawerLink.click();
        } else {
            // En desktop, usar el link del header (primer link visible)
            await this.noticiasLink.first().click();
        }

        await this.heroCard.or(this.newsCards.first()).waitFor({ state: 'visible' });
    }

    /**
     * Obtiene el título de una tarjeta de noticia
     */
    async getCardTitle(card: Locator): Promise<string> {
        return await card.locator('h1').innerText();
    }

    /**
     * Obtiene la fecha de una tarjeta de noticia (formato DD/MM/YYYY)
     */
    async getCardDate(card: Locator): Promise<string> {
        return await card.locator('p').first().innerText();
    }

    /**
     * Parsea una fecha en formato DD/MM/YYYY a objeto Date
     */
    parseDate(dateString: string): Date {
        const parts = dateString.trim().split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Meses 0-indexed
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        return new Date(0); // Fecha inválida
    }

    /**
     * Obtiene todas las fechas de las tarjetas visibles
     */
    async getAllCardDates(): Promise<{ card: Locator; date: Date; dateStr: string }[]> {
        const cards = await this.newsCards.all();
        const results: { card: Locator; date: Date; dateStr: string }[] = [];

        for (const card of cards) {
            const dateStr = await this.getCardDate(card);
            const date = this.parseDate(dateStr);
            results.push({ card, date, dateStr });
        }

        return results;
    }

    /**
     * Encuentra la fecha más reciente de todas las tarjetas
     */
    async getMostRecentDate(): Promise<Date> {
        const dates = await this.getAllCardDates();
        return dates.reduce((max, curr) => curr.date > max ? curr.date : max, new Date(0));
    }

    /**
     * Hace click en una tarjeta y guarda su título
     * @returns El título de la noticia clickeada
     */
    async clickNewsCardAndGetTitle(cardIndex: number = 0): Promise<string> {
        const card = this.newsCards.nth(cardIndex);
        const title = await this.getCardTitle(card);
        await card.click();
        await this.detailTitle.waitFor({ state: 'visible' });
        return title;
    }

    /**
     * Busca una noticia que tenga carrusel navegando hasta encontrarla
     * @returns El índice de la tarjeta que tiene carrusel, o -1 si no se encuentra
     */
    async findNewsWithCarousel(): Promise<number> {
        const cardsCount = await this.newsCards.count();
        for (let i = 0; i < cardsCount; i++) {
            await this.newsCards.nth(i).click();
            await this.detailTitle.waitFor({ state: 'visible' });
            
            if (await this.hasCarousel()) {
                return i;
            }
            
            // Volver a la lista si no tiene carrusel
            await this.page.goBack();
            await this.newsCards.first().waitFor({ state: 'visible' });
        }
        return -1;
    }

    /**
     * Navega directamente a una noticia por título (para encontrar noticias con carrusel)
     */
    async navigateToNewsByTitle(title: string): Promise<void> {
        await this.navigateToNews();
        const cardsCount = await this.newsCards.count();
        for (let i = 0; i < cardsCount; i++) {
            const cardTitle = await this.getCardTitle(this.newsCards.nth(i));
            if (cardTitle.toLowerCase().includes(title.toLowerCase())) {
                await this.newsCards.nth(i).click();
                await this.detailTitle.waitFor({ state: 'visible' });
                return;
            }
        }
        throw new Error(`No se encontró noticia con título que contenga "${title}"`);
    }

    /**
     * Hace click en la tarjeta hero
     * @returns El título del hero
     */
    async clickHeroCard(): Promise<string> {
        const title = await this.getCardTitle(this.heroCard);
        await this.heroCard.click();
        await this.detailTitle.waitFor({ state: 'visible' });
        return title;
    }

    /**
     * Obtiene todos los títulos de las sugerencias
     */
    async getSuggestionTitles(): Promise<string[]> {
        await this.suggestionsContainer.waitFor({ state: 'visible' });
        const cards = await this.suggestionCards.all();
        const titles: string[] = [];

        for (const card of cards) {
            const title = await this.getCardTitle(card);
            titles.push(title);
        }

        return titles;
    }

    /**
     * Verifica que el título de la noticia actual NO aparece en sugerencias
     */
    async verifySuggestionsDoNotInclude(currentTitle: string): Promise<boolean> {
        const suggestionTitles = await this.getSuggestionTitles();
        return !suggestionTitles.some(title =>
            title.toLowerCase().trim() === currentTitle.toLowerCase().trim()
        );
    }

    /**
     * Obtiene el título de la página de detalle
     */
    async getDetailTitle(): Promise<string> {
        return await this.detailTitle.innerText();
    }

    /**
     * Verifica que la tarjeta hero corresponde a la fecha más reciente
     */
    async verifyHeroIsNewest(): Promise<boolean> {
        const allDates = await this.getAllCardDates();
        const heroDateStr = await this.getCardDate(this.heroCard);
        const heroDate = this.parseDate(heroDateStr);
        const mostRecentDate = allDates.reduce((max, curr) => curr.date > max ? curr.date : max, new Date(0));

        // El hero debe tener la fecha más reciente (o igual)
        return heroDate.getTime() >= mostRecentDate.getTime();
    }

    /**
     * Scroll hacia las sugerencias (para mobile/responsive)
     */
    async scrollToSuggestions(): Promise<void> {
        await this.suggestionsContainer.scrollIntoViewIfNeeded();
    }

    /**
     * Verifica si la noticia actual tiene un carrusel de imágenes
     */
    async hasCarousel(): Promise<boolean> {
        try {
            await this.carouselContainer.waitFor({ state: 'visible', timeout: 3000 });
            const imagesCount = await this.carouselImages.count();
            return imagesCount > 1;
        } catch {
            return false;
        }
    }

    /**
     * Obtiene el número de imágenes en el carrusel
     */
    async getCarouselImagesCount(): Promise<number> {
        if (await this.hasCarousel()) {
            return await this.carouselImages.count();
        }
        return 0;
    }

    /**
     * Obtiene el slide actual del carrusel (0-indexed)
     */
    async getCurrentCarouselSlide(): Promise<number> {
        const container = this.carouselContainer.locator('.mantine-Carousel-container');
        const transform = await container.evaluate(el => {
            const style = el.style.transform || window.getComputedStyle(el).transform;
            // Extraer el valor translateX del transform
            const match = style.match(/translate3d\((-?\d+\.?\d*)px/);
            return match ? parseFloat(match[1]) : 0;
        });
        
        // Si no hay transform (0px) = slide 0
        if (transform === 0) return 0;
        
        // Calcular el slide basado en el transform
        const slideWidth = await container.locator('.mantine-Carousel-slide').first().evaluate(el => {
            const htmlEl = el as HTMLElement;
            return htmlEl.offsetWidth;
        });
        return Math.abs(Math.round(transform / slideWidth));
    }

    /**
     * Navega al siguiente slide del carrusel
     */
    async goToNextCarouselSlide(): Promise<void> {
        await this.carouselNextButton.waitFor({ state: 'visible' });
        const initialSlide = await this.getCurrentCarouselSlide();
        const initialImageSrc = await this.getCurrentCarouselImageSrc();
        
        await this.carouselNextButton.click();
        
        // Esperar a que el slide cambie realmente (mejor práctica de Playwright)
        await this.page.waitForFunction(
            ({ initialSlide, initialImageSrc }) => {
                const container = document.querySelector('.detalle-noticia__carousel-container .mantine-Carousel-container');
                if (!container) return false;
                
                const style = (container as HTMLElement).style.transform || window.getComputedStyle(container).transform;
                const match = style.match(/translate3d\((-?\d+\.?\d*)px/);
                const transform = match ? parseFloat(match[1]) : 0;
                
                const slides = container.querySelectorAll('.mantine-Carousel-slide');
                if (slides.length === 0) return false;
                
                const slideWidth = (slides[0] as HTMLElement).offsetWidth;
                const currentSlide = transform === 0 ? 0 : Math.abs(Math.round(transform / slideWidth));
                
                // Verificar que el slide cambió
                if (currentSlide !== initialSlide) return true;
                
                // Si el slide no cambió, verificar que la imagen cambió (por si hay loop)
                const images = document.querySelectorAll('.detalle-noticia__content-image');
                if (images.length > currentSlide) {
                    const currentImage = images[currentSlide] as HTMLImageElement;
                    return currentImage?.src !== initialImageSrc;
                }
                
                return false;
            },
            { initialSlide, initialImageSrc },
            { timeout: 5000 }
        );
    }

    /**
     * Navega al slide anterior del carrusel
     */
    async goToPreviousCarouselSlide(): Promise<void> {
        await this.carouselPreviousButton.waitFor({ state: 'visible' });
        const initialSlide = await this.getCurrentCarouselSlide();
        const initialImageSrc = await this.getCurrentCarouselImageSrc();
        
        await this.carouselPreviousButton.click();
        
        // Esperar a que la animación termine (puede que el slide no cambie si está en el primero y no hay loop)
        await this.page.waitForFunction(
            ({ initialSlide, initialImageSrc }) => {
                const container = document.querySelector('.detalle-noticia__carousel-container .mantine-Carousel-container');
                if (!container) return false;
                
                const style = (container as HTMLElement).style.transform || window.getComputedStyle(container).transform;
                const match = style.match(/translate3d\((-?\d+\.?\d*)px/);
                const transform = match ? parseFloat(match[1]) : 0;
                
                const slides = container.querySelectorAll('.mantine-Carousel-slide');
                if (slides.length === 0) return false;
                
                const slideWidth = (slides[0] as HTMLElement).offsetWidth;
                const currentSlide = transform === 0 ? 0 : Math.abs(Math.round(transform / slideWidth));
                
                // Verificar que el slide cambió
                if (currentSlide !== initialSlide) return true;
                
                // Si el slide no cambió, verificar que la imagen cambió (por si hay loop)
                const images = document.querySelectorAll('.detalle-noticia__content-image');
                if (images.length > currentSlide) {
                    const currentImage = images[currentSlide] as HTMLImageElement;
                    return currentImage?.src !== initialImageSrc;
                }
                
                // Si el slide no cambió y la imagen tampoco, esperar a que la animación termine
                // (el carrusel puede estar en el primer slide y no puede retroceder más)
                // Verificar que el transform se ha estabilizado (no está en medio de una animación)
                const computedStyle = window.getComputedStyle(container);
                const transition = computedStyle.transition || computedStyle.webkitTransition;
                // Si no hay transición activa, la animación terminó
                if (!transition || transition === 'none' || transition === '') {
                    return true; // Animación terminó, incluso si el slide no cambió
                }
                
                return false;
            },
            { initialSlide, initialImageSrc },
            { timeout: 5000 }
        );
        
        // Esperar un poco más para asegurar que la animación terminó completamente
        await this.page.waitForTimeout(300);
    }

    /**
     * Navega a un slide específico usando el indicador (0-indexed)
     */
    async goToCarouselSlideByIndicator(slideIndex: number): Promise<void> {
        const indicator = this.carouselIndicators.nth(slideIndex);
        await indicator.waitFor({ state: 'visible' });
        const initialSlide = await this.getCurrentCarouselSlide();
        await indicator.click();
        
        // Esperar a que tanto el indicador activo como el slide cambien al esperado
        await this.page.waitForFunction(
            ({ expectedIndex, initialSlide }) => {
                const container = document.querySelector('.detalle-noticia__carousel-container .mantine-Carousel-container');
                if (!container) return false;
                
                // Verificar el slide actual
                const style = (container as HTMLElement).style.transform || window.getComputedStyle(container).transform;
                const match = style.match(/translate3d\((-?\d+\.?\d*)px/);
                const transform = match ? parseFloat(match[1]) : 0;
                
                const slides = container.querySelectorAll('.mantine-Carousel-slide');
                if (slides.length === 0) return false;
                
                const slideWidth = (slides[0] as HTMLElement).offsetWidth;
                const currentSlide = transform === 0 ? 0 : Math.abs(Math.round(transform / slideWidth));
                
                // Verificar el indicador activo
                const indicators = document.querySelectorAll('.detalle-noticia__carousel-container .mantine-Carousel-indicator');
                let maxOpacity = 0;
                let activeIndex = 0;
                
                for (let i = 0; i < indicators.length; i++) {
                    const opacity = parseFloat(window.getComputedStyle(indicators[i] as HTMLElement).opacity);
                    if (opacity > maxOpacity) {
                        maxOpacity = opacity;
                        activeIndex = i;
                    }
                }
                
                // Verificar que tanto el slide como el indicador coinciden con el esperado
                // Y que el slide cambió desde el inicial
                return currentSlide === expectedIndex && 
                       activeIndex === expectedIndex && 
                       (currentSlide !== initialSlide || initialSlide === expectedIndex);
            },
            { expectedIndex: slideIndex, initialSlide },
            { timeout: 5000 }
        );
        
        // Esperar un poco más para asegurar que la animación terminó completamente
        await this.page.waitForTimeout(300);
    }

    /**
     * Obtiene el índice del indicador activo (0-indexed)
     * El indicador activo tiene mayor opacidad (cerca de 1.0)
     */
    async getActiveCarouselIndicator(): Promise<number> {
        const indicators = await this.carouselIndicators.all();
        let maxOpacity = 0;
        let activeIndex = 0;
        
        for (let i = 0; i < indicators.length; i++) {
            const opacity = await indicators[i].evaluate(el => {
                return parseFloat(window.getComputedStyle(el).opacity);
            });
            
            if (opacity > maxOpacity) {
                maxOpacity = opacity;
                activeIndex = i;
            }
        }
        
        return activeIndex;
    }

    /**
     * Obtiene el src de la imagen actualmente visible en el carrusel
     */
    async getCurrentCarouselImageSrc(): Promise<string | null> {
        const currentSlide = await this.getCurrentCarouselSlide();
        const image = this.carouselImages.nth(currentSlide);
        return await image.getAttribute('src');
    }

    /**
     * Verifica que el carrusel tiene todos los controles visibles
     */
    async verifyCarouselControlsVisible(): Promise<boolean> {
        const nextVisible = await this.carouselNextButton.isVisible();
        const prevVisible = await this.carouselPreviousButton.isVisible();
        const indicatorsVisible = await this.carouselIndicators.first().isVisible();
        return nextVisible && prevVisible && indicatorsVisible;
    }
}
