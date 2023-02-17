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

    if (url.hostname !== 'www.rottentomatoes.com') {
        log.warning('Url does not seem to be from Rotten Tomatoes, skipping.', { url: request.url });
        continue;
    }

    validRequests.push(createRequestFromUrl(url.href));
}

await crawler.addRequests(validRequests);

await crawler.run();

await Actor.exit();
