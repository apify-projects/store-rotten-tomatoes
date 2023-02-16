import { createPlaywrightRouter, Dataset } from 'crawlee';
import { LABELS, WEBSITE_URL } from './constants.js';
import { resultsCounter } from './main.js';
import { abortRun, getItemBaseLink } from './utils.js';

export const router = createPlaywrightRouter();

// scraping pages other than movie/tv show details and browse pages
router.addDefaultHandler(async ({ request, crawler, page, log }) => {
    log.info('Getting all available links for movies/TV shows', { url: request.loadedUrl });

    // getting all available links for movies or tv shows
    const relativeLinks = await page.$$('a[href^="/m/"], a[href^="/tv/"]');
    for (const link of relativeLinks) {
        const href = (await link.getAttribute('href')) ?? '';
        const resolvedUrl = `${WEBSITE_URL}${href}`;
        await crawler.addRequests([
            {
                url: getItemBaseLink(resolvedUrl),
                label: href.startsWith('/m/') ? LABELS.MOVIE : LABELS.TV,
            },
        ]);
    }

    const fullLinks = await page.$$(
        'a[href^="https://www.rottentomatoes.com/m/"], a[href^="https://www.rottentomatoes.com/tv/"]',
    );
    for (const link of fullLinks) {
        const href = (await link.getAttribute('href')) ?? '';
        await crawler.addRequests([
            {
                url: getItemBaseLink(href),
                label: href.includes('/m/') ? LABELS.MOVIE : LABELS.TV,
            },
        ]);
    }
});

// filtered browse pages (/browse/...)
router.addHandler(LABELS.BROWSE, async ({ page, crawler, log, request }) => {
    log.info('Getting browsed movies/TV shows', { url: request.loadedUrl });

    // cookies

    if (await page.locator('#onetrust-banner-sdk').isVisible()) {
        await page.click('button[id="onetrust-reject-all-handler"]');
    }

    let linksAmountPreviousLoop = 0;
    while (true) {
        const links = await page.$$('[data-qa="discovery-media-list-item"]');

        // record the amount of planned links from this page crawl,
        // so other /browse/ crawls can adjust when to stop/continue
        const newLinksAmount = links.length - linksAmountPreviousLoop;
        resultsCounter.addPlannedItems(newLinksAmount);
        if (!resultsCounter.plannedIsUnderLimit()) {
            break;
        }

        // check it there is a button for more items and then click it
        if (await page.isHidden('.discovery__actions')) {
            break;
        }

        await page.click('.discovery__actions button');

        linksAmountPreviousLoop = links.length;
    }

    const links = await page.$$('[data-qa="discovery-media-list-item"]');
    for (const link of links) {
        const href = (await link.getAttribute('href')) ?? '';
        if (href.length != 0) {
            await crawler.addRequests([
                {
                    url: `${WEBSITE_URL}${href}`,
                    label: href.startsWith('/m/') ? LABELS.MOVIE : LABELS.TV,
                },
            ]);
        }
    }
});

// scraping movie detail page (/m/...)
router.addHandler(LABELS.MOVIE, async ({ request, parseWithCheerio, log, crawler }) => {
    const $ = await parseWithCheerio();

    const movieTitle = $('[data-qa="score-panel-movie-title"]').text().trim();
    log.info(`Scraping movie: ${movieTitle}`, { url: request.loadedUrl });

    const synopsis = $('#movieSynopsis').text().trim();

    // we are getting the first 3 actors (as most movie sites list just 3)
    const actorElements = $('.cast-item .media-body a');
    const actorNames: string[] = [];
    for (const actorElement of actorElements) {
        const actorName = $(actorElement).text().trim();
        actorNames.push(actorName);

        if (actorNames.length >= 3) {
            break;
        }
    }

    const movie: Record<string, string> = {
        title: movieTitle,
        synopsis: synopsis,
        cast: actorNames.join(', '),
    };

    const movieDetails = $('.content-meta > li');
    for (const detailItem of movieDetails) {
        const label = $(detailItem).find('.meta-label').text().trim().slice(0, -1).toLowerCase();

        let valuesString = $(detailItem).find('.meta-value').text().trim();

        if (valuesString.includes(',') || valuesString.includes('\n')) {
            valuesString = valuesString
                .split('\n')
                .map((x) => x.replace(',', '').trim())
                .filter((x) => x != '')
                .join(', ');
        }

        movie[label] = valuesString;
    }

    const scorePanelElement = $('[data-qa="score-panel"]');
    movie['tomatometer'] = $(scorePanelElement).attr('tomatometerscore') ?? '';
    movie['audience score'] = $(scorePanelElement).attr('audiencescore') ?? '';
    movie['url'] = request.loadedUrl ?? '';

    if (resultsCounter.reachedMax()) {
        await abortRun(crawler, log);
    } else {
        resultsCounter.increment();
        await Dataset.pushData(movie);
    }
});

// scraping tv show detail page (/tv/...)
router.addHandler(LABELS.TV, async ({ request, parseWithCheerio, log, crawler }) => {
    const $ = await parseWithCheerio();

    const getElementByDataQa = (selector: string) => {
        return $(`[data-qa="${selector}"]`);
    };

    const getTextByDataQa = (selector: string) => {
        return getElementByDataQa(selector).text().trim();
    };

    const showTitle = getTextByDataQa('score-panel-series-title');
    log.info(`Scraping TV show: ${showTitle}`, { url: request.loadedUrl });

    const network = getTextByDataQa('series-details-network');
    const premiereDate = getTextByDataQa('series-details-premiere-date');
    const genre = getTextByDataQa('series-details-genre');
    const showSynopsis = $('#movieSynopsis').text().trim();
    const numberOfSeasons = $('season-list-item').length;

    const scrapeNames = (elements: any, limit: number) => {
        const names = [];
        for (const element of elements) {
            const name = $(element).text().trim();
            names.push(name);

            if (names.length >= limit) {
                break;
            }
        }
        return names;
    };

    // we are limiting number of actors/creators/producers to 3 (as most similiar sites list at most 3)
    const nameAmountLimit = 3;

    const actorElements = getElementByDataQa('cast-item-name');
    const actorNames = scrapeNames(actorElements, nameAmountLimit);

    const creatorsElements = getElementByDataQa('creator');
    const creatorNames = scrapeNames(creatorsElements, nameAmountLimit);

    const producersElements = getElementByDataQa('series-details-producer');
    const producerNames = scrapeNames(producersElements, nameAmountLimit);

    const show: Record<string, string> = {
        title: showTitle,
        synopsis: showSynopsis,
        cast: actorNames.join(', '),
        creators: creatorNames.join(', '),
        producers: producerNames.join(', '),
        network,
        premiere: premiereDate,
        genre,
        seasons: numberOfSeasons.toString(),
        url: request.loadedUrl ?? '',
    };

    show['tomatometer'] = getTextByDataQa('tomatometer');
    show['audience score'] = getTextByDataQa('audience-score');

    if (resultsCounter.reachedMax()) {
        await abortRun(crawler, log);
    } else {
        resultsCounter.increment();
        await Dataset.pushData(show);
    }
});
