import { ProxyConfigurationOptions, RequestOptions } from 'crawlee';

export interface Input {
    startUrls: RequestOptions[];
    proxyConfig?: ProxyConfigurationOptions & { useApifyProxy?: boolean };
    maxResults?: number;
}

interface BrowseItem {
    mediaUrl: string;
}

interface PageInfo {
    startCursor: string;
    endCursor: string;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface BrowseApiResponse {
    title: string;
    grid: { id: string; list: BrowseItem[] };
    pageInfo: PageInfo;
}
