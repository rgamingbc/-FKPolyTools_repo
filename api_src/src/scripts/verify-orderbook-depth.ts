import { computeAskDepthUsd } from '../utils/orderbook-depth.js';

const mkAsk = (price: number, size: number) => ({ price, size });

const asks: any[] = [];
for (let i = 0; i < 10; i += 1) asks.push(mkAsk(0.999, 2));
for (let i = 0; i < 50; i += 1) asks.push(mkAsk(0.999, 1));

const depth = computeAskDepthUsd({ asks, limitPrice: 0.999, targetUsd: 50, maxLevels: 200 });

if (!(depth.depthUsd >= 50)) {
  throw new Error(`expected depthUsd >= 50, got ${depth.depthUsd}`);
}
if (!(depth.levelsUsed > 10)) {
  throw new Error(`expected levelsUsed > 10, got ${depth.levelsUsed}`);
}

console.log(JSON.stringify({ ok: true, depth }, null, 2));
