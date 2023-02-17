import { Actor, log } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { DEFAULT_MAX_RESULTS } from './constants.js';
import { ResultCounter } from './counter.js';
import { Input } from './interfaces.js';
import { router } from './routes.js';
import { createRequestFromUrl } from './utils.js';

await Actor.init();

const input = (await Actor.getInput()) as Input;

const { startUrls, maxResults, proxyConfig } = input;

if (!startUrls) {
    throw new Error('Start urls are not provided.');
}

if (!Array.isArray(startUrls)) {
    throw new Error('Start urls must be an array.');
}

const validRequests = [];
for (const request of startUrls) {
    if (!request.url) {
        log.warning('URL parameter is missing, skipping.', { url: request });
        continue;
    }

    const url = new URL(request.url);

    if (url.hostname !== 'www.rottentomatoes.com') {
        log.warning('Url does not seem to be from Rotten Tomatoes, skipping.', { url: request.url });
        continue;
    }

    validRequests.push(createRequestFromUrl(url.href));
}

export const resultsCounter = new ResultCounter(maxResults ?? DEFAULT_MAX_RESULTS);

const proxyConfiguration = await Actor.createProxyConfiguration(proxyConfig);

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: router,
});

await crawler.run(validRequests);

await Actor.exit();
