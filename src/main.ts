import { Actor, log, ProxyConfigurationOptions } from 'apify';
import { PlaywrightCrawler, RequestOptions } from 'crawlee';
import { DEFAULT_MAX_RESULTS, LABELS } from './constants.js';
import { ResultCounter } from './counter.js';
import { router } from './routes.js';
import { getItemBaseLink } from './utils.js';

interface Input {
    startUrls: RequestOptions[];
    proxyConfig?: ProxyConfigurationOptions & { useApifyProxy?: boolean };
    maxResults?: number;
}

await Actor.init();

const input = (await Actor.getInput()) as Input;

const { startUrls, maxResults, proxyConfig } = input;

export const resultsCounter = new ResultCounter(maxResults ?? DEFAULT_MAX_RESULTS);

if (!startUrls) {
    throw new Error('Start urls are not provided.');
}

if (!Array.isArray(startUrls)) {
    throw new Error('Start urls must be an array.');
}

//const proxyConfiguration = await Actor.createProxyConfiguration(proxyConfig);

const crawler = new PlaywrightCrawler({
    //proxyConfiguration,
    requestHandler: router,
});

for (const url of startUrls) {
    if (!url.url) {
        log.warning('Url does not have an URL parameter, skipping.', { url: url });
        continue;
    }

    if (!url.url.startsWith('https://www.rottentomatoes.com')) {
        log.warning('Url does not seem to be from Rotten Tomatoes, skipping.', { url: url.url });
        continue;
    }

    const urlSplitted = url.url.split('/');

    if (urlSplitted[3] === 'm') {
        url.url = getItemBaseLink(url.url);
        url.label = LABELS.MOVIE;
    }

    if (urlSplitted[3] === 'tv') {
        url.url = getItemBaseLink(url.url);
        url.label = LABELS.TV;
    }

    if (urlSplitted[3] === 'browse') {
        url.label = LABELS.BROWSE;
    }

    await crawler.addRequests([url]);
}

await crawler.run();

await Actor.exit();
