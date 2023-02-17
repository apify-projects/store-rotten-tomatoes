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

const proxyConfiguration = await Actor.createProxyConfiguration(proxyConfig);

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: router,
});

const validRequests = [];
for (const request of startUrls) {
    if (!request.url) {
        log.warning('Url does not have an URL parameter, skipping.', { url: request });
        continue;
    }

    const url = new URL(request.url);

    if (url.hostname !== 'https://www.rottentomatoes.com') {
        log.warning('Url does not seem to be from Rotten Tomatoes, skipping.', { url: request.url });
        continue;
    }

    if (url.pathname.startsWith('/m/')) {
        request.url = getItemBaseLink(request.url);
        request.label = LABELS.MOVIE;
    }

    if (url.pathname.startsWith('/tv/')) {
        request.url = getItemBaseLink(request.url);
        request.label = LABELS.TV;
    }

    if (url.pathname.startsWith('/browse/')) {
        request.label = LABELS.BROWSE;
    }

    validRequests.push(request);
}

await crawler.addRequests(validRequests);

await crawler.run();

await Actor.exit();
