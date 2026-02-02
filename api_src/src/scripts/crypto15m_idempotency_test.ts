import assert from 'node:assert/strict';
import { GroupArbitrageScanner } from '../services/group-arbitrage.js';

async function main() {
    const s: any = Object.create(GroupArbitrageScanner.prototype);
    s.hasValidKey = true;
    s.crypto15mTrackedByCondition = new Map();
    s.crypto15mActivesBySymbol = new Map();
    s.crypto15mCooldownUntilBySymbol = new Map();
    s.crypto15mOrderLocks = new Map();
    s.orderHistory = [];
    s.crypto15mAutoConfig = { amountUsd: 10, minProb: 0.9 };
    s.crypto15mDeltaThresholds = { btcMinDelta: 0, ethMinDelta: 0, solMinDelta: 0 };
    s.schedulePersistOrderHistory = () => null;
    s.fetchCrypto15mBeatAndCurrentFromSite = async () => ({ priceToBeat: null, currentPrice: null, deltaAbs: null, error: null });

    s.sdk = {
        clobApi: {
            getMarket: async (_conditionId: string) => ({
                marketSlug: 'btc-updown-15m-1760000000',
                question: 'Bitcoin Up or Down 15m',
                tokens: [{ outcome: 'Up', tokenId: 'yes' }, { outcome: 'Down', tokenId: 'no' }],
                endDateIso: new Date(Date.now() + 15 * 60_000).toISOString(),
            }),
        },
    };

    s.fetchClobBooks = async (_tokenIds: string[]) => [{ asset_id: 'yes', asks: [{ price: 0.97 }], bids: [{ price: 0.96 }] }];

    let orderCalls = 0;
    s.tradingClient = {
        createMarketOrder: async (_args: any) => {
            orderCalls += 1;
            await new Promise((r) => setTimeout(r, 50));
            return { success: true, orderId: `o_${orderCalls}` };
        },
    };

    const conditionId = '0xabc';
    const [a, b] = await Promise.all([
        s.placeCrypto15mOrder({ conditionId, outcomeIndex: 0, amountUsd: 1, source: 'auto' }),
        s.placeCrypto15mOrder({ conditionId, outcomeIndex: 0, amountUsd: 1, source: 'auto' }),
    ]);

    const successes = [a, b].filter((x: any) => x?.success === true).length;
    assert.equal(successes, 1);
    assert.equal(orderCalls, 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

