import { CheerioAPI } from 'cheerio';
import { Log, PlaywrightCrawler } from 'crawlee';
import { LABELS, WEBSITE_URL } from './constants.js';

export const getItemBaseLink = (link: string) => {
    const splitted = link.split('/');
    return `${WEBSITE_URL}/${splitted[3]}/${splitted[4]}`;
};

export const abortRun = async (crawler: PlaywrightCrawler, log: Log) => {
    log.info('Reached maximum number of results, stopping run.');
    await crawler.autoscaledPool!.abort();
};

export const getLabelFromHref = (href: string) => {
    return href.startsWith('/m/') ? LABELS.MOVIE : LABELS.TV;
};

export const getElementByDataQa = (selector: string, $: CheerioAPI) => {
    return $(`[data-qa="${selector}"]`);
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
