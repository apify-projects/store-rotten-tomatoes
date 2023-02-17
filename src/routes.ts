import axios from 'axios';
import { createPlaywrightRouter, Dataset, RequestOptions } from 'crawlee';
import { LABELS, WEBSITE_URL } from './constants.js';
import { resultsCounter } from './main.js';
import { abortRun, createRequestFromUrl, getElementByDataQa, scrapeNames } from './utils.js';

export const router = createPlaywrightRouter();

interface BrowseItem {
    mediaUrl: string;
}

interface BrowseApiResponse {
    title: string;
    grids: { id: string; list: BrowseItem[] }[];
    pageInfo: {
        startCursor: string;
        endCursor: string;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

// scraping pages other than movie/tv show details and browse pages
router.addHandler(LABELS.OTHER, async ({ request, crawler, log, parseWithCheerio }) => {
    log.info('Getting all available links for movies/TV shows', { url: request.loadedUrl });

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

    await crawler.addRequests(requests);
});

// filtered browse pages (/browse/...)
router.addHandler(LABELS.BROWSE, async ({ crawler, log, request }) => {
    log.info('Getting browsed movies/TV shows', { url: request.loadedUrl });

    const browseUrl = new URL(request.loadedUrl!);
    const apiBaseUrl = `${browseUrl.origin}/napi/${browseUrl.pathname}`;

    const requests: RequestOptions[] = [];

    let apiUrlToCall = apiBaseUrl;
    while (true) {
        const response = await axios.get<BrowseApiResponse>(apiUrlToCall);

        // there is always just one item in the grids array
        const returnedItems = response.data.grids[0].list;
        const absoluteLinks = returnedItems.map((item) => `${WEBSITE_URL}${item.mediaUrl}`);

        // record the amount of planned links from this page crawl,
        // so other '/browse/' crawls can adjust when to stop/continue
        requests.push(...absoluteLinks.map((link) => createRequestFromUrl(link)));
        resultsCounter.addPlannedItems(absoluteLinks.length);
        if (!resultsCounter.plannedIsUnderLimit()) {
            break;
        }

        if (!response.data.pageInfo.hasNextPage) {
            break;
        }

        apiUrlToCall = `${apiBaseUrl}?after=${response.data.pageInfo.endCursor}`;
    }

    await crawler.addRequests(requests);
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

    const movie: Record<string, string | null> = {
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
    movie['tomatometer'] = $(scorePanelElement).attr('tomatometerscore') ?? null;
    movie['audience score'] = $(scorePanelElement).attr('audiencescore') ?? null;
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

    const getTextByDataQa = (selector: string) => {
        return getElementByDataQa(selector, $).text().trim();
    };

    const showTitle = getTextByDataQa('score-panel-series-title');
    log.info(`Scraping TV show: ${showTitle}`, { url: request.loadedUrl });

    const network = getTextByDataQa('series-details-network');
    const premiereDate = getTextByDataQa('series-details-premiere-date');
    const genre = getTextByDataQa('series-details-genre');
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
