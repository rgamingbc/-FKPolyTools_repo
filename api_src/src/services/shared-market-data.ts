export type SharedMarketData = {
    crypto15mMarketSnapshot: { atMs: number; markets: any[]; lastError: string | null };
    crypto15mBooksSnapshot: { atMs: number; byTokenId: Record<string, any>; lastError: string | null; lastAttemptAtMs: number; lastAttemptError: string | null };
    crypto15mMarketInFlight: Promise<void> | null;
    crypto15mBooksInFlight: Promise<void> | null;
    crypto15mMarketBackoffMs: number;
    crypto15mMarketNextAllowedAtMs: number;
    crypto15mBooksBackoffMs: number;
    crypto15mBooksNextAllowedAtMs: number;

    cryptoAllMarketSnapshot: { atMs: number; markets: any[]; lastError: string | null; lastAttemptAtMs: number; lastAttemptError: string | null; key?: string };
    cryptoAllBooksSnapshot: { atMs: number; byTokenId: Record<string, any>; lastError: string | null; lastAttemptAtMs: number; lastAttemptError: string | null; key?: string };
    cryptoAllMarketInFlight: Promise<void> | null;
    cryptoAllBooksInFlight: Promise<void> | null;
    cryptoAllMarketBackoffMs: number;
    cryptoAllMarketNextAllowedAtMs: number;
    cryptoAllBooksBackoffMs: number;
    cryptoAllBooksNextAllowedAtMs: number;

    cryptoAllByTfMarketSnapshot: Record<'5m' | '15m' | '1h' | '4h' | '1d', { atMs: number; markets: any[]; lastError: string | null; lastAttemptAtMs: number; lastAttemptError: string | null; key?: string }>;
    cryptoAllByTfBooksSnapshot: Record<'5m' | '15m' | '1h' | '4h' | '1d', { atMs: number; byTokenId: Record<string, any>; lastError: string | null; lastAttemptAtMs: number; lastAttemptError: string | null; key?: string }>;
    cryptoAllByTfMarketInFlight: Record<'5m' | '15m' | '1h' | '4h' | '1d', Promise<void> | null>;
    cryptoAllByTfBooksInFlight: Record<'5m' | '15m' | '1h' | '4h' | '1d', Promise<void> | null>;
    cryptoAllByTfMarketBackoffMs: Record<'5m' | '15m' | '1h' | '4h' | '1d', number>;
    cryptoAllByTfMarketNextAllowedAtMs: Record<'5m' | '15m' | '1h' | '4h' | '1d', number>;
    cryptoAllByTfBooksBackoffMs: Record<'5m' | '15m' | '1h' | '4h' | '1d', number>;
    cryptoAllByTfBooksNextAllowedAtMs: Record<'5m' | '15m' | '1h' | '4h' | '1d', number>;

    cryptoAllPinned5mBySymbol: Record<string, any>;
    cryptoAllPinned5mDiag: any;
};

const key = '__polymarket_shared_market_data_v1__';

export const getSharedMarketData = (): SharedMarketData => {
    const g = globalThis as any;
    if (g[key]) return g[key] as SharedMarketData;
    const init: SharedMarketData = {
        crypto15mMarketSnapshot: { atMs: 0, markets: [], lastError: null },
        crypto15mBooksSnapshot: { atMs: 0, byTokenId: {}, lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
        crypto15mMarketInFlight: null,
        crypto15mBooksInFlight: null,
        crypto15mMarketBackoffMs: 0,
        crypto15mMarketNextAllowedAtMs: 0,
        crypto15mBooksBackoffMs: 0,
        crypto15mBooksNextAllowedAtMs: 0,

        cryptoAllMarketSnapshot: { atMs: 0, markets: [], lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
        cryptoAllBooksSnapshot: { atMs: 0, byTokenId: {}, lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
        cryptoAllMarketInFlight: null,
        cryptoAllBooksInFlight: null,
        cryptoAllMarketBackoffMs: 0,
        cryptoAllMarketNextAllowedAtMs: 0,
        cryptoAllBooksBackoffMs: 0,
        cryptoAllBooksNextAllowedAtMs: 0,

        cryptoAllByTfMarketSnapshot: {
            '5m': { atMs: 0, markets: [], lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
            '15m': { atMs: 0, markets: [], lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
            '1h': { atMs: 0, markets: [], lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
            '4h': { atMs: 0, markets: [], lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
            '1d': { atMs: 0, markets: [], lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
        },
        cryptoAllByTfBooksSnapshot: {
            '5m': { atMs: 0, byTokenId: {}, lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
            '15m': { atMs: 0, byTokenId: {}, lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
            '1h': { atMs: 0, byTokenId: {}, lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
            '4h': { atMs: 0, byTokenId: {}, lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
            '1d': { atMs: 0, byTokenId: {}, lastError: null, lastAttemptAtMs: 0, lastAttemptError: null },
        },
        cryptoAllByTfMarketInFlight: { '5m': null, '15m': null, '1h': null, '4h': null, '1d': null },
        cryptoAllByTfBooksInFlight: { '5m': null, '15m': null, '1h': null, '4h': null, '1d': null },
        cryptoAllByTfMarketBackoffMs: { '5m': 0, '15m': 0, '1h': 0, '4h': 0, '1d': 0 },
        cryptoAllByTfMarketNextAllowedAtMs: { '5m': 0, '15m': 0, '1h': 0, '4h': 0, '1d': 0 },
        cryptoAllByTfBooksBackoffMs: { '5m': 0, '15m': 0, '1h': 0, '4h': 0, '1d': 0 },
        cryptoAllByTfBooksNextAllowedAtMs: { '5m': 0, '15m': 0, '1h': 0, '4h': 0, '1d': 0 },

        cryptoAllPinned5mBySymbol: {},
        cryptoAllPinned5mDiag: null,
    };
    g[key] = init;
    return init;
};
