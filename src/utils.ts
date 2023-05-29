import { CheerioAPI } from 'cheerio';
import { Log, PlaywrightCrawler, RequestOptions } from 'crawlee';
import { LABELS, WEBSITE_URL } from './constants.js';

export const abortRun = async (crawler: PlaywrightCrawler, log: Log) => {
    log.info('Reached maximum number of results, stopping run.');
    await crawler.autoscaledPool!.abort();
};

const getLabelFromEndpoint = (endpoint: string) => {
    switch (endpoint) {
        case 'm':
            return LABELS.MOVIE;
        case 'tv':
            return LABELS.TV;
        case 'browse':
            return LABELS.BROWSE;
        default:
            return LABELS.OTHER;
    }
};

export const createRequestFromUrl: (absoluteUrl: string) => RequestOptions = (absoluteUrl) => {
    const urlObj = new URL(absoluteUrl);

    const pathNameSplitted = urlObj.pathname.split('/');

    const label = getLabelFromEndpoint(pathNameSplitted[1]);

    let url = urlObj.href;
    // get base url of the movie/TV show so we can scrape its detail page
    if (label === LABELS.MOVIE || label === LABELS.TV) {
        url = `${WEBSITE_URL}/${pathNameSplitted[1]}/${pathNameSplitted[2]}`;
    }

    const request = { url, label };

    if (label === LABELS.BROWSE) {
        return {
            ...request,
            skipNavigation: true,
        }
    }

    return request;
};

export const getElementByDataQa = (selector: string, $: CheerioAPI) => {
    return $(`[data-qa="${selector}"]`);
};

export const getTextByDataQa = (selector: string, $: CheerioAPI) => {
    return getElementByDataQa(selector, $).text().trim();
};

export const scrapeNames = (elements: any, limit: number, $: CheerioAPI) => {
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
