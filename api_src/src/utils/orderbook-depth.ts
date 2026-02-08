export function computeAskDepthUsd(params: {
  asks: any[];
  limitPrice: number;
  targetUsd?: number;
  maxLevels?: number;
}): { depthUsd: number; levelsUsed: number } {
  const asks = Array.isArray(params.asks) ? params.asks : [];
  const limitPrice = Number(params.limitPrice);
  const maxLevels = Math.max(1, Math.floor(Number(params.maxLevels ?? 200)));
  const targetUsd = params.targetUsd != null ? Number(params.targetUsd) : NaN;

  const normalized = asks
    .map((a: any) => {
      const price = Number(a?.price);
      const size = Number(a?.size ?? a?.amount ?? a?.quantity);
      if (!Number.isFinite(price) || price <= 0) return null;
      if (!Number.isFinite(size) || size <= 0) return null;
      if (Number.isFinite(limitPrice) && price > limitPrice) return null;
      return { price, size };
    })
    .filter(Boolean) as Array<{ price: number; size: number }>;

  normalized.sort((a, b) => a.price - b.price);

  let depthUsd = 0;
  let levelsUsed = 0;
  const stopAt = Number.isFinite(targetUsd) && targetUsd > 0 ? targetUsd * 1.02 : Infinity;

  for (const lvl of normalized) {
    if (levelsUsed >= maxLevels) break;
    depthUsd += lvl.size * lvl.price;
    levelsUsed += 1;
    if (depthUsd >= stopAt) break;
  }

  return { depthUsd, levelsUsed };
}
