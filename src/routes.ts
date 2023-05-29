import axios from 'axios';
import { createPlaywrightRouter, Dataset, RequestOptions } from 'crawlee';
import { LABELS, WEBSITE_URL } from './constants.js';
import { BrowseApiResponse } from './interfaces.js';
import { resultsCounter } from './main.js';
import { parseMovieDetailValues } from './parsers.js';
import { abortRun, createRequestFromUrl, getElementByDataQa, getTextByDataQa, scrapeNames } from './utils.js';

export const router = createPlaywrightRouter();

// scraping pages other than movie/tv show details and browse pages
router.addHandler(LABELS.OTHER, async ({ request, crawler, log, parseWithCheerio }) => {
    const $ = await parseWithCheerio();

    const requests: RequestOptions[] = [];

    // getting all available links for movies or tv shows
    const relativeLinks = $('a[href^="/m/"], a[href^="/tv/"]');
    for (const link of relativeLinks) {
        const href = $(link).attr('href');
        if (href) {
            const resolvedUrl = `${WEBSITE_URL}${href}`;
            requests.push(createRequestFromUrl(resolvedUrl));
        }
    }

    const fullLinks = $('a[href^="https://www.rottentomatoes.com/m/"], a[href^="https://www.rottentomatoes.com/tv/"]');
    for (const link of fullLinks) {
        const href = $(link).attr('href');
        if (href) {
            requests.push(createRequestFromUrl(href));
        }
    }

    log.info(`Enqueued ${requests.length} links for movies/TV shows`, { url: request.loadedUrl });
    await crawler.addRequests(requests);
});

// filtered browse pages (/browse/...)
router.addHandler(LABELS.BROWSE, async ({ crawler, log, request }) => {
    const browseUrl = new URL(request.loadedUrl!);
    const apiBaseUrl = `${browseUrl.origin}/napi/${browseUrl.pathname}`;

    const requests: RequestOptions[] = [];

    let apiUrlToCall = apiBaseUrl;
    for (;;) {
        const response = await axios.get<BrowseApiResponse>(apiUrlToCall);

        // there is always just one item in the grids array
        const returnedItems = response.data.grid.list;

        const requestsFromItems = returnedItems.map((item) => {
            const absoluteUrl = `${WEBSITE_URL}${item.mediaUrl}`;
            return createRequestFromUrl(absoluteUrl);
        });

        requests.push(...requestsFromItems);

        // record the amount of planned links from this page crawl,
        // so other '/browse/' crawls can adjust when to stop/continue
        resultsCounter.addPlannedItems(requestsFromItems.length);
        if (!resultsCounter.plannedIsUnderLimit()) {
            break;
        }

        if (!response.data.pageInfo.hasNextPage) {
            break;
        }

        apiUrlToCall = `${apiBaseUrl}?after=${response.data.pageInfo.endCursor}`;
    }

    await crawler.addRequests(requests);
    log.info(`Enqueued links to ${requests.length} browsed movies/TV shows`, { url: request.loadedUrl });
});

// scraping movie detail page (/m/...)
router.addHandler(LABELS.MOVIE, async ({ request, parseWithCheerio, log, crawler }) => {
    const $ = await parseWithCheerio();

    const movieTitle = getTextByDataQa('score-panel-title', $);
    const synopsis = getTextByDataQa('movie-info-synopsis', $);

    // we are getting the first 3 actors (as most movie sites list just 3)
    const actorElements = getElementByDataQa('cast-crew-item-link', $);
    const actorNames: string[] = [];
    for (const actorElement of actorElements) {
        const actorName = $(actorElement).text().trim();
        actorNames.push(actorName);

        if (actorNames.length >= 3) {
            break;
        }
    }

    const movie: Record<string, string | null> = {
        title: movieTitle,
        synopsis: synopsis,
        cast: actorNames.join(', '),
    };

    const movieDetails = getElementByDataQa('movie-info-item', $);
    for (const detailItem of movieDetails) {
        const label = $(detailItem).find('[data-qa="movie-info-item-label"]').text().trim().slice(0, -1).toLowerCase();

        const values = $(detailItem).find('[data-qa="movie-info-item-value"]').text().trim();
        movie[label] = parseMovieDetailValues(values);
    }

    const scorePanelElement = getElementByDataQa('score-panel', $);
    movie['tomatometer'] = $(scorePanelElement).attr('tomatometerscore') ?? null;
    movie['audience score'] = $(scorePanelElement).attr('audiencescore') ?? null;
    movie['url'] = request.loadedUrl ?? null;

    if (resultsCounter.reachedMax()) {
        await abortRun(crawler, log);
    } else {
        resultsCounter.increment();
        await Dataset.pushData(movie);
        log.info(`Scraped movie: ${movieTitle}`, { url: request.loadedUrl });
    }
});

// scraping tv show detail page (/tv/...)
router.addHandler(LABELS.TV, async ({ request, parseWithCheerio, log, crawler }) => {
    const $ = await parseWithCheerio();

    const showTitle = getTextByDataQa('score-panel-series-title', $);
    const network = getTextByDataQa('series-details-network', $);
    const premiereDate = getTextByDataQa('series-details-premiere-date', $);
    const genre = getTextByDataQa('series-details-genre', $);
    const showSynopsis = $('#movieSynopsis').text().trim();
    const numberOfSeasons = $('season-list-item').length;

    // we are limiting number of actors/creators/producers to 3 (as most similiar sites list at most 3)
    const nameAmountLimit = 3;

    const actorElements = getElementByDataQa('cast-item-name', $);
    const actorNames = scrapeNames(actorElements, nameAmountLimit, $);

    const creatorsElements = getElementByDataQa('creator', $);
    const creatorNames = scrapeNames(creatorsElements, nameAmountLimit, $);

    const producersElements = getElementByDataQa('series-details-producer', $);
    const producerNames = scrapeNames(producersElements, nameAmountLimit, $);

    const show: Record<string, string | null> = {
        title: showTitle,
        synopsis: showSynopsis,
        cast: actorNames.join(', '),
        creators: creatorNames.join(', '),
        producers: producerNames.join(', '),
        network,
        premiere: premiereDate,
        genre,
        seasons: numberOfSeasons.toString(),
    };

    show['tomatometer'] = getTextByDataQa('tomatometer', $).slice(0, -1);
    show['audience score'] = getTextByDataQa('audience-score', $).slice(0, -1);
    show['url'] = request.loadedUrl ?? null;

    if (resultsCounter.reachedMax()) {
        await abortRun(crawler, log);
    } else {
        resultsCounter.increment();
        await Dataset.pushData(show);
        log.info(`Scraped TV show: ${showTitle}`, { url: request.loadedUrl });
    }
});
