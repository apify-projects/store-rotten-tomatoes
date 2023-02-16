import { Log, PlaywrightCrawler } from 'crawlee';
import { WEBSITE_URL } from './constants.js';

export const getItemBaseLink = (link: string) => {
    const splitted = link.split('/');
    return `${WEBSITE_URL}/${splitted[3]}/${splitted[4]}`;
};

export const abortRun = async (crawler: PlaywrightCrawler, log: Log) => {
    log.info('Reached maximum number of results, stopping run.');
    await crawler.autoscaledPool?.abort();
};
