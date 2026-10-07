/**
 * E2E Tests para Sección Noticias/Blog
 *
 * EJECUTAR:
 * - Desktop: npx playwright test tests/news/news.spec.ts --project=chromium
 * - Mobile: npx playwright test tests/news/news.spec.ts --project="Mobile Chrome"
 *
 * NOTAS:
 * - Sin autenticación (módulo público)
 * - No depende de auth.setup.pre.ts
 * - Viewports: Desktop 1920x1080, Mobile 375x667 (iPhone SE)
 */
import { test, expect } from "@playwright/test";
import NewsPage from "../../pages/newsPage";

// ========== DESKTOP TESTS (1920x1080) ==========
test.describe('Noticias - Desktop @desktop', () => {
    test.use({
        viewport: { width: 1920, height: 1080 },
    });

    let newsPage: NewsPage;

    test.beforeEach(async ({ page }) => {
        newsPage = new NewsPage(page);
    });

    test('Navegación Home → Noticias → Detalle', async ({ page }) => {
        test.setTimeout(60000);

        await test.step('Navegar a Noticias desde Home', async () => {
            await newsPage.navigateToNews();
            await expect(newsPage.newsCards.first()).toBeVisible();
        });

        await test.step('Verificar listado de noticias', async () => {
            const cardsCount = await newsPage.newsCards.count();
            expect(cardsCount).toBeGreaterThan(0);
        });

        await test.step('Click en noticia y verificar detalle', async () => {
            const clickedTitle = await newsPage.clickNewsCardAndGetTitle(0);
            const detailTitle = await newsPage.getDetailTitle();

            // El título del detalle debe contener el título clickeado
            expect(detailTitle.toLowerCase()).toContain(clickedTitle.toLowerCase().substring(0, 10));
        });
    });

    test('Validar Hero es la noticia más reciente', async ({ page }) => {
        test.setTimeout(60000);

        await test.step('Navegar a Noticias', async () => {
            await newsPage.navigateToNews();
        });

        await test.step('Verificar existencia del hero', async () => {
            const heroVisible = await newsPage.heroCard.isVisible();
            expect(heroVisible).toBeTruthy();
        });

        await test.step('Verificar que hero tiene fecha más reciente', async () => {
            const isNewest = await newsPage.verifyHeroIsNewest();
            expect(isNewest).toBeTruthy();
        });
    });

    test('Validar sugerencias no incluyen noticia actual', async ({ page }) => {
        test.setTimeout(60000);

        let clickedTitle: string;

        await test.step('Navegar a Noticias', async () => {
            await newsPage.navigateToNews();
        });

        await test.step('Guardar título y entrar al detalle', async () => {
            clickedTitle = await newsPage.clickNewsCardAndGetTitle(0);
            console.log(`[TEST] Título clickeado: "${clickedTitle}"`);
        });

        await test.step('Scroll a sugerencias', async () => {
            await newsPage.scrollToSuggestions();
        });

        await test.step('Verificar exclusión de noticia actual en sugerencias', async () => {
            const isExcluded = await newsPage.verifySuggestionsDoNotInclude(clickedTitle);
            const suggestionTitles = await newsPage.getSuggestionTitles();
            console.log(`[TEST] Sugerencias: ${JSON.stringify(suggestionTitles)}`);

            expect(isExcluded).toBeTruthy();
        });
    });

    test('Validar carrusel de imágenes en desktop', async ({ page }) => {
        test.setTimeout(60000);

        await test.step('Navegar a noticia con carrusel', async () => {
            await newsPage.navigateToNews();
            // Buscar noticia "titulazo" que tiene carrusel
            await newsPage.navigateToNewsByTitle('titulazo');
        });

        await test.step('Verificar que la noticia tiene carrusel', async () => {
            const hasCarousel = await newsPage.hasCarousel();
            expect(hasCarousel).toBeTruthy();
            
            const imagesCount = await newsPage.getCarouselImagesCount();
            expect(imagesCount).toBeGreaterThan(1);
            console.log(`[DESKTOP] Carrusel tiene ${imagesCount} imágenes`);
        });

        await test.step('Verificar controles del carrusel visibles', async () => {
            const controlsVisible = await newsPage.verifyCarouselControlsVisible();
            expect(controlsVisible).toBeTruthy();
        });

        await test.step('Navegar al siguiente slide', async () => {
            const initialSlide = await newsPage.getCurrentCarouselSlide();
            const initialImageSrc = await newsPage.getCurrentCarouselImageSrc();
            
            await newsPage.goToNextCarouselSlide();
            const newSlide = await newsPage.getCurrentCarouselSlide();
            const newImageSrc = await newsPage.getCurrentCarouselImageSrc();
            
            expect(newSlide).not.toBe(initialSlide);
            expect(newImageSrc).not.toBe(initialImageSrc);
            console.log(`[DESKTOP] Navegó del slide ${initialSlide} al slide ${newSlide}`);
        });

        await test.step('Navegar al slide anterior', async () => {
            const currentSlide = await newsPage.getCurrentCarouselSlide();
            const imagesCount = await newsPage.getCarouselImagesCount();
            
            await newsPage.goToPreviousCarouselSlide();
            const previousSlide = await newsPage.getCurrentCarouselSlide();
            
            // Si estamos en el primer slide (0) y no hay loop, el carrusel no puede retroceder más
            // En ese caso, el slide debería quedarse en 0 o hacer loop al último slide
            if (currentSlide === 0) {
                // Si no puede retroceder, se queda en 0; si tiene loop, va al último slide
                expect(previousSlide === 0 || previousSlide === imagesCount - 1).toBeTruthy();
            } else {
                // Si no estamos en el primer slide, debería retroceder
                expect(previousSlide).toBeLessThan(currentSlide);
            }
            console.log(`[DESKTOP] Navegó del slide ${currentSlide} al slide ${previousSlide}`);
        });

        await test.step('Navegar usando indicadores', async () => {
            const imagesCount = await newsPage.getCarouselImagesCount();
            
            // Navegar al segundo slide usando indicador
            if (imagesCount > 1) {
                await newsPage.goToCarouselSlideByIndicator(1);
                const activeIndicator = await newsPage.getActiveCarouselIndicator();
                expect(activeIndicator).toBe(1);
                console.log(`[DESKTOP] Navegó al indicador ${activeIndicator}`);
            }
        });
    });
});

// ========== MOBILE TESTS (iPhone SE - 375x667) ==========
test.describe('Noticias - Mobile @mobile', () => {
    test.use({
        viewport: { width: 375, height: 667 },
    });

    let newsPage: NewsPage;

    test.beforeEach(async ({ page }) => {
        newsPage = new NewsPage(page);
    });

    test('Navegación responsive Home → Noticias → Detalle', async ({ page }) => {
        test.setTimeout(60000);

        await test.step('Navegar a Noticias desde Home (mobile - menú hamburguesa)', async () => {
            await newsPage.navigateToNews();
            // Verificar que las tarjetas son visibles después de la navegación
            await expect(newsPage.newsCards.first()).toBeVisible({ timeout: 10000 });
        });

        await test.step('Verificar listado visible en mobile', async () => {
            const cardsCount = await newsPage.newsCards.count();
            expect(cardsCount).toBeGreaterThan(0);
            console.log(`[MOBILE] Total de tarjetas de noticias: ${cardsCount}`);
        });

        await test.step('Click en tarjeta secundaria y verificar detalle', async () => {
            // Usar índice 1 para evitar el hero (índice 0) y probar una tarjeta secundaria
            const clickedTitle = await newsPage.clickNewsCardAndGetTitle(1);
            console.log(`[MOBILE] Título clickeado: "${clickedTitle}"`);
            
            // Esperar a que el detalle cargue completamente
            await expect(newsPage.detailTitle).toBeVisible({ timeout: 10000 });
            const detailTitle = await newsPage.getDetailTitle();
            console.log(`[MOBILE] Título en detalle: "${detailTitle}"`);

            // El título del detalle debe contener el título clickeado (comparación flexible)
            expect(detailTitle.toLowerCase()).toContain(clickedTitle.toLowerCase().substring(0, 10));
        });
    });

    test('Validar Hero en mobile', async ({ page }) => {
        test.setTimeout(60000);

        await test.step('Navegar a Noticias', async () => {
            await newsPage.navigateToNews();
            await expect(newsPage.newsCards.first()).toBeVisible({ timeout: 10000 });
        });

        await test.step('Verificar hero visible en mobile', async () => {
            const heroVisible = await newsPage.heroCard.isVisible();
            expect(heroVisible).toBeTruthy();
            
            // Verificar que el hero tiene la clase destacada
            const heroClasses = await newsPage.heroCard.getAttribute('class');
            expect(heroClasses).toContain('destacada');
        });

        await test.step('Verificar que hero tiene fecha más reciente', async () => {
            const isNewest = await newsPage.verifyHeroIsNewest();
            expect(isNewest).toBeTruthy();
        });
    });

    test('Validar sugerencias en mobile', async ({ page }) => {
        test.setTimeout(60000);

        let clickedTitle: string;

        await test.step('Navegar y entrar a detalle de tarjeta secundaria', async () => {
            await newsPage.navigateToNews();
            // Usar índice 1 (tarjeta secundaria) para mejor validación de exclusión
            clickedTitle = await newsPage.clickNewsCardAndGetTitle(1);
            console.log(`[MOBILE] Título clickeado para validar sugerencias: "${clickedTitle}"`);
        });

        await test.step('Scroll a sugerencias (mobile)', async () => {
            // Scroll hacia las sugerencias para asegurar visibilidad en mobile
            await newsPage.scrollToSuggestions();
            // Esperar a que el contenedor de sugerencias sea visible
            await expect(newsPage.suggestionsContainer).toBeVisible({ timeout: 10000 });
        });

        await test.step('Verificar exclusión de noticia actual en sugerencias', async () => {
            // Verificar que hay sugerencias disponibles
            const suggestionCount = await newsPage.suggestionCards.count();
            expect(suggestionCount).toBeGreaterThan(0);
            console.log(`[MOBILE] Total de sugerencias: ${suggestionCount}`);
            
            // Verificar que la noticia actual no está en las sugerencias
            const isExcluded = await newsPage.verifySuggestionsDoNotInclude(clickedTitle);
            const suggestionTitles = await newsPage.getSuggestionTitles();
            console.log(`[MOBILE] Títulos de sugerencias: ${JSON.stringify(suggestionTitles)}`);

            expect(isExcluded).toBeTruthy();
        });
    });

    test('Validar carrusel de imágenes en mobile', async ({ page }) => {
        test.setTimeout(60000);

        await test.step('Navegar a noticia con carrusel', async () => {
            await newsPage.navigateToNews();
            // Buscar noticia "titulazo" que tiene carrusel
            await newsPage.navigateToNewsByTitle('titulazo');
        });

        await test.step('Verificar que la noticia tiene carrusel', async () => {
            const hasCarousel = await newsPage.hasCarousel();
            expect(hasCarousel).toBeTruthy();
            
            const imagesCount = await newsPage.getCarouselImagesCount();
            expect(imagesCount).toBeGreaterThan(1);
            console.log(`[MOBILE] Carrusel tiene ${imagesCount} imágenes`);
        });

        await test.step('Verificar controles del carrusel visibles en mobile', async () => {
            const controlsVisible = await newsPage.verifyCarouselControlsVisible();
            expect(controlsVisible).toBeTruthy();
        });

        await test.step('Navegar al siguiente slide (mobile)', async () => {
            const initialSlide = await newsPage.getCurrentCarouselSlide();
            const initialImageSrc = await newsPage.getCurrentCarouselImageSrc();
            
            await newsPage.goToNextCarouselSlide();
            const newSlide = await newsPage.getCurrentCarouselSlide();
            const newImageSrc = await newsPage.getCurrentCarouselImageSrc();
            
            expect(newSlide).not.toBe(initialSlide);
            expect(newImageSrc).not.toBe(initialImageSrc);
            console.log(`[MOBILE] Navegó del slide ${initialSlide} al slide ${newSlide}`);
        });

        await test.step('Navegar al slide anterior (mobile)', async () => {
            const currentSlide = await newsPage.getCurrentCarouselSlide();
            const imagesCount = await newsPage.getCarouselImagesCount();
            
            await newsPage.goToPreviousCarouselSlide();
            const previousSlide = await newsPage.getCurrentCarouselSlide();
            
            // Si estamos en el primer slide (0) y no hay loop, el carrusel no puede retroceder más
            // En ese caso, el slide debería quedarse en 0 o hacer loop al último slide
            if (currentSlide === 0) {
                // Si no puede retroceder, se queda en 0; si tiene loop, va al último slide
                expect(previousSlide === 0 || previousSlide === imagesCount - 1).toBeTruthy();
            } else {
                // Si no estamos en el primer slide, debería retroceder
                expect(previousSlide).toBeLessThan(currentSlide);
            }
            console.log(`[MOBILE] Navegó del slide ${currentSlide} al slide ${previousSlide}`);
        });

        await test.step('Navegar usando indicadores (mobile)', async () => {
            const imagesCount = await newsPage.getCarouselImagesCount();
            
            // Navegar al segundo slide usando indicador
            if (imagesCount > 1) {
                await newsPage.goToCarouselSlideByIndicator(1);
                const activeIndicator = await newsPage.getActiveCarouselIndicator();
                const currentSlide = await newsPage.getCurrentCarouselSlide();
                
                expect(activeIndicator).toBe(1);
                expect(currentSlide).toBe(1);
                console.log(`[MOBILE] Navegó al indicador ${activeIndicator}, slide actual: ${currentSlide}`);
            }
        });

        await test.step('Verificar navegación completa del carrusel (mobile)', async () => {
            const imagesCount = await newsPage.getCarouselImagesCount();
            
            // Navegar a todos los slides
            for (let i = 0; i < imagesCount; i++) {
                await newsPage.goToCarouselSlideByIndicator(i);
                const currentSlide = await newsPage.getCurrentCarouselSlide();
                const activeIndicator = await newsPage.getActiveCarouselIndicator();
                
                expect(currentSlide).toBe(i);
                expect(activeIndicator).toBe(i);
            }
            console.log(`[MOBILE] Navegación completa verificada para ${imagesCount} slides`);
        });
    });
});
